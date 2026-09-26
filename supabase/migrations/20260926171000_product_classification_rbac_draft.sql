-- PROPOSED / DRAFT ONLY
-- Product & Classification RBAC.
-- NOT APPLIED TO PRODUCTION.
--
-- Approved direction:
--   - dedicated SHIPMENT_CLASSIFICATION_VERIFY permission
--   - SYSTEM_ADMIN, LOGISTICS_ADMIN, DOCUMENTATION_OFFICER mappings
--   - no MASTER_DATA_CREATE / MASTER_DATA_EDIT role mappings
--
-- This draft intentionally does not execute changes.

BEGIN;

-- Implementation details must be finalized against the live permission/role
-- key conventions before any executable RBAC migration is approved.
--
-- No statements are executed in this qualification draft.

ROLLBACK;
