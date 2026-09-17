# SEC-149D — CONTROLLED STATIC HARDENING OF READINESS VALIDATION & AUTHORIZATION

**Status:** Completed — candidate-only  
**Branch:** `sec-146-readiness-implementation`  
**Production execution:** NO  
**Remote schema change:** NO  
**Supabase branch created:** NO

## Scope

SEC-149D completes the static design of the three substantive controls identified by SEC-149C:

1. Cross-shipment evidence validation.
2. Finalized/decided lifecycle immutability.
3. Human authorization separation of duties.

It also adds a dedicated control-hardening test suite.

## Control 1 — Cross-shipment evidence validation

Candidate function:

`logistics.validate_readiness_evidence_shipment()`

Candidate trigger:

`trg_validate_readiness_evidence_shipment`

The validator is explicitly SECURITY INVOKER and resolves the shipment through the existing CargoDesk relationships. It checks:

- parent readiness evaluation shipment;
- explicit evidence shipment;
- exactly one evidence source;
- source-to-shipment relationship;
- proof-of-delivery → delivery → shipment relationship;
- cross-shipment mismatch.

No polymorphic lookup or dynamic SQL is introduced.

## Control 2 — Lifecycle immutability

Candidate protection covers:

- `readiness_evaluation`;
- `readiness_rule_result`;
- `readiness_evidence_reference`;
- `readiness_human_decision`.

DECIDED and SUPERSEDED evaluations are protected from mutation. Child evidence is protected after finalization. Human decisions are immutable.

The intended correction path remains:

**new evaluation version → supersedes_evaluation_id**

rather than historical mutation.

## Control 3 — Human authorization separation of duties

Candidate function:

`logistics.enforce_readiness_authorization_sod()`

The candidate control requires:

- an identified evaluator;
- a different authorizer;
- an allowed lifecycle state;
- a mandatory decision reason from the base table design.

Therefore:

**evaluated_by = decided_by → rejected**

where independent authorization is required by this candidate control.

## Security position

All four candidate control functions explicitly use SECURITY INVOKER.

No new SECURITY DEFINER readiness function is introduced.

No existing CargoDesk SECURITY DEFINER helper is replaced.

No existing operational table is altered.

No RLS/RBAC policy is added by this candidate control migration.

No audit vocabulary is invented.

## Test coverage

Added:

`supabase/tests/database/readiness_control_hardening_test.sql`

The test statically verifies:

- validator existence;
- SECURITY INVOKER status;
- exact validation trigger;
- evaluation lifecycle trigger;
- rule-result lifecycle trigger;
- evidence lifecycle trigger;
- human-decision immutability trigger;
- authorization SoD trigger;
- absence of SECURITY DEFINER readiness controls;
- explicit SECURITY INVOKER declaration;
- readiness trigger coverage;
- explicit evaluator/self-authorizer rejection logic.

Runtime negative-path tests remain gated on reconstruction of the authoritative 90-table local baseline.

## Important execution gate

Supabase's documented local workflow uses the CLI and a Docker-compatible runtime for reproducible local database testing. Supabase also recommends pgTAP for database structure, RLS, function, and integrity tests. citeturn0search4turn0search1

Because CargoDesk's complete 90-table migration history is not currently present in the repository and the local Docker-compatible environment is unavailable, SEC-149D remains candidate-only.

No production deployment is authorized by this document.

## Files/commits

- Candidate hardening migration: `20260917220000_sec149d_readiness_control_hardening.sql`
- Hardening tests: `readiness_control_hardening_test.sql`
- Control specification: `SEC-149C-CONTROL-COMPLETION-SPEC.md`
- Security test correction: `readiness_security_test.sql`

The candidate hardening migration was subsequently reviewed to remove destructive trigger-replacement statements. It now creates the controlled triggers without DROP operations.

## Disposition

**SEC-149D — STATIC HARDENING: COMPLETE**

The readiness design now has a defined candidate mechanism for all three controls previously identified as incomplete.

The remaining blocker is execution evidence, not an unresolved design gap.

Next controlled stage:

**SEC-150 — Reproducible Local Baseline Reconstruction & Runtime Readiness Test Gate**

No production schema change should occur before SEC-150 produces reproducible test evidence.
