BEGIN;

-- Restore the authenticated Data API read contract required by
-- the controlled Delivery creation form.
-- RLS remains the authorization boundary through MASTER_DATA_VIEW.
-- No INSERT, UPDATE, DELETE, schema, policy, function, role,
-- permission, storage, lifecycle, or data changes.

GRANT SELECT ON TABLE logistics.transporters TO authenticated;

COMMIT;
