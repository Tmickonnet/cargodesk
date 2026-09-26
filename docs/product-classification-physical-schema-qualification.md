# CargoDesk Product & Classification Physical Schema Qualification

**Status:** PROPOSED — PRE-IMPLEMENTATION QUALIFICATION  
**Production changes:** NONE  
**Implementation authorization:** NOT GRANTED

## 1. Recommended minimum physical model

The logical design should be implemented as seven new tables, subject to final owner approval:

1. product
2. classification_system
3. classification_jurisdiction
4. classification_edition
5. classification_record
6. product_classification
7. shipment_cargo_classification

This is intentionally minimal. No generic attribute/EAV model is proposed.

## 2. Key and relationship rules

### product
- BIGINT identity-compatible primary key
- unique product_code
- optional parent_product_id → product.product_id
- parent deletion should be RESTRICT
- product_code and product_name required
- active/effective dating supported

### classification_system
- BIGINT primary key
- unique system_code
- required system_name
- controlled active status

### classification_jurisdiction
- BIGINT primary key
- unique jurisdiction_code
- optional country_id → existing countries.country_id
- controlled active status

### classification_edition
- BIGINT primary key
- classification_system_id → classification_system
- unique combination of system + edition_code
- required effective_from
- optional effective_to
- controlled status
- edition deletion should be RESTRICT

### classification_record
- BIGINT primary key
- classification_edition_id → classification_edition
- classification_jurisdiction_id → classification_jurisdiction
- optional parent_classification_record_id → classification_record
- code required
- official_description required
- uniqueness should be scoped to edition + jurisdiction + code
- parent deletion should be RESTRICT

### product_classification
- BIGINT primary key
- product_id → product
- classification_record_id → classification_record
- effective dating
- controlled mapping status
- duplicate active mapping must be prevented

### shipment_cargo_classification
- BIGINT primary key
- shipment_cargo_id → shipment_cargo
- product_id → product
- classification_record_id → classification_record
- status/source/verification metadata
- immutable historical snapshot fields
- shipment cargo deletion should RESTRICT while a verified classification exists
- verified_by should reference the existing application user identity
- verification timestamp required when status becomes VERIFIED

## 3. Important design correction before implementation

The earlier logical proposal allowed product_id to be nullable during transition.

The recommended physical implementation should not require that nullable state in the final transactional model.

Instead:
- product may initially be optional only during a controlled migration period;
- the final operational relationship should require a product for new classified cargo;
- existing cargo must not be backfilled merely to satisfy the new model;
- application workflow should require product selection before classification verification.

This avoids permanently ambiguous shipment classifications.

## 4. Snapshot strategy

shipment_cargo_classification should preserve:
- classification code
- classification description
- system/edition identity
- jurisdiction identity

as historical references/snapshots sufficient to explain what was verified at transaction time.

The live classification record remains the reference source; the shipment snapshot protects historical interpretation.

## 5. Status strategy

Prefer constrained reference/status values rather than PostgreSQL enums unless the existing CargoDesk convention explicitly requires enums.

Reference statuses:
- ACTIVE
- SUPERSEDED
- RETIRED

Shipment classification:
- SUGGESTED
- UNDER_REVIEW
- VERIFIED
- REJECTED
- SUPERSEDED

A verified record must not be silently mutated into another classification.

## 6. Audit strategy

Creating or verifying shipment classification must produce an audit event.

The implementation must reuse the established CargoDesk audit model rather than creating a parallel audit table.

Reference-data maintenance must also remain attributable.

## 7. RLS/RBAC proposal

Before exposure:
- enable RLS on all seven tables;
- no anonymous privileges;
- reference tables: controlled read access;
- product/classification master writes: restricted master-data administration;
- shipment classification creation: operational cargo-edit capability only if semantically appropriate;
- shipment classification verification: a separate permission may be justified if existing permissions cannot distinguish data entry from verification;
- never bypass RLS with client-side service credentials.

Permission names and exact policies require a separate implementation/security review.

## 8. Index qualification

Do not create indexes merely because a foreign key exists.

At minimum, implementation should assess:
- unique business keys;
- scoped classification code lookup;
- active product lookup;
- shipment_cargo_id lookup;
- product/classification lookup.

Any non-required performance index must be justified against observed query patterns before deployment.

## 9. Migration and backfill

Initial implementation should create the structure without mass classification backfill.

Existing records:
- retain commodity_id;
- retain shipment_cargo.hs_code;
- retain document-level HS values;
- remain historically unchanged.

A controlled mapping may later map existing commodity records to products where the relationship is explicitly verified.

## 10. Test qualification

Before production:

### Structural
- all PK/FK/unique/check constraints;
- valid/invalid parent relationships;
- effective-date boundaries;
- duplicate classification prevention.

### Security
- anonymous denial;
- unauthorized authenticated read/write denial;
- role/permission boundaries;
- verification authorization;
- SECURITY DEFINER review if any RPC is introduced.

### Historical
- superseding a classification does not alter verified shipment snapshots;
- verified shipment classification remains auditable;
- deleting a referenced master record is prevented.

### Integration
- shipment cargo remains readable;
- existing commodity links remain intact;
- invoice/certificate HS values remain intact;
- reconciliation detects mismatches without overwriting source values.

## 11. Explicit non-actions

This qualification does not:
- create tables;
- add columns;
- add policies;
- add permissions;
- add functions;
- grant privileges;
- modify cargo line 2;
- backfill existing data;
- deploy application code.

## 12. Approval gate

The next approval must cover the exact migration SQL and security/RBAC package as one controlled change.

**No production implementation should begin from this document alone.**
