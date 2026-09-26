# Product Classification RBAC Implementation Plan

**Status:** QUALIFIED — IMPLEMENTATION APPROVAL REQUIRED

## Permission

Create:

`SHIPMENT_CLASSIFICATION_VERIFY`

The permission is narrowly scoped to formal verification of shipment-cargo classification.

## Role mappings

Grant the permission to:

- SYSTEM_ADMIN
- LOGISTICS_ADMIN
- DOCUMENTATION_OFFICER

Do not grant it to:

- OPERATIONS_OFFICER
- DATA_ENTRY_OFFICER
- VIEWER

## Existing master-data permissions

Leave:

- `MASTER_DATA_CREATE`
- `MASTER_DATA_EDIT`

without role mappings.

## Read boundaries

- Product and classification reference data: `MASTER_DATA_VIEW`
- Shipment-specific classification: `CARGO_VIEW`

## Implementation safeguards

The RBAC migration must:

- use the existing permission and role mapping conventions;
- avoid duplicate permission codes;
- avoid duplicate role-permission rows;
- preserve existing grants;
- be atomic;
- be independently verified after application.

No RBAC mutation has been made in production by this document.

Next gate:

**IMPLEMENTATION APPROVAL → MIGRATION → DATABASE VERIFICATION**
