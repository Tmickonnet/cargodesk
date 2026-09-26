# Product & Classification Schema Qualification — Verification Addendum

**Status:** VERIFIED READ-ONLY EVIDENCE  
**Related PR:** #55  
**Production changes:** NONE

## Authoritative FK verification

The earlier information_schema FK query returned an empty result unexpectedly. This was not accepted as evidence of missing relationships.

A direct PostgreSQL pg_constraint inspection subsequently verified the relevant production relationships:

- commodities.commodity_category_id → commodity_categories.commodity_category_id
- commodities.default_uom_id → unit_of_measures.uom_id
- shipment_cargo.commodity_id → commodities.commodity_id
- shipment_cargo.shipment_id → shipments.shipment_id with ON DELETE RESTRICT
- shipment_cargo.packaging_type_id → packaging_types.packaging_type_id
- shipment_cargo.quantity_uom_id → unit_of_measures.uom_id
- shipment_cargo.weight_uom_id → unit_of_measures.uom_id
- shipment_cargo.volume_uom_id → unit_of_measures.uom_id
- commercial_invoice_details.shipment_cargo_id → shipment_cargo.shipment_cargo_id
- commercial_invoice_details.commodity_id → commodities.commodity_id
- certificate_of_origin_details.commodity_id → commodities.commodity_id

This confirms that the existing CargoDesk foundation already provides direct links from shipment cargo to the commodity master and from commercial-invoice details to shipment cargo.

Certificate-of-origin and commercial-invoice details retain their own document-level HS values, which supports the proposed future cross-document reconciliation model without requiring those existing values to be replaced.

## Qualification consequence

No existing FK needs to be recreated, renamed, or repurposed for the proposed product/classification domain.

The implementation design should add new relationships alongside the existing foundation and preserve all existing links.

No production mutation was performed.
