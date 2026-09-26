-- SECURITY DRAFT ONLY — NOT APPROVED / NOT APPLIED
-- Product & Classification RLS, grants and RBAC candidate.
--
-- This package is intentionally separated from the physical schema.

BEGIN;

-- Permission creation candidate.
-- Final implementation must use the established permissions columns and
-- existing role_permissions conventions verified against production.

-- Proposed permission:
--   SHIPMENT_CLASSIFICATION_VERIFY
--
-- Proposed role mapping:
--   SYSTEM_ADMIN
--   LOGISTICS_ADMIN
--   DOCUMENTATION_OFFICER
--
-- No MASTER_DATA_CREATE / MASTER_DATA_EDIT mappings are proposed.

-- Proposed RLS boundaries:
--   product, classification_system, classification_jurisdiction,
--   classification_edition, classification_record, product_classification
--       SELECT -> MASTER_DATA_VIEW
--
--   shipment_cargo_classification
--       SELECT -> CARGO_VIEW
--       INSERT -> CARGO_EDIT
--       UPDATE -> CARGO_EDIT for non-verification operational changes
--       verification transition -> SHIPMENT_CLASSIFICATION_VERIFY
--
-- IMPORTANT:
-- Direct UPDATE authorization for verified status must not permit a user with
-- CARGO_EDIT alone to establish a VERIFIED classification. Final policy shape
-- therefore requires a dedicated transition path or a policy that explicitly
-- separates verification authority. No SECURITY DEFINER transition function is
-- being introduced automatically.

-- Proposed authenticated table privileges:
--   SELECT on reference tables and shipment classification as required.
--   No anonymous privileges.
--   No broad INSERT/UPDATE/DELETE grants beyond the approved workflow.

-- No executable statements in this draft.

ROLLBACK;
