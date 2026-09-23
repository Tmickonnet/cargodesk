# SEC-080H — Minimum Implementation Decision Reconciliation

Status: DOCUMENTATION-ONLY / DECISION GATE

## Finding

The existing CargoDesk application can safely host a future readiness interpretation layer without replacing its authorization boundary, but the evidence currently available does not justify implementing that layer yet.

The smallest safe future form is an application/service-level, read-oriented interpretation capability that consumes existing authoritative records and returns a bounded readiness interpretation. It must not mutate shipment, document, milestone, exception, or evidence state as a side effect of interpretation.

## Verified existing capability

The current frontend authorization adapter already delegates identity, role, and permission decisions to existing Supabase functions:

- current_user_id
- current_user_role
- has_permission

Permission failures return false. Role lookup failure results in no established role. The React authorization hook therefore fails closed while authorization is unavailable.

This existing mechanism is sufficient for access control and must remain the authority for authorization.

## Capability gap

No current application readiness/evidence interpretation module was identified.

The missing capability is therefore not another permission mechanism. It is a separate interpretation concern that would consume existing authorized data and classify readiness according to approved business rules.

## Eight-scenario decision

### S01 — Normal evidence-supported completion

Potentially expressible without schema change, provided the applicable requirements and human authorization rule are explicitly approved.

Result: READY_FOR_REVIEW or AUTHORIZED according to the approved authorization boundary.

### S02 — Conflicting operational state

Expressible as read-time conflict detection only if an approved precedence/conflict rule exists.

Current boundary: REVIEW_REQUIRED when no approved rule resolves the conflict.

No database record should be rewritten to resolve the conflict.

### S03 — Draft document + verified supporting evidence

Expressible as a read-time distinction between document lifecycle and supporting evidence.

Current boundary: REVIEW_REQUIRED unless an approved rule independently establishes readiness.

No document promotion is justified.

### S04 — Unresolved exception

Expressible as read-time exception detection.

Current boundary: REVIEW_REQUIRED when safe impact is not explicitly classified.

No exception status change is justified.

### S05 — Resolved exception

Expressible as read-time historical-context handling.

Current boundary: continue evaluating other requirements. Resolution alone cannot establish readiness.

No historical exception should be deleted or rewritten.

### S06 — Missing required evidence

Expressible as read-time required-evidence evaluation.

Current boundary: NOT_READY when the requirement is applicable and no approved exception applies.

### S07 — Unknown applicability

Potentially expressible as read-time rule evaluation, but only after the applicable rule set is explicitly defined.

Current boundary: REVIEW_REQUIRED when applicability cannot be established.

No silent NOT_APPLICABLE decision is permitted.

### S08 — Explicit human authorization

The existing authorization adapter can establish access permission, but it does not currently establish a durable readiness authorization decision.

Therefore the interpretation portion is expressible without schema change, while durable authorization recording remains an unresolved capability question.

No new audit or decision table should be created at this stage.

## Critical unresolved rule dependency

The largest remaining blocker is not application plumbing. It is the absence of an approved, deterministic business rule set defining:

- which readiness requirements apply to which shipment/operational circumstances;
- which evidence is required for each applicable requirement;
- which conflicts are material;
- whether any conflict has approved precedence;
- which exceptions are blocking, non-blocking, or review-only;
- when missing evidence can legitimately be treated as not applicable;
- when human authorization is mandatory.

Without these rules, implementing a readiness engine would force the application to invent policy. That is not justified by the current evidence.

## Minimal future implementation shape

If and when the business rules are approved, the preferred first implementation should be:

Authenticated user
→ existing authorization boundary
→ read existing relevant records/evidence
→ deterministic interpretation rules
→ bounded readiness result
→ reviewer explanation
→ human authorization gate where required.

The first implementation should be read-only with respect to operational truth.

Any persistence of an authorization decision must be separately designed and approved after the existing audit write capability is verified.

## Changes NOT justified

This reconciliation does not justify:

- readiness tables;
- readiness enums;
- readiness RPCs;
- triggers;
- status promotion;
- new permissions;
- RLS changes;
- RBAC changes;
- document lifecycle changes;
- exception lifecycle changes;
- audit schema changes;
- data correction;
- production migration;
- deployment.

## Test-shipment safety

CDG-SHP-2026-0001 remains unchanged.

Its deliberate contradictions continue to serve as negative/edge-case evidence for the interpretation contract.

## Decision

SEC-080H has reached the minimum safe implementation decision boundary.

The project should NOT proceed directly to readiness implementation.

The next necessary milestone is a narrowly scoped **Business Rule/Readiness Rule Register** that records only the approved applicability, evidence, conflict, exception, and authorization rules required by S01–S08.

That register should remain documentation-only unless a later approved rule demonstrably requires a structural implementation change.

## Status

RECONCILED → IMPLEMENTATION BOUNDARY IDENTIFIED → RULE DEPENDENCY IDENTIFIED

Not yet:

APPROVED → IMPLEMENTED → VERIFIED
