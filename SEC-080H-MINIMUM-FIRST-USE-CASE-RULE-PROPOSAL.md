# SEC-080H — Minimum First-Use-Case Rule Proposal

## Purpose

Provide the smallest deterministic rule set for the approved bounded use case, **Shipment Completion Readiness Review**, while keeping every domain-policy decision explicitly PROPOSED until owner approval.

## Rule R1 — Required Evidence

**PROPOSED:** For the first phase, the minimum mandatory evidence set is limited to evidence that is already legitimately readable through the existing application boundary:

- shipment record/state;
- shipment-leg state and available milestone/event information;
- current document records and document lifecycle state;
- legitimately accessible shipment exception records.

POD is **not proposed as a mandatory first-phase input** because the current authorized application boundary cannot directly read the POD tables. This proposal therefore avoids creating a security dependency merely to make the first use case operational.

## Rule R2 — Applicability

**PROPOSED:** The first-phase readiness review applies only when a shipment is explicitly selected for readiness review by an authenticated user who has the existing shipment/read permissions required to access the underlying records.

Applicability must not be inferred from shipment status alone.

If the system cannot determine that the selected subject is within the supported first-use-case boundary, return REVIEW_REQUIRED rather than assuming applicability.

## Rule R3 — Conflict Handling

**PROPOSED:** Material conflicts between authoritative operational state, document lifecycle state, milestone/event information, and exception information must not be silently resolved by the interpreter.

Where no separately approved precedence rule resolves the conflict, return REVIEW_REQUIRED and preserve the underlying records unchanged.

Verification of one evidence source does not automatically override a conflicting source.

## Rule R4 — Exception Impact

**PROPOSED:** An unresolved or materially indeterminate exception must result in REVIEW_REQUIRED.

A resolved exception remains historical evidence and must not by itself establish readiness.

No exception is treated as automatically blocking or automatically non-blocking unless that classification has been explicitly approved.

## Rule R5 — Missing Evidence

**PROPOSED:** If one of the approved mandatory first-phase evidence inputs is definitively unavailable or missing, return NOT_READY.

If the system cannot determine whether the evidence is applicable or whether its absence is acceptable, return REVIEW_REQUIRED.

No waiver or non-applicability is inferred.

## Rule R6 — Document Lifecycle

**PROPOSED:** A document in DRAFT, SUBMITTED, UNDER_REVIEW, REJECTED, or another non-final lifecycle state must not be silently treated as issued/approved evidence.

The existing CargoDesk document lifecycle remains authoritative.

## Rule R7 — Output Boundary

**PROPOSED:** The first phase may return only:

- NOT_APPLICABLE
- NOT_READY
- READY_FOR_REVIEW
- REVIEW_REQUIRED

AUTHORIZED remains excluded.

## Important Boundary

These rules are a **PROPOSAL**, not an approval to change production policy.

No rule in this document authorizes:

- database changes;
- RLS/RBAC changes;
- new permissions;
- POD access changes;
- audit changes;
- automatic status promotion;
- document lifecycle changes;
- production deployment or merge.

## Owner Approval Required

Approval is required specifically for R1–R7 before these rules can become the deterministic rule set used for integration verification.

Until approved, the implementation must continue treating these rule conditions as policy-dependent where applicable.

## Status

**PROPOSED — MINIMUM RULE SET PRESENTED FOR APPROVAL**