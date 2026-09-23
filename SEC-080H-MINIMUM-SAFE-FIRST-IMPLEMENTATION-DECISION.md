# SEC-080H — Minimum Safe First-Implementation Decision Gate

Status: PROPOSED — OWNER DECISION REQUIRED

## Purpose

Resolve only the two remaining dependencies necessary to move SEC-080H to the smallest safe implementation milestone, without changing the database, security model, document lifecycle, or operational data.

## Decision 1 — Durable authorization for the first implementation

### Proposed minimum-safe scope

The first readiness implementation should NOT implement or return `AUTHORIZED`.

It should support only the non-authorizing interpretation outcomes:

- `NOT_APPLICABLE`
- `NOT_READY`
- `READY_FOR_REVIEW`
- `REVIEW_REQUIRED`

Human authorization remains outside the first implementation until an approved durable authorization mechanism is verified.

### Reason

The verified live project currently has:

- zero `audit_log` rows;
- no direct ordinary-role access to `audit_log`;
- no verified existing durable readiness-authorization write/read path.

Application permission is not equivalent to a durable readiness authorization decision.

### Required owner decision

Approve or reject the following:

> **DECISION A — For the first SEC-080H implementation, `AUTHORIZED` is explicitly out of scope. The interpreter may return `READY_FOR_REVIEW` but must not represent, persist, or infer a durable authorized readiness decision.**

This decision does not prevent a later controlled authorization capability.

## Decision 2 — Protected POD evidence

### Proposed minimum-safe handling

Do not change POD RLS, grants, or schema.

If the readiness interpreter cannot legitimately obtain POD evidence through an already-approved access path, it must treat the unavailable material POD evidence as an indeterminate/protected dependency and return `REVIEW_REQUIRED` rather than assume the evidence is absent, present, verified, or irrelevant.

### Required owner decision

Approve or reject the following:

> **DECISION B — For the first SEC-080H implementation, protected POD evidence remains unchanged. No new POD read mechanism is created at this gate. Where POD evidence is required but cannot be legitimately exposed through the existing authorized application path, the interpreter returns `REVIEW_REQUIRED`.**

This does not waive POD requirements. It establishes fail-safe handling until an approved read path is separately established.

## Result if both decisions are approved

The smallest safe first implementation may proceed as a read-only interpreter that:

1. uses the existing authorization boundary;
2. reads only legitimately exposed source data;
3. applies only approved/established rules;
4. never bypasses RLS;
5. treats protected/indeterminate evidence as `REVIEW_REQUIRED`;
6. never mutates operational records;
7. never promotes shipment, leg, document, POD, or exception status;
8. never creates or writes an audit/authorization record;
9. never returns `AUTHORIZED`;
10. preserves the existing test shipment and all historical contradictions.

## Explicitly suspended work

The following remain out of scope until separately justified and approved:

- new POD RPC/read function;
- direct grants on POD tables;
- RLS changes;
- audit-log grants or schema changes;
- new authorization/audit tables;
- document lifecycle changes;
- shipment/milestone status automation;
- readiness database functions/triggers;
- new permissions/RBAC;
- external integrations;
- AI-based policy or authorization inference;
- production deployment;
- merge of readiness implementation before verification.

## Next milestone after owner approval

If both decisions are approved, the next milestone is narrowly limited to:

**SEC-080H — Readiness Interpreter Prototype / Tests**

That milestone must first be implemented and tested as a non-mutating application/service capability, then reviewed against S01–S08 before any merge or deployment decision.

## Approval boundary

Approval of this document must be explicit and limited to Decisions A and B. It does not approve any future schema change, authorization mechanism, POD access mechanism, production deployment, or unapproved domain policy.

Current status:

**RECONCILED → IMPLEMENTATION BOUNDARY IDENTIFIED → RULE DEPENDENCY IDENTIFIED → POLICY GAPS REGISTERED → REGISTER APPROVED → IMPLEMENTATION SPECIFICATION DEFINED → IMPLEMENTATION READINESS VERIFIED → PROTECTED DEPENDENCIES VERIFIED → MINIMUM-SAFE FIRST-IMPLEMENTATION DECISION PROPOSED**
