# SEC-080H — Bounded Integration-Readiness Verification

## Purpose

Verify whether the first read-only SEC-080H readiness interpreter can safely receive currently required source data through existing CargoDesk application/database access paths, without adding a new authorization path or changing the schema/security model.

## Verification Scope

Checked only:

- existing frontend authorization adapter;
- existing Supabase client/schema configuration;
- first-phase readiness interpreter input boundary;
- existing live authenticated table privileges for required source categories;
- protected POD and audit access constraints.

No UI integration, production deployment, schema migration, RLS/RBAC change, grant, new RPC, audit change, or data correction was performed.

## Verified Application Boundary

The existing frontend authorization adapter delegates authorization to:

- `current_user_id()`
- `current_user_role()`
- `has_permission(requested_permission text)`

The readiness interpreter remains separate from this access-control mechanism and accepts caller-supplied data only. It performs no Supabase calls and has no persistence or status mutation.

Therefore, the prototype can be connected to existing authorized application data only through an already-authorized caller; it must not create a second authorization mechanism.

## Live Access-Path Findings

For the `authenticated` role:

| Source | Direct SELECT | Integration implication |
|---|---:|---|
| `logistics.shipments` | true | Available through existing authorized access path |
| `logistics.shipment_legs` | true | Available through existing authorized access path |
| `logistics.documents` | true | Available through existing authorized access path |
| `logistics.shipment_exception` | true | Available through existing authorized access path |
| `logistics.proof_of_delivery` | false | Protected dependency; do not bypass |
| `logistics.proof_of_delivery_documents` | false | Protected dependency; do not bypass |
| `logistics.audit_log` | false | Not available as a direct readiness input/authorization store |

Existing authorization helper execution remains available for the authenticated role.

## Integration Decision

### 1. Existing operational/document/exception sources

These source categories have an existing authenticated read path and can conceptually supply interpreter inputs without changing the current security architecture.

This does **not** yet authorize UI integration or production use. It only establishes that these categories do not themselves require a new access mechanism at this gate.

### 2. Proof-of-delivery evidence

POD remains protected and is not directly readable by the authenticated client.

The first implementation therefore remains correct in treating a required-but-unavailable protected evidence item as:

`REVIEW_REQUIRED`

No POD RPC, grant, RLS weakening, service-role bypass, or generic SECURITY DEFINER read function is justified by this check.

### 3. Durable authorization

The first implementation deliberately excludes `AUTHORIZED`.

The lack of direct audit-log access therefore does not block the current read-only prototype, because the prototype is not permitted to persist or infer a durable authorization decision.

It would become a gating dependency only if a later approved phase requires durable readiness authorization.

## Result

**INTEGRATION-READINESS: PARTIAL / BOUNDED**

The interpreter is technically connectable to currently authorized/readable shipment, leg, document, and exception data without structural security changes.

It is **not** presently suitable for full evidence-complete production integration because:

1. POD is protected and has no verified existing client read path.
2. Concrete domain-policy completeness remains approval-dependent.
3. Durable `AUTHORIZED` recording is intentionally outside the first phase.
4. No production UI integration has been authorized by this gate.

## Required Next State

Do not expand the implementation.

The safe state is:

**RECONCILED → IMPLEMENTATION BOUNDARY IDENTIFIED → RULE DEPENDENCY IDENTIFIED → POLICY GAPS REGISTERED → REGISTER APPROVED → IMPLEMENTATION SPECIFICATION DEFINED → IMPLEMENTATION READINESS VERIFIED → PROTECTED DEPENDENCIES VERIFIED → MINIMUM-SAFE FIRST-IMPLEMENTATION DECISION APPROVED → READ-ONLY INTERPRETER IMPLEMENTED → IMPLEMENTATION REVIEW VERIFIED → INTEGRATION READINESS PARTIALLY VERIFIED**

### Suspended

- production/UI readiness integration;
- new POD read mechanism;
- audit-write/read changes;
- schema/RLS/RBAC changes;
- new permissions;
- automatic status promotion;
- production deployment;
- PR merge.

No further technical expansion is justified until the remaining policy/protected-evidence dependencies are deliberately resolved.
