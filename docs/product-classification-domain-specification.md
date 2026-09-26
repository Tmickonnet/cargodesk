# CargoDesk Product, Commodity & Classification Domain Specification

**Status:** PROPOSED — DESIGN ONLY  
**Baseline:** main @ 28eebe12a4117c276579983badf7e1c1db68e459  
**Scope:** Product/sub-commodity identity and jurisdictional classification  
**Production schema/data changes:** NONE

## 1. Purpose

This specification defines the proposed domain model for separating:

1. commodity/product identity;
2. product or sub-commodity hierarchy;
3. classification systems;
4. jurisdiction;
5. classification editions/versions;
6. classification records; and
7. shipment-specific classification decisions.

The objective is to strengthen CargoDesk without breaking the established 90-table production foundation.

## 2. Verified current foundation

Production currently provides:

- `commodity_categories`: broad commodity categories;
- `commodities`: commodity code/name, category, optional legacy/default HS code, default UOM, description and active state;
- `shipment_cargo`: commodity reference plus shipment-specific cargo description, HS code, packaging, quantity/UOM, weights/UOMs, volume/UOM, marks, lot and dates;
- classification-related HS fields also exist in commercial/document detail domains.

No dedicated production tables were identified for product/sub-commodity hierarchy, classification systems, classification jurisdictions, tariff/classification editions, or classification history.

## 3. Design principles

### 3.1 Preserve existing data

The existing `commodities.hs_code` and `shipment_cargo.hs_code` fields must not be deleted, renamed or repurposed as part of this design.

### 3.2 Product identity is not classification

A product such as Soybean Beans is a business/product identity. Its HS/classification code is a separate classification decision.

### 3.3 Classification is contextual

A classification record must be capable of identifying its classification system, jurisdiction and applicable edition/version.

### 3.4 Historical records must remain intelligible

A future tariff/classification change must not silently rewrite a historical shipment's classification.

### 3.5 Suggestions are not decisions

CargoDesk may eventually provide a classification suggestion, but a suggested classification must not automatically become a human-verified classification.

### 3.6 Enter once, reuse

The shipment cargo classification should become a reusable source for relevant downstream validation while document-specific records remain authoritative for their own document lifecycle.

## 4. Proposed logical entities

### 4.1 Product / Sub-commodity

Purpose: represent the actual commercial/physical product independently of classification.

Candidate attributes:

- product ID
- parent product/family where hierarchy is required
- product code
- product name
- description
- active status
- effective dates

Example hierarchy:

```
Soybeans
├── Soybean seed
├── Soybean beans
├── Soybean meal
└── Soybean oil
```

The exact relationship to the existing `commodities` table requires approval before implementation.

### 4.2 Classification System

Represents the system under which a code is interpreted.

Examples may include HS and jurisdiction-specific implementations, but actual reference data must come from authoritative sources before production loading.

### 4.3 Classification Jurisdiction

Represents the country, customs territory or other jurisdiction for which a classification context applies.

### 4.4 Classification Edition / Version

Represents the applicable edition/version and effective period.

This is necessary so that a historical shipment can remain associated with the classification context that was applicable when it was processed.

### 4.5 Classification Record

Candidate attributes:

- classification ID
- classification system
- jurisdiction
- edition/version
- classification code
- official description
- effective from
- effective to
- status
- source/reference

### 4.6 Shipment Classification

Represents the classification actually associated with a shipment cargo line.

It should preserve enough context to answer:

- what product was classified;
- which classification system was used;
- which jurisdiction applied;
- which edition/version applied;
- what code was recorded;
- what description applied;
- whether it was verified;
- who verified it;
- when it was verified;
- what source supported it.

## 5. Proposed workflow

```
Commodity Family
      ↓
Product / Sub-commodity
      ↓
Product characteristics
      ↓
Classification context
(system + jurisdiction + edition)
      ↓
Classification suggestion/reference
      ↓
Human review
      ↓
Verified shipment classification
```

A classification suggestion must never silently overwrite a human-confirmed value.

## 6. Relationship to existing shipment_cargo

The existing shipment cargo line remains the operational anchor.

The future design should extend it without breaking existing records.

Existing fields remain meaningful:

- `commodity_id`
- `cargo_description`
- `hs_code`
- quantity/UOM
- net/gross weight/UOM
- volume/UOM
- packaging
- lot/date information.

A future classification relationship should complement these fields rather than immediately remove them.

## 7. Cross-document consistency

Relevant document details may contain their own classification values.

Future review logic should be able to identify:

- matching classification;
- missing classification;
- conflicting classification;
- classification verified against the applicable edition.

This should produce:

- **Error:** required classification missing;
- **Warning:** document classification differs from shipment cargo;
- **Information:** classification verified against applicable context.

The validation must not silently rewrite document records.

## 8. Existing cargo line 2

The currently identified production cargo discrepancy remains unchanged by this specification.

The intended correction previously supplied by the owner is:

- Quantity: 20
- Quantity Unit: BAG
- Net Weight: 439.500 MT
- Gross Weight: 439.580 MT

No production mutation is authorized by this document.

## 9. Security and authorization implications

Any eventual implementation must preserve:

- RLS on all new exposed tables;
- existing permission model;
- least-privilege access;
- controlled writes where required;
- no broad authenticated INSERT/UPDATE grants merely to simplify the UI;
- controlled SECURITY DEFINER functions only where justified and explicitly reviewed;
- historical classification records protected from casual modification.

The new model must not bypass the existing CargoDesk authorization architecture.

## 10. Migration principles

Implementation, if approved later, should be incremental:

1. create only the minimum required reference/domain structures;
2. preserve existing production columns;
3. avoid destructive migration;
4. establish RLS and authorization before exposing new data;
5. migrate/associate existing data only after mapping is verified;
6. keep legacy values readable during transition;
7. test representative shipment/document relationships;
8. verify historical preservation;
9. only then consider deprecating redundant legacy fields.

No production migration is included in this specification.

## 11. Explicitly deferred

The following remain outside this specification's implementation scope:

- automated customs classification;
- external classification APIs;
- tariff data import;
- AI classification;
- dangerous-goods data model;
- reefer/OOG specialist models;
- SOC model;
- multi-seal model;
- multi-notify-party model;
- shipment-specific address model;
- equipment requirement model.

These may be separately qualified after the core product/classification model is approved.

## 12. Approval gate

This document is **PROPOSED only**.

Required progression:

**PROPOSED → APPROVED → IMPLEMENTED → VERIFIED**

No schema, production data, RLS, RBAC, function, storage or deployment change is authorized merely by this specification.
