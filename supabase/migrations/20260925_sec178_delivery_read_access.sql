-- SEC-178: Restore the minimum Data API read contract for Delivery workspace
-- PREPARED FOR CONTROLLED DEPLOYMENT.
-- Scope: SELECT only on the two existing Delivery read surfaces required by SEC-175.
-- Existing RLS policies remain the authorization boundary:
--   delivery_statuses -> authenticated SELECT policy (USING true)
--   proof_of_delivery -> authenticated SELECT policy (DELIVERY_VIEW)
-- No INSERT, UPDATE, DELETE, schema, policy, function, trigger, index, role,
-- permission, storage, lifecycle, or data changes.

BEGIN;

GRANT SELECT ON TABLE logistics.delivery_statuses TO authenticated;
GRANT SELECT ON TABLE logistics.proof_of_delivery TO authenticated;

COMMIT;
