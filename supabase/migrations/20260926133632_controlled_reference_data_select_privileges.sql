-- Controlled reference-data SELECT privileges
-- Scope: grant authenticated SELECT on reference tables already protected by
-- their existing RLS SELECT policies.
-- No INSERT, UPDATE, DELETE, schema, policy, function, role, storage, or data changes.

BEGIN;

GRANT SELECT ON TABLE
  logistics.countries,
  logistics.customers,
  logistics.incoterms,
  logistics.locations,
  logistics.shipment_types,
  logistics.suppliers,
  logistics.transport_modes
TO authenticated;

COMMIT;
