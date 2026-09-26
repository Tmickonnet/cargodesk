# Commodity, Sub-Commodity & Jurisdictional Classification Model

Status: PROPOSED → QUALIFIED → AWAITING IMPLEMENTATION APPROVAL

## Purpose

Define a future-proof commodity and customs-classification model for CargoDesk Global without changing the existing production foundation prematurely.

## Verified current state

- `logistics.commodity_categories` provides broad commodity categories.
- `logistics.commodities` is currently a single-level commodity master.
- Production currently contains one commodity: `SOYBEANS` / `Soybean Beans`, with master `hs_code = 1201`.
- `logistics.shipment_cargo` stores a shipment-specific `hs_code`.
- No dedicated classification, tariff, classification-version, or commodity-hierarchy tables currently exist.
- Shipment cargo retains its own classification value, which is useful for preserving historical shipment records.

## Proposed conceptual hierarchy

Commodity Category
→ Commodity Family
→ Specific Product / Sub-commodity
→ Product Characteristics (only when relevant)
→ Classification System
→ Jurisdiction / Customs Territory
→ Classification Edition / Version
→ Classification Code
→ Effective Dates
→ Verification Status

Example:

Agricultural
→ Soybeans
→ Soybean Meal
→ relevant characteristics
→ HS / applicable regional system
→ destination jurisdiction
→ applicable edition
→ current code
→ effective period
→ Suggested / Confirmed / Superseded

## Classification principles

1. Never treat one HS code as permanently attached to a product.
2. Support the international HS foundation and jurisdiction-specific extensions.
3. Store classification versions/effective periods so historical shipments are not rewritten when classifications change.
4. Separate system suggestions from human-confirmed shipment classifications.
5. Preserve the classification actually used on historical cargo records.
6. Do not silently replace an existing shipment classification because master data changed.
7. Classification automation should assist and suggest; it should not silently make an irreversible customs/legal determination.
8. Where classification depends on product characteristics, collect only the characteristics relevant to that classification.
9. Source/reference information and verification status should be retained for classification reference data.
10. Existing production structures should remain intact during the initial implementation.

## Proposed reference capabilities

A future implementation may require isolated reference structures for:

- commodity/product hierarchy;
- classification systems;
- jurisdictions/customs territories;
- classification editions/versions;
- product-to-classification mappings;
- classification status/history.

Exact table names, keys, constraints, RLS, permissions, and migration strategy remain to be designed and separately approved.

## Cargo-entry UX

User-facing terminology should be operational rather than database-oriented:

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

Classification UX should guide the user:

Commodity Family
→ Specific Product
→ Destination/Jurisdiction
→ Suggested Classification
→ Review
→ Confirm

## Current production cargo line 2

No production mutation is authorized by this document.

The intended correction supplied by the project owner remains:

- Quantity: 20
- Quantity Unit: BAG
- Net Weight: 439.500 MT
- Gross Weight: 439.580 MT

The cargo line should not be corrected until the commodity/product identity and classification treatment are sufficiently established.

## Implementation boundary

This document is a design/qualification artifact only.

It does not:

- create tables;
- alter columns;
- alter PK/FK constraints;
- alter RLS/RBAC;
- create SECURITY DEFINER functions;
- modify production data;
- change existing commodity records;
- change shipment cargo;
- deploy application code.

Implementation requires a separate approved change plan with migration, security, compatibility, test, rollback, and verification evidence.

## Recommended next phase

1. Approve the detailed reference-data design.
2. Define exact tables/relationships and migration compatibility.
3. Qualify RLS/RBAC and authenticated access requirements.
4. Build reference data without changing historical shipment data.
5. Add controlled classification selection/suggestion to cargo entry.
6. Add shipment-level confirmed classification linkage only after qualification.
7. Verify historical preservation.
8. Then handle the pending cargo-line correction through a controlled correction workflow.
