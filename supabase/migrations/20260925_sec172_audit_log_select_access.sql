-- SEC-172: Controlled Audit Log read access
-- PREPARED FOR REVIEW ONLY. DO NOT APPLY TO PRODUCTION FROM THIS BRANCH.
-- Scope: grant SELECT only; preserve existing AUDIT_VIEW RLS authorization.
-- No INSERT, UPDATE, DELETE, schema, policy, function, trigger, index, or data changes.
BEGIN;

GRANT SELECT ON TABLE logistics.audit_log TO authenticated;

COMMIT;
