# CargoDesk Product & Classification Schema Design Qualification

**Status:** QUALIFICATION / PROPOSED IMPLEMENTATION DESIGN  
**Baseline:** main after PR #54  
**Production changes:** NONE  
**Implementation authorization:** NOT GRANTED

## 1. Objective

Translate the approved Product, Commodity & Classification Domain Specification into an implementation-ready logical schema while preserving CargoDesk's existing production foundation.

This document is a qualification artifact, not a migration.

## 2. Verified production foundation

Existing production entities include:

- `commodity_categories`
- `commodities`
- `shipment_cargo`
- `commercial_invoice_details`
- `certificate_of_origin_details`
- `packing_list`

Relevant existing cargo fields include product/commodity reference, cargo description, HS code, packaging, quantity/UOM, net/gross weight/UOM, volume/UOM, marks, lot and production/expiry dates.

Existing document-detail domains already contain classification-related values, including HS code, and therefore provide a future reconciliation surface.

## 3. Important reconciliation note

A recent information_schema foreign-key query returned an empty result where previously verified production relationships exist. This is treated as a **verification-query anomaly**, not evidence that the relationships are absent.

No schema decision is based on that anomalous result.

The exact production constraint map has now been independently re-verified through the authoritative PostgreSQL constraint catalog; the verification is recorded in the qualification addendum and introduces no production change.

## 4. Proposed logical model

The minimum proposed new domain is:

### A. Product hierarchy

**product**
- product_id
- parent_product_id nullable
- product_code
- product_name
- description nullable
- is_active
- effective_from nullable
- effective_to nullable
- created_at
- updated_at

Purpose: represent a specific commercial/physical product independently of tariff classification.

The self-reference permits:

Product Family → Product → Sub-product

The model must support a product without a parent.

### B. Classification system

**classification_system**
- classification_system_id
- system_code
- system_name
- description nullable
- is_active
- created_at
- updated_at

Purpose: identify the coding/classification system.

### C. Classification jurisdiction

**classification_jurisdiction**
- classification_jurisdiction_id
- jurisdiction_code
- jurisdiction_name
- country_id nullable where applicable
- is_active
- created_at
- updated_at

Purpose: identify the jurisdiction/context in which a classification applies.

### D. Classification edition

**classification_edition**
- classification_edition_id
- classification_system_id
- edition_code
- edition_name
- effective_from
- effective_to nullable
- status
- source_reference nullable
- created_at
- updated_at

Purpose: preserve the exact classification edition/version used.

### E. Classification record

**classification_record**
- classification_record_id
- classification_edition_id
- classification_jurisdiction_id
- code
- official_description
- parent_classification_record_id nullable
- effective_from nullable
- effective_to nullable
- status
- source_reference nullable
- created_at
- updated_at

Purpose: store the authoritative classification node/code for a jurisdiction and edition.

The parent relationship permits hierarchical classification structures.

### F. Product classification mapping

**product_classification**
- product_classification_id
- product_id
- classification_record_id
- mapping_status
- confidence/reference notes where appropriate
- effective_from nullable
- effective_to nullable
- created_at
- updated_at

Purpose: represent that a product may have one or more classification relationships depending on jurisdiction/context.

This is deliberately a mapping, not a legal assertion that one universal HS code belongs to every transaction involving the product.

### G. Shipment cargo classification

**shipment_cargo_classification**
- shipment_cargo_classification_id
- shipment_cargo_id
- product_id nullable during transition
- classification_record_id
- classification_source/status
- verified_by nullable
- verified_at nullable
- verification_notes nullable
- source_reference nullable
- classification_code_snapshot
- classification_description_snapshot
- classification_edition_snapshot
- classification_jurisdiction_snapshot
- created_at
- updated_at

Purpose: preserve the classification actually used for a shipment cargo line, including sufficient historical snapshot information.

The snapshot fields are intentional: future reference-master changes must not alter the historical interpretation of an already processed shipment.

## 5. Relationship strategy

Conceptually:

```
commodity_categories
       │
       ▼
commodities  ← existing legacy/master anchor
       │
       │ transition / mapping
       ▼
product
       │
       ▼
product_classification
       │
       ▼
classification_record
       │
       ▼
classification_edition
       │
       ├── classification_system
       └── classification_jurisdiction

shipment_cargo
       │
       ▼
shipment_cargo_classification
       ├── product
       └── classification_record
```

The existing `commodity_id` on `shipment_cargo` remains intact during transition.

## 6. Legacy compatibility strategy

### Existing `commodities`

Do not replace the table.

Recommended transition:

1. retain existing commodity families/master records;
2. introduce product records separately;
3. establish controlled mappings between existing commodity records and product records;
4. only populate mappings where the relationship is verified;
5. keep `commodities.hs_code` as legacy/default master information;
6. do not reinterpret it as a versioned jurisdictional classification.

### Existing `shipment_cargo.hs_code`

Retain during transition.

For new transactions, the future classification record becomes authoritative for classification context while the existing field remains available for compatibility.

No mass backfill should occur automatically.

## 7. Historical preservation

Once a shipment cargo classification has been verified:

- changing the master classification record must not rewrite the historical shipment;
- superseding a tariff edition must not alter prior shipment meaning;
- verification identity/time must remain auditable;
- source/reference information must remain recoverable.

A future implementation should prefer append/version semantics over destructive updates for classification history.

## 8. Classification lifecycle

Proposed status vocabulary:

**REFERENCE**
- ACTIVE
- SUPERSEDED
- RETIRED

**SHIPMENT CLASSIFICATION**
- SUGGESTED
- UNDER_REVIEW
- VERIFIED
- REJECTED
- SUPERSEDED

A rejected suggestion must not become the shipment's verified classification.

A verified classification should not be silently replaced.

## 9. Classification source

Source should be explicit.

Candidate values:

- MASTER_REFERENCE
- HUMAN_ENTERED
- HUMAN_VERIFIED
- IMPORTED_REFERENCE
- DOCUMENT_DERIVED
- SYSTEM_SUGGESTED

The exact enum/reference implementation requires final approval.

## 10. Cross-document reconciliation

The future validation layer should compare, where applicable:

- shipment cargo classification;
- commercial invoice detail HS code;
- certificate of origin detail HS code;
- other transport/regulatory document classification values.

Results:

- **ERROR:** required classification missing;
- **WARNING:** classification differs;
- **INFORMATION:** classification agrees and is verified.

The system must not automatically overwrite the document's own value.

## 11. RLS/RBAC qualification

New tables must follow the existing CargoDesk security architecture.

Minimum requirements:

- RLS enabled before application exposure;
- no anonymous access;
- authenticated SELECT limited by approved permissions and/or existing authorization helpers;
- controlled writes for transactional classification decisions;
- reference tables read-only for ordinary operational users;
- administrative/master-data changes restricted to approved roles;
- shipment classification verification restricted to an appropriate documented permission;
- no broad service-role/client-side privileged access.

Existing permission vocabulary should be reused where semantically correct; new permissions should only be proposed where an existing permission cannot safely represent the action.

## 12. SECURITY DEFINER qualification

A SECURITY DEFINER function is not automatically required for every new table.

For reference data, controlled direct access may be sufficient if RLS and privileges provide the required boundary.

For shipment classification creation/verification, a controlled RPC may be preferable if atomic authorization, audit logging and immutable verification semantics require it.

Any new SECURITY DEFINER function requires separate security review and explicit approval.

## 13. Migration sequence

If implementation is approved, the safe order is:

### Phase A — Foundation
1. final schema review;
2. authoritative production constraint/FK verification;
3. key/uniqueness/check constraint review;
4. RLS policy design;
5. permission mapping.

### Phase B — Reference model
6. create classification system;
7. create jurisdictions;
8. create editions;
9. create classification records;
10. establish controlled reference-data population process.

### Phase C — Product model
11. create product hierarchy;
12. map verified existing commodities;
13. establish product/classification mappings.

### Phase D — Shipment integration
14. create shipment cargo classification;
15. define controlled create/update/verify workflow;
16. add audit coverage;
17. preserve legacy HS values.

### Phase E — Application
18. expose product/sub-commodity selection;
19. expose classification context;
20. show suggested vs verified status;
21. add review/validation indicators;
22. reconcile relevant documents.

### Phase F — Verification
23. test with existing shipments;
24. test historical preservation;
25. test unauthorized access;
26. test document mismatch detection;
27. test rollback/recovery;
28. review before production deployment.

## 14. Existing production data

No production data should be automatically classified or remapped during initial implementation.

Particularly:

- shipment 1 cargo remains unchanged;
- shipment 2 cargo line 2 remains unchanged until the separately approved correction workflow is implemented;
- current HS values remain intact;
- no inferred sub-commodity assignment should be inserted.

## 15. Explicitly deferred

Not part of this schema qualification:

- automatic customs/legal classification;
- external tariff API integration;
- AI classification;
- DG/OOG/reefer domain implementation;
- equipment requirements;
- multi-seal;
- multiple notify parties;
- shipment-specific address architecture.

## 16. Implementation gate

This document establishes an **implementation-ready proposal**, not authorization to modify production.

Required status:

**APPROVED DOMAIN SPECIFICATION → QUALIFIED SCHEMA DESIGN → OWNER APPROVAL FOR IMPLEMENTATION → IMPLEMENTED → VERIFIED**

Before implementation approval, the exact table names, constraints, FK actions, status/reference strategy, permissions and migration SQL must be reviewed as a single controlled package.

**No production schema or data change is authorized by this document.**
