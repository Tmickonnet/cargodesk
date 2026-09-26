# SEC-199 — Controlled Document Status Transition Qualification

## Status

PROPOSED → QUALIFIED FOR CONTROLLED IMPLEMENTATION

This document records the next evidence-supported operational mutation candidate after SEC-198.

## Evidence basis

- Production contains the existing controlled function `logistics.request_document_transition(bigint, text, text)`.
- The function requires authentication and an active CargoDesk user.
- Supported transition codes are `SUBMIT`, `START_REVIEW`, `APPROVE`, `REJECT`, and `ISSUE`.
- The function enforces the existing lifecycle:
  - `DRAFT → SUBMITTED`
  - `SUBMITTED → UNDER_REVIEW`
  - `UNDER_REVIEW → APPROVED`
  - `UNDER_REVIEW → REJECTED`
  - `APPROVED → ISSUED`
- Required permissions are enforced by the database function:
  - `DOCUMENT_EDIT` for SUBMIT
  - `DOCUMENT_VERIFY` for START_REVIEW, APPROVE, REJECT, and ISSUE
- REJECT requires a non-blank reason; supplied reasons are limited to 2000 characters.
- The function locks the target document row, performs the status update, and inserts the corresponding audit event atomically.
- Direct application table writes must remain absent; the controlled RPC is the intended mutation boundary.
- Existing production data currently contains 12 documents in `DRAFT` and none in the other lifecycle states.
- The existing Documentation workspace is read-only and uses `DOCUMENT_VIEW`.
- Existing authorization is permission-based and should be reused without role-name logic.

## Selected scope

The first controlled document mutation candidate is **SUBMIT: DRAFT → SUBMITTED**.

This is intentionally narrower than implementing the complete document lifecycle. Qualification of SUBMIT does not authorize START_REVIEW, APPROVE, REJECT, ISSUE, AMEND, CANCEL, EXPIRE, upload, or any unrelated mutation.

## Controlled application scope

A future frontend implementation may add a narrowly scoped document-action surface to the existing Documentation workspace.

### Read path

Continue using the existing `DOCUMENT_VIEW` authorization boundary and existing approved document fields.

### Write path

The frontend must call only:

```js
supabase.rpc("request_document_transition", {
  p_document_id,
  p_transition_code: "SUBMIT",
  p_reason
})
```

For SUBMIT, `p_reason` may be null because the database contract does not require a reason for this transition.

The frontend must not:
- update `documents` directly;
- insert audit rows;
- alter document-status IDs directly;
- introduce a second transition function;
- infer authorization from role names.

### UI authorization

- Workspace/read visibility remains `DOCUMENT_VIEW`.
- SUBMIT action visibility/enabled state requires `DOCUMENT_EDIT`.
- Authorization failures fail closed.
- A document must be displayed as `DRAFT` before SUBMIT is offered.
- Non-DRAFT documents must not expose the SUBMIT action.

### Client validation

Before RPC submission:
- document identifier must be a positive integer;
- selected document must currently be `DRAFT`;
- transition code is fixed to `SUBMIT`;
- no client-generated status ID is accepted.

The database remains authoritative and must revalidate the lifecycle state and permission.

## Audit contract

The frontend must not create audit records.

The database transition function remains responsible for the lifecycle audit event:

`DOCUMENT_STATUS_SUBMITTED`

The application must not manufacture a success message unless the RPC returns success.

## Testing boundary

### Safe tests without production-data manufacture

1. Documentation read-path authorization and loading.
2. SUBMIT action visibility only for DRAFT documents and authorized users.
3. Client-side stale-state guard when a selected document is no longer DRAFT.
4. RPC wiring inspection confirming only `request_document_transition(..., 'SUBMIT', ...)` is used.
5. Existing non-DRAFT state can be used for a negative transition test if an appropriate record exists later.
6. Build, deployment, and runtime verification.

### Production mutation boundary

A successful DRAFT → SUBMITTED test changes production document state and therefore requires an existing legitimately testable DRAFT document or separate explicit approval for controlled test-data use.

The current database contains 12 DRAFT documents, but their suitability for mutation testing must be established before any production transition is executed. Their existence alone is not authorization to modify them.

No production document will be submitted merely to obtain a green test.

## Explicit exclusions

SEC-199 does not authorize:

- new tables;
- new columns;
- new permissions;
- role changes;
- RLS changes;
- direct table write grants;
- new SECURITY DEFINER functions;
- changes to SEC-197 or SEC-198;
- START_REVIEW, APPROVE, REJECT, ISSUE implementation;
- document amendment/cancellation/expiration implementation;
- document upload/storage mutation implementation;
- production test-data creation;
- automatic shipment, booking, delivery, or tracking side effects.

## Implementation gate

The next implementation, if approved, is a frontend-only controlled SUBMIT action using the already-existing database contract.

No database migration is required for this qualification or its intended frontend implementation.

## Verification target

A future SEC-199 implementation is complete only when:

1. the SUBMIT action is permission-gated by `DOCUMENT_EDIT`;
2. only DRAFT documents expose SUBMIT;
3. the application invokes only `request_document_transition(..., 'SUBMIT', ...)`;
4. direct table writes remain absent;
5. the existing database lifecycle and audit contract remain unchanged;
6. build succeeds;
7. preview/production deployment is READY;
8. runtime verification reports no relevant errors;
9. any production DRAFT → SUBMITTED mutation is explicitly recorded as a separate controlled test result;
10. no other document lifecycle transition is implicitly marked implemented.

## Relationship to SEC-198

SEC-198 remains independently pending its authenticated RPC negative-path qualification and legitimate successful mutation-path test.

SEC-199 is a separate qualification track and does not close, weaken, or bypass the SEC-198 verification boundary.
