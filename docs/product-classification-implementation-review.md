# Product & Classification Implementation Review

**Status:** QUALIFIED FOR FINAL IMPLEMENTATION DRAFT — NOT APPROVED FOR PRODUCTION

## Verified live conventions

- Permission keys are `permissions.permission_code`.
- Role keys are `roles.role_code`.
- Role mapping uses `role_permissions(role_id, permission_id, granted)`.
- Existing RLS policies authorize through `logistics.has_permission(...)`.
- Existing `MASTER_DATA_CREATE` and `MASTER_DATA_EDIT` have no role mappings.
- Existing cargo editing uses `CARGO_EDIT`; cargo viewing uses `CARGO_VIEW`.
- Existing users use BIGINT `user_id`; classification verification can therefore reference the established identity table without introducing another identity structure.

## Physical model review

The seven-table model remains appropriate:

1. product
2. classification_system
3. classification_jurisdiction
4. classification_edition
5. classification_record
6. product_classification
7. shipment_cargo_classification

The draft correctly preserves existing `commodities` and `shipment_cargo.hs_code` rather than replacing them.

## Important integrity decisions

### Historical classification

Shipment classification stores snapshots of:

- classification code
- official description
- classification system
- edition
- jurisdiction

This protects historical shipment records from later master-reference changes.

### Product identity

A product is required for new shipment classification records. Existing shipment cargo is not backfilled merely to satisfy the new model.

### Classification context

A shipment classification is not constrained to one global code per cargo. System, edition, jurisdiction and classification record remain part of its context.

### Verification

A VERIFIED classification requires both `verified_by` and `verified_at`.

### Deletion

Referenced product/classification records use restrictive deletion behavior to protect historical integrity.

## RBAC

Dedicated permission:

`SHIPMENT_CLASSIFICATION_VERIFY`

Initial mapping:

- SYSTEM_ADMIN
- LOGISTICS_ADMIN
- DOCUMENTATION_OFFICER

No mapping for:

- OPERATIONS_OFFICER
- DATA_ENTRY_OFFICER
- VIEWER

No mapping is added for `MASTER_DATA_CREATE` or `MASTER_DATA_EDIT`.

## Security implementation boundary

Before executable migration:

- RLS must be enabled on all seven tables.
- No anonymous access.
- Reference reads should use the existing `MASTER_DATA_VIEW` boundary where appropriate.
- Shipment classification reads should use a dedicated classification-view permission or another explicitly qualified existing permission; this must be finalized before implementation.
- Shipment classification writes must not be granted by broad table privileges.
- Verification must be protected by `SHIPMENT_CLASSIFICATION_VERIFY`.
- No new SECURITY DEFINER function is required merely to establish the tables.

## Index boundary

Only indexes supporting known uniqueness and FK/read paths are proposed. No blanket indexing of every FK is authorized.

## Production safety

This review does not authorize:

- applying the schema migration;
- creating the permission;
- assigning role permissions;
- granting table privileges;
- modifying RLS;
- backfilling existing cargo;
- changing cargo line 2;
- changing existing commodity data;
- application deployment.

Next gate:

**QUALIFIED → IMPLEMENTATION APPROVAL → EXECUTABLE MIGRATION → TEST → REVIEW → MERGE → APPLY → VERIFY**
