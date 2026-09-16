import { supabase } from "./supabase";

/**
 * CargoDesk frontend authorization adapter.
 *
 * The frontend does not own authorization rules. It delegates identity and
 * permission decisions to the existing Supabase security functions and fails
 * closed when authorization cannot be resolved.
 */

const RPC_CURRENT_USER_ID = "current_user_id";
const RPC_CURRENT_USER_ROLE = "current_user_role";
const RPC_HAS_PERMISSION = "has_permission";

const normalizePermission = (permission) =>
  typeof permission === "string" ? permission.trim() : "";

export const getCurrentUserId = async () => {
  const { data, error } = await supabase.rpc(RPC_CURRENT_USER_ID);

  if (error) {
    console.error("CargoDesk user identity lookup failed:", error);
    return null;
  }

  return data ?? null;
};

export const getCurrentRole = async () => {
  const { data, error } = await supabase.rpc(RPC_CURRENT_USER_ROLE);

  if (error) {
    console.error("CargoDesk role lookup failed:", error);
    return null;
  }

  return typeof data === "string" ? data : null;
};

export const hasPermission = async (permission) => {
  const normalizedPermission = normalizePermission(permission);

  if (!normalizedPermission) {
    return false;
  }

  const { data, error } = await supabase.rpc(RPC_HAS_PERMISSION, {
    requested_permission: normalizedPermission,
  });

  if (error) {
    console.error(
      `CargoDesk permission check failed for ${normalizedPermission}:`,
      error
    );
    return false;
  }

  return data === true;
};

export const hasAnyPermission = async (permissions = []) => {
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return false;
  }

  const normalizedPermissions = permissions
    .map(normalizePermission)
    .filter(Boolean);

  if (normalizedPermissions.length === 0) {
    return false;
  }

  const results = await Promise.all(
    normalizedPermissions.map((permission) => hasPermission(permission))
  );

  return results.some(Boolean);
};

export const hasAllPermissions = async (permissions = []) => {
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return false;
  }

  const normalizedPermissions = permissions
    .map(normalizePermission)
    .filter(Boolean);

  if (normalizedPermissions.length !== permissions.length) {
    return false;
  }

  const results = await Promise.all(
    normalizedPermissions.map((permission) => hasPermission(permission))
  );

  return results.every(Boolean);
};

export const authorizationAdapter = {
  getCurrentUserId,
  getCurrentRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
};
