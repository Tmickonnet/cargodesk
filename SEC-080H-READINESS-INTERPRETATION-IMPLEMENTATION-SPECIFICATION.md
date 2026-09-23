# SEC-080H — Readiness Interpretation Implementation Specification

Status: DOCUMENTATION-ONLY / IMPLEMENTATION SPECIFICATION GATE

## Purpose

This specification defines the smallest implementation shape that can safely be built from the currently approved SEC-080H interpretation contract and Business Rule / Readiness Rule Register.

It is deliberately limited to a read-oriented interpretation capability. It does not create or authorize database structures, new permissions, status transitions, audit structures, or production deployment.

## Governing principles

1. Existing Supabase authorization remains the sole access-control boundary.
2. Readiness interpretation is separate from authorization.
3. Interpretation consumes existing authoritative records and evidence.
4. Interpretation has no operational-state side effects.
5. Undefined or materially indeterminate policy conditions fail safely to REVIEW_REQUIRED.
6. Existing historical records are never rewritten to make an interpretation pass.
7. Document lifecycle status remains authoritative and is never promoted by interpretation.
8. Exception resolution is historical evidence, not automatic readiness.
9. Human authorization is distinct from permission to access the application.
10. Durable authorization recording is not implemented until the existing audit-write capability and required policy are separately verified.

## Minimum input contract

The future interpreter may read, subject to existing authorization and RLS:

- shipment state;
- shipment-leg state;
- applicable milestone/event information where already present;
- document and document-version lifecycle state;
- proof-of-delivery and supporting evidence verification state;
- shipment exceptions and their current/historical status;
- authenticated user/role/permission context through the existing authorization boundary;
- approved readiness rules;
- human authorization evidence when already available.

No new source of operational truth is introduced.

## Bounded output contract

The interpreter may return only one of:

- NOT_APPLICABLE
- NOT_READY
- READY_FOR_REVIEW
- REVIEW_REQUIRED
- AUTHORIZED

The output must include a machine-readable reason classification and enough reviewer-facing explanation to identify the governing condition, without changing source records.

No output may be interpreted as permission to bypass existing authorization.

## Deterministic evaluation sequence

1. Confirm the caller is authenticated through the existing application boundary.
2. Confirm the caller has the required existing permission for the underlying records.
3. Identify the subject being evaluated.
4. Resolve applicability using only approved rules.
5. Gather the required existing records/evidence.
6. Evaluate document lifecycle and evidence verification separately.
7. Identify material conflicts using approved conflict rules.
8. Evaluate exception impact using approved exception rules.
9. Detect missing or indeterminate material conditions.
10. Produce the bounded readiness interpretation.
11. Apply the human-authorization gate where an approved rule requires it.
12. Return the interpretation and reasons without mutating operational state.

## Fail-safe rules

The implementation must return REVIEW_REQUIRED when:

- applicability is materially unknown;
- a material conflict has no approved precedence;
- exception impact is materially unknown;
- a required policy condition cannot be safely determined;
- durable authorization evidence is required but cannot be established;
- the implementation encounters an unsupported policy state.

The implementation must return NOT_READY when an applicable required evidence condition is definitively unmet and no approved exception/waiver applies.

The implementation must not use REVIEW_REQUIRED as a mechanism to conceal application errors; technical failures must remain distinguishable from valid business-rule indeterminacy.

## Scenario mapping

### S01 — Normal evidence-supported completion

If all approved applicable requirements are satisfied:
- return READY_FOR_REVIEW before a mandatory human authorization gate;
- return AUTHORIZED only when the required authorization condition and evidence are satisfied.

### S02 — Conflicting operational state

If a material conflict exists and no approved precedence resolves it:
- return REVIEW_REQUIRED;
- preserve the underlying records.

### S03 — Draft document + verified supporting evidence

Verified supporting evidence does not promote a DRAFT document.
Unless an approved requirement independently establishes readiness:
- return REVIEW_REQUIRED.

### S04 — Unresolved exception

If exception impact is unresolved or unknown:
- return REVIEW_REQUIRED.

No exception status mutation occurs.

### S05 — Resolved exception

A RESOLVED exception remains part of the evaluation history.
The interpreter continues evaluating all other requirements.
Resolution alone cannot produce READY or AUTHORIZED.

### S06 — Missing required evidence

If the requirement is applicable, the evidence is definitively required, and it is absent:
- return NOT_READY unless an approved exception/waiver rule applies.

### S07 — Unknown applicability

If applicability cannot be determined from an approved rule:
- return REVIEW_REQUIRED.

No silent NOT_APPLICABLE decision.

### S08 — Explicit human authorization

Authorization must be evaluated separately from access permission.
AUTHORIZED requires the approved authorization condition and required evidence.

If durable authorization evidence is required but unavailable:
- do not claim AUTHORIZED.

## Undefined policy handling

The interpreter must not hard-code domain assumptions for:

- required documents by shipment mode;
- required evidence by cargo/movement circumstance;
- exact applicability conditions;
- universal conflict precedence;
- exception blocking/non-blocking taxonomy;
- waiver/non-applicability rules;
- mandatory authorization points;
- durable authorization recording.

Until such rules are explicitly approved, the corresponding condition remains REVIEW_REQUIRED or otherwise follows the already established fail-safe rule.

## Explicit non-goals

This specification does not authorize:

- new database tables or columns;
- readiness enums;
- readiness RPCs;
- triggers;
- automatic shipment/document/milestone/exception status changes;
- new permissions;
- RLS/RBAC changes;
- SECURITY DEFINER changes;
- audit-schema changes;
- production data correction;
- external integrations;
- AI-generated policy decisions;
- deployment;
- merging any readiness implementation.

## Test-shipment protection

The implementation must be capable of reading shipment CDG-SHP-2026-0001 without correcting its deliberate inconsistencies.

Those inconsistencies must remain observable as evidence and, where material under approved rules, produce the appropriate fail-safe interpretation.

No test-shipment record may be rewritten merely to make a scenario pass.

## Implementation gate

The specification establishes that the minimum future implementation can remain application/service-level and read-only, provided approved domain rules can be represented without structural database changes.

Before code is written, the following must be separately verified:

1. exact approved domain rules available to the interpreter;
2. existing audit-write capability for any durable authorization requirement;
3. existing authorization/RLS permissions needed to read each source;
4. test strategy covering S01–S08;
5. explicit decision that implementation remains read-only and non-mutating.

## Current decision

The project has reached a technically bounded implementation specification without requiring schema or security restructuring.

Status:

RECONCILED → IMPLEMENTATION BOUNDARY IDENTIFIED → RULE DEPENDENCY IDENTIFIED → POLICY GAPS REGISTERED → REGISTER APPROVED → IMPLEMENTATION SPECIFICATION DEFINED

Not yet:

IMPLEMENTED → VERIFIED → DEPLOYED

## Next safe gate

The next gate is a narrow implementation-readiness verification against the existing application/database capabilities. That verification must confirm whether the specified read-only interpreter can be implemented using existing authorization, RLS, records, and audit capabilities before any production-facing code is introduced.
