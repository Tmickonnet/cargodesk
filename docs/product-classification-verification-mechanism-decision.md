# Product Classification Verification Mechanism Decision

**Status:** QUALIFIED — IMPLEMENTATION APPROVAL REQUIRED

## Verified current authorization

Existing `CARGO_EDIT` is assigned to DATA_ENTRY_OFFICER, LOGISTICS_ADMIN, OPERATIONS_OFFICER, and SYSTEM_ADMIN.

Therefore `CARGO_EDIT` must not authorize formal classification verification.

## Decision

Use a dedicated permission:

`SHIPMENT_CLASSIFICATION_VERIFY`

Initial role mapping:

- SYSTEM_ADMIN
- LOGISTICS_ADMIN
- DOCUMENTATION_OFFICER

No mapping for:

- OPERATIONS_OFFICER
- DATA_ENTRY_OFFICER
- VIEWER

Do not map `MASTER_DATA_CREATE` or `MASTER_DATA_EDIT`.

## Controlled verification

A dedicated controlled transition is required.

Proposed RPC:

`logistics.verify_shipment_cargo_classification(p_shipment_cargo_classification_id bigint, p_reason text DEFAULT NULL)`

The function must:

1. require authenticated identity;
2. resolve the application user;
3. require `SHIPMENT_CLASSIFICATION_VERIFY`;
4. lock the classification row;
5. validate an eligible source state;
6. set `status_code = VERIFIED`;
7. record `verified_by`;
8. record database-generated `verified_at`;
9. preserve historical snapshots;
10. write an atomic audit record;
11. return authoritative persisted state;
12. use a controlled search_path;
13. revoke PUBLIC and anon execution;
14. grant execution only to authenticated.

## State transition

Initial controlled transitions:

- SUGGESTED → UNDER_REVIEW
- UNDER_REVIEW → VERIFIED
- UNDER_REVIEW → REJECTED

Additional transitions require separate qualification.

## Security boundary

The verification RPC is the only proposed mechanism for establishing VERIFIED state. Ordinary cargo editing must not be able to establish VERIFIED status.

No production permission, role mapping, function, RLS policy, grant, schema, or data change is authorized by this document.

Next gate:

**IMPLEMENTATION APPROVAL → IMPLEMENTED → SECURITY TEST → DATABASE VERIFIED**
