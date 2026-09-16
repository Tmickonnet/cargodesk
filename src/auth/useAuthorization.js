import { useCallback, useEffect, useState } from "react";
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
 * functions through the adapter. While disabled, loading, or if a lookup
 * fails, the hook fails closed and exposes no permissions.
 */
export function useAuthorization(enabled = true) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));

  useEffect(() => {
    let isMounted = true;

    if (!enabled) {
      setRole(null);
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadAuthorization = async () => {
      setLoading(true);
      setRole(null);

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
  }, [enabled]);

  const permissionCheck = useCallback(
    async (permission) => {
      if (loading || !role) {
        return false;
      }

      return hasPermission(permission);
    },
    [loading, role]
  );

  const anyPermissionCheck = useCallback(
    async (permissions) => {
      if (loading || !role) {
        return false;
      }

      return hasAnyPermission(permissions);
    },
    [loading, role]
  );

  const allPermissionCheck = useCallback(
    async (permissions) => {
      if (loading || !role) {
        return false;
      }

      return hasAllPermissions(permissions);
    },
    [loading, role]
  );

  return {
    role,
    loading,
    hasPermission: permissionCheck,
    hasAnyPermission: anyPermissionCheck,
    hasAllPermissions: allPermissionCheck,
  };
}
