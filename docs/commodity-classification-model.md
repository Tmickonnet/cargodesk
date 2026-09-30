# Commodity, Sub-Commodity & Jurisdictional Classification Model

Status: PROPOSED → QUALIFIED → FOUNDATION IMPLEMENTED → FUTURE ENHANCEMENTS AWAITING SEPARATE APPROVAL

## Purpose

Define the future-proof commodity and customs-classification direction for CargoDesk Global while preserving the existing production foundation and preventing premature or duplicate implementation.

This document is a design/qualification artifact. It does not authorize production data correction, new schema work, or automatic customs/legal classification.

## Reconciled current state

The classification foundation described by the original proposal has subsequently been implemented and is present in the current `main` branch.

The implemented reference structures include:

- `logistics.product` — product/sub-product hierarchy, including `parent_product_id`;
- `logistics.classification_system` — classification-system master;
- `logistics.classification_jurisdiction` — jurisdiction/customs-territory reference;
- `logistics.classification_edition` — versioned classification editions with effective dates;
- `logistics.classification_record` — classification codes/descriptions within an edition and jurisdiction;
- `logistics.product_classification` — product-to-classification mappings with effective periods and status;
- `logistics.shipment_cargo_classification` — shipment-specific classification with immutable snapshot fields and explicit workflow status.

The existing `logistics.shipment_cargo` structure also retains the shipment cargo `hs_code` value. Existing shipment cargo records must not be silently rewritten because reference classifications change.

Therefore, the earlier statement that no dedicated classification or commodity-hierarchy structures exist is historical and is superseded by the implemented foundation.

## Implemented conceptual model

The current foundation supports the following conceptual path:

Commodity/Product hierarchy
→ Product
→ Classification System
→ Jurisdiction
→ Classification Edition / Version
→ Classification Record / Code
→ Product-to-Classification Mapping
→ Shipment Cargo Classification Snapshot
→ Controlled Review / Verification

The implemented model deliberately separates reference classification data from the classification snapshot attached to shipment cargo.

## Classification principles

1. Never treat one HS code as permanently attached to a product.
2. Support the international HS foundation and jurisdiction-specific extensions.
3. Preserve classification editions/effective periods so historical shipment classifications are not silently rewritten.
4. Separate system suggestions from human-confirmed shipment classifications.
5. Preserve the classification actually used on historical cargo records.
6. Do not silently replace an existing shipment classification because reference data changes.
7. Classification automation should assist and suggest; it must not silently make an irreversible customs/legal determination.
8. Where classification depends on product characteristics, collect only characteristics relevant to the applicable classification decision.
9. Retain reference/source information and verification status where supported by the classification reference model.
10. Existing production structures and historical records remain protected during future enhancements.

## Implemented controlled workflow

The current application already provides a controlled classification proposal workflow for eligible shipment cargo.

The workflow includes:

- controlled selection of a product/sub-commodity;
- classification-system selection;
- edition selection;
- jurisdiction selection;
- classification-record selection;
- creation through the controlled shipment-classification RPC;
- explicit `SUGGESTED` state;
- controlled submission to `UNDER_REVIEW`;
- controlled verification through `SHIPMENT_CLASSIFICATION_VERIFY`;
- `VERIFIED` state with verifier identity/timestamp;
- classification snapshot fields retained on the shipment-specific record.

Reference-data visibility is permission-gated through `MASTER_DATA_VIEW`, while shipment classification visibility is governed through the existing cargo authorization boundary. Controlled write transitions remain database-authoritative.

The verified application path must not be interpreted as automatic real-world HS classification.

## Future enhancements — separately qualified work

The following remain future work unless separately designed, security-qualified, approved, implemented, and verified:

### 1. Product characteristics

Some classifications may depend on measurable or descriptive product characteristics. A generic characteristic framework has not been established merely by the current classification foundation.

### 2. Destination-aware suggestions

The current workflow provides controlled classification selection. It does not establish an automatic engine that determines a classification solely from commodity/product and destination.

### 3. Classification suggestion engine

Future automation may recommend candidate classifications using product identity, jurisdiction, edition, characteristics, and authoritative reference data.

Any such engine must remain advisory until a human-controlled verification step is completed where required.

### 4. Classification provenance and source evidence

The foundation provides source/reference fields where applicable. A complete operational provenance model for external tariff/customs sources remains a separately qualified requirement.

### 5. Classification history presentation

The data model preserves shipment-specific snapshots and statuses. A comprehensive user-facing classification-history experience remains future UI work if required.

### 6. Tariff/duty assessment

This document does not authorize tariff-rate, duty, tax, valuation, or customs-liability calculations. Those are separate domain capabilities requiring their own authoritative sources and qualification.

## Cargo-entry UX direction

User-facing terminology should remain operational rather than database-oriented:

- Quantity
- Quantity Unit
- Net Weight
- Weight Unit
- Gross Weight
- Cargo Volume
- Volume Unit
- Lot / Batch Number
- Production / Manufacturing Date
- Expiry / Best-Before Date (Optional)

The intended classification guidance remains:

Commodity Family
→ Specific Product
→ Destination / Jurisdiction
→ Suggested Classification
→ Review
→ Confirm

The UI must not imply that a suggested classification is a final customs/legal determination.

## Current production cargo line 2

No production mutation is authorized by this document.

The intended correction supplied by the project owner remains:

- Quantity: 20
- Quantity Unit: BAG
- Net Weight: 439.500 MT
- Gross Weight: 439.580 MT

This correction remains a separate controlled data-correction task. Classification design must not be used as a reason to perform an unqualified mutation of the existing cargo record.

## Implementation and security boundary

The current classification foundation already includes its own migration-backed schema, authorization, RLS, controlled workflow functions, and application integration.

Future changes must not duplicate those structures.

Any new classification capability requires a separate approved change plan covering:

- exact schema impact;
- migration compatibility;
- RLS/RBAC;
- authenticated access;
- SECURITY DEFINER boundaries where required;
- source/reference provenance;
- historical-data preservation;
- application compatibility;
- test and verification evidence;
- rollback/recovery strategy.

No direct browser table writes should be introduced where an existing controlled RPC is the authoritative mutation boundary.

## Recommended next phase

1. Treat the existing classification foundation as the baseline.
2. Reconcile any future design against the implemented tables and controlled workflow before proposing new schema.
3. Qualify the exact product-characteristics requirements, if needed.
4. Define destination/jurisdiction-aware suggestion requirements without silently assigning final classifications.
5. Design any automation as advisory and preserve explicit human verification.
6. Verify historical classification preservation.
7. Only after those requirements are separately approved should implementation work begin.
8. Handle the pending cargo-line correction through its own controlled correction workflow after the relevant cargo/product identity has been sufficiently established.

## Change boundary

This documentation update only reconciles the proposal with the now-existing classification foundation.

It does not:

- create or alter database tables;
- alter PK/FK constraints;
- alter RLS/RBAC;
- create SECURITY DEFINER functions;
- modify production data;
- change existing commodity records;
- change shipment cargo;
- change classification records;
- deploy application code;
- authorize automatic customs classification.
