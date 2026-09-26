# Controlled Shipment Cargo Creation — Qualification

## Status
PROPOSED → READ-ONLY INSPECTED → VERIFIED → APPROVED → IMPLEMENTED ON BRANCH → PENDING PREVIEW VERIFICATION

## Scope
Introduce one controlled cargo-line creation workflow using the existing `logistics.shipment_cargo` table and existing `CARGO_EDIT` authorization.

## Preserved controls
- No shipment_cargo table/column changes.
- No direct authenticated INSERT/UPDATE privilege.
- Existing RLS policies remain the authorization boundary.
- Existing `CARGO_EDIT` permission is reused.
- Existing `CARGO_VIEW` read path is preserved.
- No new role or permission.
- No production cargo data is inserted during qualification.
- Cargo creation writes its audit entry atomically.
- Function is SECURITY DEFINER with controlled search_path and authenticated-only EXECUTE.

## Existing schema verified
`shipment_cargo` already contains:
shipment_cargo_id, shipment_id, commodity_id, cargo_description, hs_code, packaging_type_id, quantity, quantity_uom_id, net_weight, gross_weight, weight_uom_id, volume, volume_uom_id, marks_and_numbers, lot_number, production_date, expiry_date, created_at, updated_at.

Existing foreign keys reference shipments, commodities, packaging_types, and unit_of_measures. Existing weight non-negative check is preserved.

## Existing production state before implementation
- shipment_cargo contains 1 existing cargo line for shipment 1.
- Shipment CDG-SHP-2026-0002 has no cargo line yet.
- No cargo audit history existed before this implementation.
- Direct authenticated shipment_cargo table write privilege remains absent.

## Controlled RPC
`logistics.create_shipment_cargo(...)`

The RPC:
1. Requires authenticated Supabase identity.
2. Resolves the application user.
3. Requires `CARGO_EDIT`.
4. Validates shipment and active reference records.
5. Rejects negative quantity/weight/volume values.
6. Generates the cargo-line ID under a transaction advisory lock because the existing table does not have a default ID generator.
7. Inserts one cargo line.
8. Writes `SHIPMENT_CARGO_CREATED` to audit_log in the same transaction.
9. Returns the authoritative created cargo identifiers/timestamps.
10. Revokes PUBLIC/anon execution and grants EXECUTE only to authenticated.

## Frontend
`ShipmentCargoWorkspace.jsx` provides:
- shipment selection;
- authorized reference-data loading;
- cargo-line entry;
- controlled RPC submission;
- authoritative reload after creation;
- existing cargo-line readback;
- fail-closed handling when RPC response is invalid.

## Production mutation
None performed during qualification. Production migration requires explicit approval after branch/preview verification.
