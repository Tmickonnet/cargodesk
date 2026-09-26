# Product & Classification RBAC Decision

**Status:** PROPOSED — OWNER APPROVAL RECORDED IN PROJECT CONVERSATION  
**Production changes:** NONE

## Decision

### Classification verification

Create a dedicated permission:

SHIPMENT_CLASSIFICATION_VERIFY

Do not reuse CARGO_EDIT for formal classification verification.

Proposed initial role mapping:

- SYSTEM_ADMIN — yes
- LOGISTICS_ADMIN — yes
- DOCUMENTATION_OFFICER — yes
- OPERATIONS_OFFICER — no
- DATA_ENTRY_OFFICER — no
- VIEWER — no

The permission and mappings must be implemented only through an explicit RBAC migration after final implementation review.

### Master-data write authority

Do not assign MASTER_DATA_CREATE or MASTER_DATA_EDIT to any role as part of the product/classification implementation.

The new product/classification reference structures should initially be operationally read-only.

Future master-data administration is a separate governance decision.

## Rationale

Classification verification is a higher-integrity action than ordinary cargo editing and should support separation of duties and auditability.

Existing MASTER_DATA_CREATE and MASTER_DATA_EDIT permissions have no current role mappings. Assigning them now would unnecessarily expand the authorization boundary.

## Scope protection

This decision does not authorize:

- production schema changes;
- permission creation;
- role-permission inserts;
- new SECURITY DEFINER functions;
- existing cargo correction;
- classification backfill;
- frontend deployment.

## Next implementation gate

PROPOSED → APPROVED → IMPLEMENTED → VERIFIED

The implementation package must separately identify every RBAC mutation before execution.
