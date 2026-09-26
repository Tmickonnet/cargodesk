# Product & Classification Read Authorization Decision

**Status:** PROPOSED — IMPLEMENTATION DECISION

## Decision

Use the existing permissions rather than introducing a new `CLASSIFICATION_VIEW` permission in the first implementation.

### Reference/master classification data

Use:

`MASTER_DATA_VIEW`

This covers read access to product, classification-system, jurisdiction, edition and classification-record reference data.

### Shipment-specific classification

Use:

`CARGO_VIEW`

Shipment-specific classification belongs to the cargo workspace and follows the existing cargo read boundary.

### Verification

Use the dedicated:

`SHIPMENT_CLASSIFICATION_VERIFY`

No existing permission is reused for the verification action.

## Reason

Creating a separate read permission would expand RBAC without a demonstrated operational need. The existing permission vocabulary already provides two meaningful boundaries:

- master/reference data;
- shipment cargo data.

A dedicated permission is justified for verification because verification is a distinct integrity-sensitive action.

## Explicitly deferred

A future `CLASSIFICATION_VIEW` permission may be introduced if classification becomes a standalone operational module requiring a distinct read boundary. That is not necessary for the first implementation.

## Scope protection

This decision does not authorize production changes by itself.

Next gate:

**PROPOSED → EXECUTABLE MIGRATION REVIEW → APPROVAL → IMPLEMENTED → VERIFIED**
