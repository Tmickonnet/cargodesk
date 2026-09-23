# SEC-080H Adapter Review — Authorization Boundary and Source-Query Reconciliation

Status: **REVIEWED — INTEGRATION BOUNDARY VERIFIED; SOURCE-QUERY DEPENDENCY REMAINS**

## Authorization Boundary

The existing frontend authorization layer remains authoritative.

Verified application behavior:
- Supabase authentication establishes the session.
- `useAuthorization` obtains the role through `current_user_role()`.
- Permission checks delegate to `has_permission(requested_permission)`.
- Permission lookup errors fail closed.
- Navigation is exposed only when the existing permission check succeeds.
- The readiness adapter does not replace or duplicate these controls.

The adapter itself accepts already-authorized data and has no Supabase client dependency.

## Source Access Reconciliation

The live logistics schema confirms authenticated SELECT for:
- `shipments`
- `shipment_legs`
- `documents`
- `shipment_documents`
- `shipment_milestone`
- `tracking_event`
- `shipment_exception`

The following remain protected from authenticated direct SELECT:
- `proof_of_delivery`
- `proof_of_delivery_documents`
- `audit_log`
- `document_statuses`

This matters for R6: the authoritative `documents` record stores `document_status_id`, while the human-readable status code resides in `document_statuses.status_code`. Because `document_statuses` is not directly readable by authenticated users, the current application has no verified legitimate direct query shape that can translate `document_status_id` into the approved lifecycle code.

## Safety Correction

The adapter was tightened so that when a document lifecycle status code is unavailable, it produces:

- `status: UNKNOWN`
- `verified: null`

rather than treating the document as simply unverified.

This is important because the readiness interpreter maps an indeterminate evidence verification state to `REVIEW_REQUIRED`, whereas a false verification state could incorrectly produce `NOT_READY`.

A focused unit test was added for this condition.

## Source-Query Shape

The verified relationship for shipment-scoped documents is through `shipment_documents`:

`shipment_documents.shipment_id -> shipment_documents.document_id -> documents.document_id`

The adapter therefore does not assume that `documents` has a `shipment_id` column.

Shipment milestone and tracking-event source tables are also legitimately readable and contain `shipment_id`; however, no new query layer was introduced in this gate.

## Test Shipment Observation

The live test shipment remains:
- shipment status: `DELIVERED`;
- 3 shipment legs;
- all observed leg statuses: `PLANNED`;
- no actual departure/arrival timestamps;
- 1 resolved exception.

These records were only read for reconciliation and were not changed.

## Gate Result

**AUTHORIZED BOUNDARY: VERIFIED**

**SOURCE SHAPE: VERIFIED**

**R6 LIFECYCLE RESOLUTION: BLOCKED BY EXISTING ACCESS BOUNDARY**

The blocker is not a security defect and does not justify weakening RLS or adding a bypass.

The next legitimate option is to determine whether an already-existing authorized application mechanism can expose document status safely. If none exists, R6 must remain indeterminate and readiness must fail safely to `REVIEW_REQUIRED` rather than introducing a new security mechanism solely for this feature.

No UI integration, schema change, permission change, RLS change, SECURITY DEFINER change, POD access, audit change, status mutation, data correction, merge, or deployment is authorized by this gate.
