# SEC-080H — Readiness Scenario Matrix

Status: DOCUMENTATION-ONLY TEST SPECIFICATION.

## Purpose

Turn the SEC-080H interpretation contract into deterministic scenarios before any readiness implementation is selected.

## Scenarios

### S01 — Normal evidence-supported completion
Given applicable prerequisites and required evidence are satisfied, evidence is verified, no material conflict exists, and required human authorization is completed where applicable.
Expected interpretation: evidence supports the recorded state.
Expected outcome: `AUTHORIZED` when required human authorization is recorded; otherwise `READY_FOR_REVIEW` when evidence is sufficient but the final human gate remains.

### S02 — Conflicting operational state
Given a recorded state conflicts with a material event or evidence and no approved precedence rule resolves the conflict.
Expected interpretation: preserve both records and classify the conflict.
Expected outcome: `REVIEW_REQUIRED`.
Never choose a winner from timestamp, insertion order, table order, or UI order alone.

### S03 — Draft document with verified supporting evidence
Given supporting POD/evidence is verified while the associated document remains `DRAFT`, and no approved rule says this combination constitutes an issued/approved document.
Expected interpretation: verified evidence exists, but document lifecycle remains DRAFT.
Expected outcome: `REVIEW_REQUIRED` unless another approved rule independently establishes readiness.
Never automatically promote DRAFT to ISSUED/APPROVED.

### S04 — Unresolved exception
Given a material unresolved exception exists and its impact is not explicitly classified.
Expected interpretation: active exception with unknown safe impact.
Expected outcome: `REVIEW_REQUIRED`.
Only a separately approved rule may classify a specific exception as blocking.

### S05 — Resolved exception
Given a historical exception is RESOLVED and no current material conflict remains.
Expected interpretation: historical exception remains evidence/audit context; resolution does not erase history or automatically establish readiness.
Expected outcome: continue evaluating all remaining conditions. Do not return READY solely because the exception is resolved.

### S06 — Missing required evidence
Given an applicable requirement requires evidence, the evidence is absent, and no approved rule makes it unnecessary.
Expected interpretation: required evidence is missing.
Expected outcome: `NOT_READY`.

### S07 — Unknown applicability
Given available information is insufficient to determine whether a potential requirement applies and no approved applicability rule resolves it.
Expected interpretation: applicability is unknown.
Expected outcome: `REVIEW_REQUIRED`.
Unknown applicability must never silently become NOT_APPLICABLE.

### S08 — Explicit human authorization
Given applicable readiness conditions and evidence have been evaluated and an authorized CargoDesk user performs the required confirmation within permitted scope with the required audit context.
Expected interpretation: evidence-supported state has passed the human authorization boundary.
Expected outcome: `AUTHORIZED`.
A UI click or unverified identity is not sufficient authorization evidence.

## Invariants

1. Never silently rewrite historical evidence.
2. Never automatically promote shipment, document, or milestone status merely because a scenario passes.
3. Keep evidence verification separate from human authorization.
4. Existing RLS/RBAC remains authoritative for access control.
5. Existing document lifecycle remains authoritative for document state.
6. Resolved exceptions remain historical evidence.
7. Unknown material conditions fail safely to `REVIEW_REQUIRED`.
8. `CDG-SHP-2026-0001` must remain unchanged.
9. This matrix is a specification, not authorization for implementation.

## Test-shipment mapping

`CDG-SHP-2026-0001` exercises S02, S03, S05 and the need for explicit dependency interpretation. Its current `DELIVERED` status must not be treated as proof of S01.

## Implementation gate

After this matrix is reconciled with the application architecture:
- prefer existing application/service mechanisms where they can express the rules safely;
- document any genuinely missing capability before proposing schema changes;
- do not create readiness tables, enums, triggers, functions, permissions, RLS changes, migrations, or automated status promotion solely because this matrix exists.

## Acceptance

The scenario work is complete when all eight scenarios have deterministic expected interpretations, ambiguous cases fail safely, evidence is preserved, verification and authorization remain distinct, and the test shipment remains unchanged.
