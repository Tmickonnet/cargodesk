# SEC-080H — Dependency Resolution Decision

## Purpose

Record the minimum decisions required after bounded integration-readiness verification, without expanding the implementation beyond the currently approved first-phase boundary.

## Decision 1 — Protected POD Evidence

### Current verified state

The authenticated application has no direct SELECT privilege on:

- logistics.proof_of_delivery
- logistics.proof_of_delivery_documents

No dedicated POD read function was identified during the preceding verification.

### Decision

POD remains a **protected evidence dependency** for the first implementation.

The first-phase readiness interpreter will **not** introduce a new POD read mechanism.

Where an applicable readiness rule requires POD evidence but that evidence cannot be supplied through an already-authorized existing path, the interpreter must continue to return:

**REVIEW_REQUIRED**

This preserves the current RLS/security boundary and prevents readiness from being inferred from inaccessible evidence.

No grant, RLS modification, SECURITY DEFINER bypass, generic read function, or service-role client path is authorized by this decision.

## Decision 2 — First-Phase Domain Rule Boundary

The first implementation must not attempt to define the complete CargoDesk readiness policy universe.

Only rules necessary to support a narrowly bounded first readiness use case may be established.

Before application integration, the minimum approved rule inputs must explicitly establish:

1. required evidence for the selected use case;
2. applicability conditions;
3. conflict handling;
4. exception impact.

Rules outside that minimum scope remain undefined and must fail safely to REVIEW_REQUIRED where material.

The existing SEC-080H safety rules remain authoritative:

- verification is not authorization;
- resolved exceptions do not automatically establish readiness;
- historical records are not rewritten;
- unknown applicability is REVIEW_REQUIRED;
- indeterminate material evidence is REVIEW_REQUIRED;
- first-phase AUTHORIZED remains excluded.

## Integration Consequence

These decisions do **not** authorize:

- UI integration;
- production deployment;
- PR merge;
- database schema changes;
- RLS/RBAC changes;
- new permissions;
- new POD/audit functions;
- audit-log changes;
- automatic status promotion;
- production data correction.

The existing read-only interpreter remains the implementation boundary.

## Controlled Next Gate

The next technical step, if and only if the minimum first-use-case rules are separately established, is:

**Re-verify the integration boundary against those concrete rules and existing authorized source paths.**

If the selected first use case can be evaluated without inaccessible mandatory evidence or a new security mechanism, a narrowly scoped application integration may then be considered.

If it cannot, stop and document the dependency rather than bypassing the security model.

## Status

**RECONCILED → DEPENDENCIES EXPLICITLY BOUNDED → FIRST-PHASE INTEGRATION REMAINS SUSPENDED**

This artifact records a safety boundary, not authorization for deployment or broad implementation.
