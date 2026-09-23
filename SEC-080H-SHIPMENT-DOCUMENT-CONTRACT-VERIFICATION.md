# SEC-080H Shipment-Document Contract Verification

Status: **VERIFIED — READ-ONLY CONTRACT SAFE; LIFECYCLE INDETERMINACY PRESERVED**

## Purpose

Verify that the readiness adapter can consume the actual shipment-to-document relationship without inventing a `documents.shipment_id` field or bypassing protected lifecycle status.

## Verified Source Shape

The live schema establishes:

`shipment_documents.shipment_id`
→ `shipment_documents.document_id`
→ `documents.document_id`
→ `documents.document_status_id`

The adapter accepts the already-authorized document records after the legitimate relationship query has been performed by its caller.

It does not add or assume `shipment_id` on a document evidence object.

## Deterministic Contract Test

A fixture representing shipment `CDG-SHP-2026-0001` with a shipment-linked document was added.

Where only `document_status_id` is available and the authoritative `document_statuses.status_code` cannot be read legitimately:
- evidence status becomes `UNKNOWN`;
- verification becomes `null`;
- the adapter does not fabricate a lifecycle state;
- the interpreter returns `REVIEW_REQUIRED` when that evidence is required.

This verifies the intended fail-safe chain:

`protected lifecycle status`
→ `UNKNOWN / indeterminate`
→ `REVIEW_REQUIRED`

## Existing Test Coverage

The adapter tests now cover:
- explicit applicability only;
- DRAFT / UNDER_REVIEW / ISSUED lifecycle semantics when an authoritative status code is supplied;
- unavailable lifecycle status;
- actual shipment-document relationship shape;
- propagation of unresolved lifecycle status into the interpreter;
- rule-supplied required evidence;
- preserved exception state;
- absence of fabricated POD evidence.

## Integrity

No source record is changed.
No status is promoted.
No protected table is accessed through a bypass.
No new permission, grant, SECURITY DEFINER function, RLS policy, schema object, or database migration is introduced.

The test shipment remains unchanged.

## Gate Result

The adapter/interpreter contract is now **verified at the transformation and fail-safe boundary**.

This does **not** authorize production UI integration because the authoritative document lifecycle status remains protected and unresolved through the existing application boundary.

The next step, if continued, should therefore be limited to a final static review of the adapter/interpreter contract and test coverage. UI integration remains suspended unless the existing security boundary legitimately supplies the required lifecycle status.
