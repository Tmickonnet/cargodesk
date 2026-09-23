# SEC-080H Existing Document-Status Mechanism Resolution

Status: **VERIFIED — NO EXISTING READ-ONLY DOCUMENT-STATUS RESOLUTION PATH FOUND**

## Scope

This gate examined only whether CargoDesk already contains a legitimate application/database mechanism that can translate the existing `documents.document_status_id` into the authoritative `document_statuses.status_code` without changing security boundaries.

## Verified Findings

### Application layer

The existing application authorization path consists of:
- Supabase authentication/session state;
- `current_user_role()`;
- `has_permission(requested_permission)`;
- fail-closed permission handling.

The current application does not contain an existing readiness data-query layer or a document-status lookup adapter that could be reused for this purpose.

Repository searches also found no existing application query pattern for `shipment_documents` or `document_status_id`.

### Database layer

The authoritative document lifecycle structure is:
- `shipment_documents.shipment_id`
- `shipment_documents.document_id`
- `documents.document_id`
- `documents.document_status_id`
- `document_statuses.document_status_id`
- `document_statuses.status_code`

Authenticated direct SELECT is available for `documents` and `shipment_documents`.

Authenticated direct SELECT is **not** available for `document_statuses`.

The existing document-related routines are:
- `authorize_document_upload`
- `create_document_version`
- `request_document_amendment`
- `request_document_cancellation`
- `request_document_expiration`
- `request_document_transition`

They are authenticated-executable SECURITY DEFINER document lifecycle mechanisms. None is an existing read-only status-resolution mechanism for readiness interpretation. They must not be repurposed for that purpose.

The private storage access function is likewise a storage authorization mechanism, not a document-status lookup mechanism.

## Decision

**No existing legitimate read-only mechanism was found that can safely resolve `document_status_id → status_code` for the readiness adapter.**

Therefore:
1. Do not weaken RLS.
2. Do not grant direct access to `document_statuses`.
3. Do not create or repurpose a SECURITY DEFINER function merely for this feature.
4. Do not use service-role credentials in the client.
5. Do not infer lifecycle status from other fields.
6. Keep unavailable lifecycle status as `UNKNOWN` / indeterminate.
7. The readiness interpreter must return `REVIEW_REQUIRED` when lifecycle status is materially required but cannot be legitimately resolved.

## R6 Gate

R6 is now **bounded and safely unresolved**, rather than silently implemented.

This does not block further non-mutating architectural documentation or unit-level work. It does block production-ready readiness integration where authoritative document lifecycle status is a required decision input.

## Test Shipment

`CDG-SHP-2026-0001` remains unchanged.

No production data, schema, RLS, RBAC, permissions, audit structures, POD access, status, or deployment state was modified.

## Next Controlled Gate

The next useful milestone is **adapter/interpreter contract verification against the actual shipment-document relationship**, including a deterministic test fixture using the already-readable `shipment_documents` shape while deliberately leaving lifecycle status unresolved.

No UI integration should begin until that contract is verified.
