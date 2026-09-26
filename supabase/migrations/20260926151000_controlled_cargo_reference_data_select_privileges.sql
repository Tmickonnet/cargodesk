-- Controlled cargo reference-data SELECT privileges
-- Scope:
--   - Allows authenticated users to reach existing cargo reference tables.
--   - Existing RLS policies remain the authorization boundary.
--   - No INSERT, UPDATE, DELETE, role, permission, policy, schema, function,
--     trigger, index, storage, or data changes.

BEGIN;

GRANT SELECT ON TABLE
  logistics.commodities,
  logistics.packaging_types,
  logistics.unit_of_measures
TO authenticated;

COMMIT;
