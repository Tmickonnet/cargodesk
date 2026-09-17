# SEC-149C — Readiness Static Integrity & Security Audit

**Status:** STATIC AUDIT COMPLETE — CORRECTIONS IDENTIFIED  
**Production deployment:** NOT AUTHORIZED  
**Production database:** NOT MODIFIED

## Scope reviewed

- SEC-147 candidate migration
- Seven readiness pgTAP test files
- Existing CargoDesk security/RBAC model
- Evidence-source architecture
- Lifecycle and human-authorization design

## Findings

| Area | Status | Finding |
|---|---|---|
| Production safety | PASS | Candidate migration has a 90-table fail-fast preflight and no destructive operation against existing tables. |
| Existing-table preservation | PASS | Candidate creates only four new readiness tables and does not alter the existing 90-table foundation. |
| Shipment-document evidence | PASS | Uses shipment_documents.shipment_document_id, preserving shipment association. |
| Polymorphic evidence | PASS | Explicit nullable source FKs plus exactly-one-source constraint are used. |
| Evidence shipment scope | PASS WITH TEST CORRECTION | shipment_id is NOT NULL. The original constraints test incorrectly expected a CHECK constraint on that column; corrected to test NOT NULL. |
| RLS enablement | PASS | All four readiness tables enable RLS in the candidate migration. |
| Anonymous access | PASS AT BASE-MIGRATION STAGE | No readiness policies are created by the base migration, so no anonymous access is introduced. Final approved policies remain pending. |
| DELETE pathway | PASS AT BASE-MIGRATION STAGE | No DELETE policies are created. |
| Readiness SECURITY DEFINER | PASS | Base migration introduces no readiness SECURITY DEFINER function. |
| Cross-shipment validation | CORRECTION REQUIRED | The candidate migration currently does not implement the planned SECURITY INVOKER cross-shipment validator. It remains a documented future controlled-environment requirement. |
| Lifecycle immutability | CORRECTION REQUIRED | The candidate migration currently defines lifecycle values but does not yet implement protection against unauthorized mutation of finalized/decided evaluations. |
| Human authorization SoD | CORRECTION REQUIRED | The base schema has evaluated_by and decided_by, but does not yet enforce evaluated_by <> decided_by where independent authorization is required. |
| Readiness permissions | DEFERRED | Proposed readiness permissions have not been inserted into production, correctly. |
| Audit vocabulary | DEFERRED | Existing audit_log remains authoritative; no readiness audit table was introduced. Action vocabulary remains subject to approval. |
| Trigger test | REVIEW REQUIRED | The current security test checks for at most one user-defined trigger across the entire logistics schema rather than specifically validating the intended readiness trigger. It should be narrowed before execution. |
| Validator eligibility test | WEAK | The >= 0 assertion is logically non-discriminating and does not prove anything. It should be replaced by a precise validator-signature test after the validator is finalized. |
| Reproducibility | BLOCKED | The 90-table local baseline is not yet reproducible in the current environment. |

## Overall conclusion

The SEC-147 candidate is architecturally coherent as a base-table migration, but it is not yet the complete readiness implementation described by the frozen security/lifecycle design.

The three substantive implementation controls still requiring controlled-environment completion are:

1. cross-shipment evidence validation;
2. finalized/decided lifecycle protection;
3. separation-of-duties enforcement for human authorization.

These should not be improvised on production.

## Immediate correction completed

The false test expectation in readiness_constraints_test.sql was corrected:

- Before: expected a CHECK constraint on readiness_evidence_reference.shipment_id.
- Correct requirement: verify shipment_id is NOT NULL.

Commit: 28855cc9e84fc8630eceb9c4fb7f24f847a17aee

## Gate

SEC-149C static review is complete, with controlled corrections identified.

The project should not proceed to production implementation.

The next useful work can continue without Windows by tightening the three identified implementation controls and the two weak security tests. Actual execution remains gated by the reproducible 90-table local baseline.
