import { useEffect, useState } from "react";
import {
  getCurrentRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "../lib/authorization";

/**
 * React-facing authorization state.
 *
 * Authorization remains delegated to the existing Supabase security
 * functions through the adapter. While loading, or if a lookup fails, the
 * hook fails closed and exposes no permissions.
 */
export function useAuthorization() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadAuthorization = async () => {
      setLoading(true);
      const currentRole = await getCurrentRole();

      if (!isMounted) {
        return;
      }

      setRole(currentRole);
      setLoading(false);
    };

    loadAuthorization();

    return () => {
      isMounted = false;
    };
  }, []);

  const permissionCheck = async (permission) => {
    if (loading || !role) {
      return false;
    }

    return hasPermission(permission);
  };

  const anyPermissionCheck = async (permissions) => {
    if (loading || !role) {
      return false;
    }

    return hasAnyPermission(permissions);
  };

  const allPermissionCheck = async (permissions) => {
    if (loading || !role) {
      return false;
    }

    return hasAllPermissions(permissions);
  };

  return {
    role,
    loading,
    hasPermission: permissionCheck,
    hasAnyPermission: anyPermissionCheck,
    hasAllPermissions: allPermissionCheck,
  };
}
