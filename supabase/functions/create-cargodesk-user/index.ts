import { withSupabase } from "npm:@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BODY_BYTES = 10_000;
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

const requestCounts = new Map<
  string,
  { count: number; windowStart: number }
>();

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

function isValidEmail(email: unknown): email is string {
  return (
    typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const current = requestCounts.get(userId);

  if (!current || now - current.windowStart >= RATE_WINDOW_MS) {
    requestCounts.set(userId, {
      count: 1,
      windowStart: now,
    });
    return false;
  }

  current.count += 1;
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

export default withSupabase({ auth: "user" }, async (req, ctx) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const caller = ctx.userClaims;

  if (!caller?.sub) {
    return json(401, { error: "Authentication required" });
  }

  if (isRateLimited(caller.sub)) {
    return json(429, {
      error: "Too many provisioning requests. Try again later.",
    });
  }

  const contentLength = Number(
    req.headers.get("content-length") ?? 0
  );

  if (contentLength > MAX_BODY_BYTES) {
    return json(413, {
      error: "Request body is too large",
    });
  }

  const {
    data: hasUserManage,
    error: permissionError,
  } = await ctx.supabase
    .schema("logistics")
    .rpc("has_permission", {
      requested_permission: "USER_MANAGE",
    });

  if (permissionError || hasUserManage !== true) {
    return json(403, {
      error: "USER_MANAGE permission required",
    });
  }

  let input: Record<string, unknown>;

  try {
    input = await req.json();
  } catch {
    return json(400, {
      error: "Invalid JSON body",
    });
  }

  const email =
    typeof input.email === "string"
      ? input.email.trim().toLowerCase()
      : "";

  const username =
    typeof input.username === "string"
      ? input.username.trim()
      : "";

  const firstName =
    typeof input.first_name === "string"
      ? input.first_name.trim()
      : "";

  const lastName =
    typeof input.last_name === "string"
      ? input.last_name.trim()
      : "";

  const phone =
    typeof input.phone === "string"
      ? input.phone.trim()
      : null;

  const roleCode =
    typeof input.role_code === "string"
      ? input.role_code.trim()
      : "";

  const partyCode =
    typeof input.party_code === "string"
      ? input.party_code.trim()
      : "";

  const emailConfirmed = input.email_confirmed === true;

  if (!isValidEmail(email)) {
    return json(400, {
      error: "Valid email is required",
    });
  }

  if (!isNonEmptyString(username)) {
    return json(400, {
      error: "Username is required",
    });
  }

  if (!isNonEmptyString(firstName)) {
    return json(400, {
      error: "First name is required",
    });
  }

  if (!isNonEmptyString(lastName)) {
    return json(400, {
      error: "Last name is required",
    });
  }

  if (!isNonEmptyString(roleCode)) {
    return json(400, {
      error: "Role code is required",
    });
  }

  if (!isNonEmptyString(partyCode)) {
    return json(400, {
      error: "Party code is required",
    });
  }

  const {
    data: role,
    error: roleError,
  } = await ctx.supabaseAdmin
    .schema("logistics")
    .from("roles")
    .select("role_id, role_code, active")
    .eq("role_code", roleCode)
    .maybeSingle();

  if (roleError || !role || role.active !== true) {
    return json(400, {
      error: "Invalid or inactive role",
    });
  }

  const {
    data: party,
    error: partyError,
  } = await ctx.supabaseAdmin
    .schema("logistics")
    .from("parties")
    .select("party_id, party_code, is_active")
    .eq("party_code", partyCode)
    .maybeSingle();

  if (partyError || !party || party.is_active !== true) {
    return json(400, {
      error: "Invalid or inactive party",
    });
  }

  const { data: existingEmail } =
    await ctx.supabaseAdmin
      .schema("logistics")
      .from("users")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();

  if (existingEmail) {
    return json(409, {
      error: "CargoDesk user email already exists",
    });
  }

  const { data: existingUsername } =
    await ctx.supabaseAdmin
      .schema("logistics")
      .from("users")
      .select("user_id")
      .eq("username", username)
      .maybeSingle();

  if (existingUsername) {
    return json(409, {
      error: "CargoDesk username already exists",
    });
  }

  const {
    data: authUser,
    error: authError,
  } =
    await ctx.supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: emailConfirmed,
    });

  if (authError || !authUser.user) {
    return json(400, {
      error:
        authError?.message ??
        "Unable to create authentication user",
    });
  }

  const authUserId = authUser.user.id;

  const {
    data: cargoUser,
    error: cargoError,
  } = await ctx.supabaseAdmin
    .schema("logistics")
    .from("users")
    .insert({
      auth_user_id: authUserId,
      party_id: party.party_id,
      role_id: role.role_id,
      username,
      email,
      first_name: firstName,
      last_name: lastName,
      phone,
      active: true,
    })
    .select(
      "user_id, auth_user_id, party_id, role_id, username, email, first_name, last_name, phone, active"
    )
    .single();

  if (cargoError || !cargoUser) {
    await ctx.supabaseAdmin.auth.admin.deleteUser(
      authUserId
    );

    return json(500, {
      error:
        "User provisioning failed; no CargoDesk account was created",
    });
  }

  return json(201, {
    success: true,
    user: cargoUser,
    email_confirmed: emailConfirmed,
  });
});
