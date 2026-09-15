import { supabase } from "../lib/supabase";

export const MFA_REQUIRED_ROLES = new Set([
  "SYSTEM_ADMIN",
  "LOGISTICS_ADMIN",
]);

export async function getMFAState() {
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (error) {
    throw error;
  }

  const { currentLevel, nextLevel } = data ?? {};

  return {
    currentLevel: currentLevel ?? null,
    nextLevel: nextLevel ?? null,
    aal2Required: nextLevel === "aal2",
    aal2Verified: currentLevel === "aal2",
  };
}

export async function listTOTPFactors() {
  const { data, error } =
    await supabase.auth.mfa.listFactors();

  if (error) {
    throw error;
  }

  return (data?.factors ?? []).filter(
    (factor) => factor.factor_type === "totp"
  );
}

export async function getVerifiedTOTPFactor() {
  const factors = await listTOTPFactors();

  return (
    factors.find(
      (factor) => factor.status === "verified"
    ) ?? null
  );
}

export async function enrollTOTP({
  friendlyName = "CargoDesk Authenticator",
} = {}) {
  const { data, error } =
    await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName,
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function challengeTOTP(factorId) {
  if (!factorId) {
    throw new Error("A verified MFA factor is required.");
  }

  const { data, error } =
    await supabase.auth.mfa.challenge({
      factorId,
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function verifyTOTP(
  factorId,
  challengeId,
  code
) {
  const cleanCode = String(code ?? "").replace(/\s+/g, "");

  if (!factorId) {
    throw new Error("An MFA factor is required.");
  }

  if (!challengeId) {
    throw new Error("An MFA challenge is required.");
  }

  if (!/^\d{6}$/.test(cleanCode)) {
    throw new Error(
      "Please enter the 6-digit authenticator code."
    );
  }

  const { data, error } =
    await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: cleanCode,
    });

  if (error) {
    throw error;
  }

  return data;
}

export function isMFARequiredForRole(roleCode) {
  return MFA_REQUIRED_ROLES.has(roleCode);
}
