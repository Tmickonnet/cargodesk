# CargoDesk Product & Classification Implementation Package

**Status:** PROPOSED — IMPLEMENTATION PACKAGE  
**Production changes:** NONE

## 1. Scope

This package translates the approved product/classification domain specification and completed physical/security qualification into an implementation-ready plan.

It does not authorize production execution.

## 2. Physical tables

The implementation package retains the seven-table model:

1. product
2. classification_system
3. classification_jurisdiction
4. classification_edition
5. classification_record
6. product_classification
7. shipment_cargo_classification

No existing CargoDesk table is to be replaced.

## 3. Key and integrity rules

### product
- bigint primary key using the project's established compatible identity strategy;
- unique product_code;
- required product_name;
- optional parent_product_id self-reference;
- active/effective-date controls.

### classification_system
- bigint primary key;
- unique system_code;
- required system_name;
- lifecycle status.

### classification_jurisdiction
- bigint primary key;
- unique jurisdiction_code;
- optional country_id reference;
- lifecycle status.

### classification_edition
- bigint primary key;
- classification_system_id required;
- unique system + edition code;
- effective_from required;
- effective_to optional;
- lifecycle status;
- source_reference;
- parent deletion restricted.

### classification_record
- bigint primary key;
- classification_edition_id required;
- classification_jurisdiction_id required;
- optional parent_record_id;
- required classification code and official description;
- unique edition + jurisdiction + code;
- deletion restricted.

### product_classification
- bigint primary key;
- product_id required;
- classification_record_id required;
- effective dates;
- mapping status;
- duplicate active mappings prevented.

### shipment_cargo_classification
- bigint primary key;
- shipment_cargo_id required;
- product_id required for new classified cargo;
- classification_record_id required when classification is recorded;
- status/source/verification metadata;
- immutable historical snapshot fields;
- verified_by and verified_at consistency checks;
- deletion restricted once verified classification exists.

## 4. Historical snapshot

A shipment classification must retain the classification meaning used at transaction time.

The record should therefore preserve, at minimum:

- classification code;
- official description;
- classification system;
- edition/version;
- jurisdiction;
- verification status;
- source;
- verification actor;
- verification timestamp.

Reference master records may later become SUPERSEDED or RETIRED without rewriting historical shipment meaning.

## 5. Lifecycle

Reference data:

ACTIVE → SUPERSEDED / RETIRED

Shipment classification:

SUGGESTED → UNDER_REVIEW → VERIFIED

Alternative terminal outcomes:

REJECTED
SUPERSEDED

A VERIFIED classification must not be silently overwritten.

## 6. Permission proposal

First preference is reuse of existing permissions where semantics match.

Candidate permissions requiring owner approval:

- PRODUCT_VIEW
- PRODUCT_MANAGE
- CLASSIFICATION_VIEW
- CLASSIFICATION_MANAGE
- SHIPMENT_CLASSIFICATION_CREATE
- SHIPMENT_CLASSIFICATION_VERIFY

The implementation must not create these permissions merely because they appear in this document.

If existing MASTER_DATA_VIEW and CARGO_EDIT safely cover the required operations, they should be reused.

Verification authority must be evaluated separately because verification is a higher-integrity action than ordinary cargo editing.

## 7. RLS proposal

All seven tables:

- RLS enabled before exposure;
- no anon access;
- authenticated access only where required;
- policies based on existing CargoDesk permission helpers;
- no USING(true) authorization shortcuts.

Reference tables:
- operational SELECT only where required;
- management writes restricted.

shipment_cargo_classification:
- SELECT follows shipment/cargo visibility;
- INSERT follows approved classification-create authority;
- UPDATE follows controlled lifecycle authority;
- DELETE is not an ordinary operational action.

Any UPDATE policy must include both USING and WITH CHECK.

## 8. Function/RPC decision

No new SECURITY DEFINER function is part of the automatic implementation.

Preferred order:

1. determine whether RLS + existing permission helpers are sufficient;
2. implement direct controlled operations only if safe;
3. introduce a SECURITY DEFINER RPC only if atomic authorization/audit requirements genuinely require it;
4. separately qualify and approve that function.

If a privileged function is approved, it must use authenticated identity checks, fixed search_path, explicit execution grants, permission checks and atomic audit behavior.

## 9. Audit events

At minimum, implementation should distinguish:

- PRODUCT_CREATED
- PRODUCT_UPDATED
- CLASSIFICATION_REFERENCE_CREATED
- CLASSIFICATION_REFERENCE_UPDATED
- PRODUCT_CLASSIFICATION_CREATED
- SHIPMENT_CARGO_CLASSIFICATION_CREATED
- SHIPMENT_CARGO_CLASSIFICATION_VERIFIED
- SHIPMENT_CARGO_CLASSIFICATION_REJECTED
- SHIPMENT_CARGO_CLASSIFICATION_SUPERSEDED

Exact event naming must be reconciled with the existing audit_log conventions before migration.

## 10. Index qualification

No blanket foreign-key indexing.

Indexes should be limited to demonstrated access paths and uniqueness requirements, including:

- business-key unique constraints;
- shipment_cargo_id lookup;
- product/classification mapping lookup;
- active/effective classification lookup where justified.

Every non-unique index requires an explicit query-path justification.

## 11. Migration order

1. Inspect current main migration conventions.
2. Reconcile exact existing ID/timestamp/status patterns.
3. Create reference tables.
4. Create classification mapping tables.
5. Add RLS before application exposure.
6. Add only approved grants/policies.
7. Add approved audit behavior.
8. Run structural/security tests.
9. Run production-independent integration tests.
10. Review advisors and migration diff.
11. Owner approval.
12. Only then consider production migration.

## 12. Existing data

No automatic backfill is authorized.

Preserve:

- commodities.commodity_id;
- commodities.hs_code;
- shipment_cargo.commodity_id;
- shipment_cargo.hs_code;
- document-specific HS/classification values.

Existing cargo may be mapped later through an explicit, verified migration or human-reviewed workflow.

## 13. Cargo line 2

Cargo line 2 remains unchanged.

Its known business-data discrepancy is intentionally outside this implementation package.

No correction, deletion, or overwrite is authorized by this document.

## 14. Verification plan

Structural:
- seven tables exist;
- keys and constraints match approved design;
- all seven have RLS;
- no anonymous write access;
- expected grants only.

Authorization:
- permitted roles can perform approved operations;
- unauthorized roles cannot;
- verification authority is enforced;
- cross-shipment access is denied.

Historical:
- superseding reference data does not rewrite historical shipment classification;
- verified classifications cannot be silently changed.

Integration:
- shipment cargo can reference product/classification;
- commercial invoice and certificate records remain independently authoritative;
- existing HS values remain intact;
- no existing shipment/cargo records are changed by structural migration.

Security:
- run Supabase advisors;
- inspect all new functions if any;
- verify no unintended SECURITY DEFINER exposure.

## 15. Explicit non-actions

This package does not authorize:

- production migration;
- table creation in production;
- permission creation;
- RLS policy creation;
- grants;
- new RPCs;
- existing cargo correction;
- mass data backfill;
- application deployment.

## 16. Approval gate

**PROPOSED → QUALIFIED → OWNER APPROVAL → IMPLEMENTED → VERIFIED**

Implementation must not begin until the owner explicitly approves the implementation package and any material RBAC/RPC decisions that cannot safely be inferred.
