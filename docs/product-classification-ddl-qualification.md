# CargoDesk Product & Classification DDL Qualification

**Status:** PROPOSED — DDL QUALIFICATION  
**Production changes:** NONE

## 1. Verified CargoDesk conventions

Live production inspection confirms:
- application identifiers are BIGINT;
- some tables use PostgreSQL sequences for generated IDs;
- some reference tables use manually managed BIGINT IDs;
- created_at/updated_at are TIMESTAMPTZ and commonly default to now();
- audit_log uses a BIGINT sequence-backed primary key;
- shipment_cargo has a manually managed BIGINT primary key;
- foreign-key deletion is explicitly chosen rather than assumed;
- RLS policies use logistics.has_permission(permission_code);
- UPDATE policies use both USING and WITH CHECK;
- controlled writes use narrowly scoped SECURITY DEFINER functions only where justified.

Therefore the new model must not blindly impose one ID-generation strategy across all seven tables.

## 2. Proposed identifier strategy

For the seven new application-created tables, use BIGINT primary keys with sequence-backed defaults. This is preferable to MAX(id)+1 for new tables because PostgreSQL sequences provide native concurrent-safe allocation.

No sequence is to be created for existing tables.

## 3. Timestamp strategy

Use created_at and updated_at as TIMESTAMPTZ NOT NULL DEFAULT now() for mutable tables.

Historical classification records must not be silently rewritten.

## 4. Product

- product_id BIGINT PK
- product_code VARCHAR NOT NULL UNIQUE
- product_name VARCHAR NOT NULL
- parent_product_id BIGINT NULL
- description TEXT NULL
- is_active BOOLEAN NOT NULL DEFAULT TRUE
- effective_from DATE NULL
- effective_to DATE NULL
- created_at / updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

Constraints:
- parent_product_id references product(product_id);
- parent deletion RESTRICT;
- no self-parenting;
- effective_to cannot precede effective_from.

## 5. Classification system

- classification_system_id BIGINT PK
- system_code VARCHAR NOT NULL UNIQUE
- system_name VARCHAR NOT NULL
- description TEXT NULL
- is_active BOOLEAN NOT NULL DEFAULT TRUE
- created_at / updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

## 6. Classification jurisdiction

- classification_jurisdiction_id BIGINT PK
- jurisdiction_code VARCHAR NOT NULL UNIQUE
- jurisdiction_name VARCHAR NOT NULL
- country_id BIGINT NULL
- is_active BOOLEAN NOT NULL DEFAULT TRUE
- created_at / updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

country_id references logistics.countries(country_id) with deletion restricted.

## 7. Classification edition

- classification_edition_id BIGINT PK
- classification_system_id BIGINT NOT NULL
- edition_code VARCHAR NOT NULL
- edition_name VARCHAR NULL
- effective_from DATE NOT NULL
- effective_to DATE NULL
- status_code VARCHAR NOT NULL DEFAULT 'ACTIVE'
- source_reference TEXT NULL
- created_at / updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

Unique key: (classification_system_id, edition_code).

Lifecycle values: ACTIVE, SUPERSEDED, RETIRED.

## 8. Classification record

- classification_record_id BIGINT PK
- classification_edition_id BIGINT NOT NULL
- classification_jurisdiction_id BIGINT NOT NULL
- parent_classification_record_id BIGINT NULL
- classification_code VARCHAR NOT NULL
- official_description TEXT NOT NULL
- status_code VARCHAR NOT NULL DEFAULT 'ACTIVE'
- created_at / updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

Unique key: (classification_edition_id, classification_jurisdiction_id, classification_code).

Parent, edition and jurisdiction deletion must be restricted.

## 9. Product classification

- product_classification_id BIGINT PK
- product_id BIGINT NOT NULL
- classification_record_id BIGINT NOT NULL
- effective_from DATE NULL
- effective_to DATE NULL
- status_code VARCHAR NOT NULL DEFAULT 'ACTIVE'
- source_reference TEXT NULL
- created_at / updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

Duplicate active mappings must be prevented. The exact PostgreSQL mechanism will be reviewed before implementation.

## 10. Shipment cargo classification

- shipment_cargo_classification_id BIGINT PK
- shipment_cargo_id BIGINT NOT NULL
- product_id BIGINT NOT NULL
- classification_record_id BIGINT NOT NULL
- classification_code_snapshot VARCHAR NOT NULL
- classification_description_snapshot TEXT NOT NULL
- classification_system_code_snapshot VARCHAR NOT NULL
- classification_edition_code_snapshot VARCHAR NOT NULL
- jurisdiction_code_snapshot VARCHAR NOT NULL
- status_code VARCHAR NOT NULL DEFAULT 'SUGGESTED'
- source_code VARCHAR NOT NULL
- verified_by BIGINT NULL
- verified_at TIMESTAMPTZ NULL
- created_at / updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

References:
- shipment_cargo_id → shipment_cargo ON DELETE RESTRICT
- product_id → product ON DELETE RESTRICT
- classification_record_id → classification_record ON DELETE RESTRICT
- verified_by → users(user_id) ON DELETE RESTRICT

Checks:
- VERIFIED requires verified_by and verified_at;
- non-verified status must not falsely claim verification.

## 11. Historical rule

The FK to classification_record identifies the reference source, while snapshot fields preserve the historical classification meaning used for the shipment.

A later reference-data change must not rewrite a verified shipment classification.

## 12. RLS qualification

Reference/master tables:
- SELECT → MASTER_DATA_VIEW
- INSERT/UPDATE → MASTER_DATA_CREATE / MASTER_DATA_EDIT, subject to explicit role-mapping verification.

Shipment classification:
- SELECT → cargo/shipment visibility authority.
- INSERT → CARGO_EDIT only if final semantic review confirms this is appropriate.
- Verification → separate authority if required.
- DELETE → no ordinary operational policy.

All UPDATE policies must have both USING and WITH CHECK.

## 13. Material RBAC finding

Live inspection confirms MASTER_DATA_CREATE and MASTER_DATA_EDIT permissions exist, but the current role-permission mapping returned no roles for those permissions.

Therefore those permissions must NOT be silently assigned to roles during implementation. If product/classification master-data management is required, role mapping is a separate owner-approved RBAC decision.

## 14. SECURITY DEFINER

No new SECURITY DEFINER function is included automatically.

If classification verification needs atomic mutation plus audit beyond safe RLS operations, a separate controlled RPC will be designed and reviewed.

## 15. Indexes

Required uniqueness constraints will provide their supporting indexes.

Additional indexes should be limited to demonstrated access paths, especially shipment_cargo_classification shipment lookup, product/classification mapping lookup, and classification code lookup.

No blanket FK indexing.

## 16. Migration safety

The first migration must create only approved structure and security boundaries.

It must not:
- modify existing cargo;
- backfill product classifications;
- change commodities.hs_code;
- change shipment_cargo.hs_code;
- alter existing RLS;
- grant new role permissions;
- deploy frontend code.

## 17. Remaining qualification

Before executable SQL is approved, verify:
1. exact varchar lengths;
2. exact status representation convention;
3. CHECK constraints versus status reference tables;
4. active-mapping uniqueness strategy;
5. exact audit events;
6. final permission mapping;
7. whether shipment classification INSERT can use CARGO_EDIT;
8. whether verification requires a distinct permission;
9. rollback strategy.

## 18. Gate

PROPOSED → DDL QUALIFIED → SECURITY/RBAC APPROVAL → IMPLEMENTED → VERIFIED

Production remains unchanged.
