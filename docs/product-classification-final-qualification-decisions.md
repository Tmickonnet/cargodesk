# Product & Classification Final Qualification Decisions

**Status:** PROPOSED — FINAL DESIGN DECISIONS  
**Production changes:** NONE

## Verified decisions

### 1. Lifecycle status representation

The existing CargoDesk database commonly models business lifecycle states with dedicated status reference tables, but the proposed classification domain has several small, domain-specific lifecycle vocabularies.

For the first implementation, classification lifecycle status will remain a controlled VARCHAR code with CHECK constraints rather than adding additional status tables beyond the approved seven-table model.

Reference lifecycle:
- ACTIVE
- SUPERSEDED
- RETIRED

Shipment classification lifecycle:
- SUGGESTED
- UNDER_REVIEW
- VERIFIED
- REJECTED
- SUPERSEDED

This keeps the seven-table model bounded. If the lifecycle becomes independently administered later, a dedicated reference table can be proposed separately.

### 2. Verification status

The existing `verification_statuses` reference table was inspected and contains:
- PENDING
- VERIFIED
- REQUIRES_CORRECTION
- REJECTED

This is a useful existing document/record verification vocabulary, but it does not represent the complete shipment-classification lifecycle because it has no SUGGESTED, UNDER_REVIEW or SUPERSEDED states.

Therefore it should not be forced onto shipment_cargo_classification as a substitute for its lifecycle status.

### 3. Active product-classification uniqueness

The implementation should prevent duplicate active mappings without preventing historical mappings.

The preferred mechanism is a partial unique index on product_id + classification_record_id for rows whose status_code = ACTIVE.

This is an intentional, narrowly justified index rather than blanket foreign-key indexing.

### 4. Shipment-cargo classification uniqueness

A cargo line may legitimately have more than one historical classification record over time, but it should have only one current VERIFIED classification for a given active classification context.

The exact uniqueness rule must include the classification jurisdiction/system context rather than simply enforcing one classification row per cargo line. This avoids blocking legitimate multi-jurisdiction classification.

### 5. Verification authority

CARGO_EDIT currently covers operational cargo editing and is assigned to Data Entry Officer, Logistics Administrator, Operations Officer and System Administrator.

Verification is a higher-integrity action. It should not automatically be granted to every CARGO_EDIT holder.

A dedicated SHIPMENT_CLASSIFICATION_VERIFY permission is therefore PROPOSED, but it must not be created or assigned until explicitly approved.

This is a material RBAC decision.

### 6. Master-data management authority

MASTER_DATA_CREATE and MASTER_DATA_EDIT already exist but currently have no role mappings.

No role mapping should be added automatically.

The product/classification reference tables may therefore initially be structurally created with no operational write path until an owner-approved master-data authority is established.

### 7. Audit events

Current audit history contains SHIPMENT_CARGO_CREATED but no existing product/classification audit event vocabulary.

Proposed new events:
- PRODUCT_CREATED
- PRODUCT_UPDATED
- CLASSIFICATION_REFERENCE_CREATED
- CLASSIFICATION_REFERENCE_UPDATED
- PRODUCT_CLASSIFICATION_CREATED
- SHIPMENT_CARGO_CLASSIFICATION_CREATED
- SHIPMENT_CARGO_CLASSIFICATION_VERIFIED
- SHIPMENT_CARGO_CLASSIFICATION_REJECTED
- SHIPMENT_CARGO_CLASSIFICATION_SUPERSEDED

These are proposed only. No audit behavior is being implemented yet.

### 8. SECURITY DEFINER

No new SECURITY DEFINER function is required merely to create the schema.

Classification verification may require a controlled RPC if atomic state transition plus audit cannot be safely achieved under normal RLS. That decision remains separate.

### 9. Historical preservation

Existing:
- commodities.hs_code
- shipment_cargo.hs_code
- commercial_invoice_details.hs_code
- certificate_of_origin_details.hs_code

remain unchanged.

No backfill is authorized.

### 10. Cargo line 2

Cargo line 2 remains untouched. The previously identified business-data correction remains a separate operational correction task.

## Remaining owner decisions before implementation

Two material decisions remain:

1. Approve or reject creation of SHIPMENT_CLASSIFICATION_VERIFY and its role mappings.
2. Approve or reject operational master-data write authority for the new product/classification reference tables, including whether existing MASTER_DATA_CREATE/MASTER_DATA_EDIT should receive role mappings.

Until those decisions are made, the implementation package must not grant new write authority.

## Gate

**PROPOSED → QUALIFIED → OWNER RBAC APPROVAL REQUIRED → IMPLEMENTED → VERIFIED**

No production changes have been made.
