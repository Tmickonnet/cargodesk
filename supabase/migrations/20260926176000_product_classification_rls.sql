-- Product & Classification RLS/read access
-- IMPLEMENTATION CANDIDATE — not yet applied to production.
BEGIN;

ALTER TABLE logistics.product ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics.classification_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics.classification_jurisdiction ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics.classification_edition ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics.classification_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics.product_classification ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics.shipment_cargo_classification ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_select_policy
ON logistics.product
FOR SELECT TO authenticated
USING (logistics.has_permission('MASTER_DATA_VIEW'));

CREATE POLICY classification_system_select_policy
ON logistics.classification_system
FOR SELECT TO authenticated
USING (logistics.has_permission('MASTER_DATA_VIEW'));

CREATE POLICY classification_jurisdiction_select_policy
ON logistics.classification_jurisdiction
FOR SELECT TO authenticated
USING (logistics.has_permission('MASTER_DATA_VIEW'));

CREATE POLICY classification_edition_select_policy
ON logistics.classification_edition
FOR SELECT TO authenticated
USING (logistics.has_permission('MASTER_DATA_VIEW'));

CREATE POLICY classification_record_select_policy
ON logistics.classification_record
FOR SELECT TO authenticated
USING (logistics.has_permission('MASTER_DATA_VIEW'));

CREATE POLICY product_classification_select_policy
ON logistics.product_classification
FOR SELECT TO authenticated
USING (logistics.has_permission('MASTER_DATA_VIEW'));

CREATE POLICY shipment_cargo_classification_select_policy
ON logistics.shipment_cargo_classification
FOR SELECT TO authenticated
USING (logistics.has_permission('CARGO_VIEW'));

GRANT SELECT ON TABLE
    logistics.product,
    logistics.classification_system,
    logistics.classification_jurisdiction,
    logistics.classification_edition,
    logistics.classification_record,
    logistics.product_classification,
    logistics.shipment_cargo_classification
TO authenticated;

-- No anonymous access and no direct authenticated INSERT/UPDATE/DELETE grants.
-- Verification is performed through the controlled RPC.

COMMIT;
