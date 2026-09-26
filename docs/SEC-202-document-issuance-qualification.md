# SEC-202 — Controlled Document Issuance Qualification

Status: **PROPOSED → QUALIFIED FOR CONTROLLED IMPLEMENTATION**

## Scope

Controlled transition only:

**APPROVED → ISSUED**

Existing database transition contract:
`request_document_transition(p_document_id, p_transition_code, p_reason)`

Issuance uses `ISSUE` and requires `DOCUMENT_VERIFY`.

## Production evidence

- The existing `logistics.request_document_transition(bigint,text,text)` function is present and SECURITY DEFINER with controlled search_path.
- The function accepts `ISSUE`.
- `ISSUE` is permitted only when the current document status is `APPROVED`.
- `ISSUE` requires `DOCUMENT_VERIFY`.
- The target status is `ISSUED`.
- The audit action is `DOCUMENT_STATUS_ISSUED`.
- The database locks the target document, performs the status update, and inserts the audit record atomically.
- Document status ID 4 is `APPROVED`; status ID 5 is `ISSUED`.
- Current production state contains exactly 1 APPROVED document and 11 DRAFT documents.
- Document 4 is the known APPROVED document following the verified SEC-201 controlled transition.
- Direct authenticated UPDATE on `logistics.documents` remains absent.
- Direct authenticated INSERT on `logistics.audit_log` remains absent.
- No new database function, table, column, permission, role, grant, RLS policy, trigger, index, storage change, or production test data is required.

## Frontend contract

- Reuse the existing authorization adapter.
- Show Issue only for APPROVED rows and when `DOCUMENT_VERIFY` is granted.
- Validate positive document ID and current APPROVED state.
- Call only:

```js
supabase.rpc("request_document_transition", {
  p_document_id,
  p_transition_code: "ISSUE",
  p_reason: null,
})
```

- Require `allowed=true` and `new_status_code="ISSUED"`.
- Do not directly update the document.
- Do not insert an audit record from the frontend.
- Fail closed while authorization is loading.
- After successful issuance, refresh the authoritative documentation state rather than retaining a stale APPROVED representation.

## Controlled production mutation gate

Issuance of Document 4 requires:

1. Successful implementation and deployment verification.
2. Authenticated UI verification that Issue is visible for Document 4.
3. A fresh read-only production check confirming Document 4 remains APPROVED.
4. Explicit owner authorization to issue Document 4.
5. Post-mutation verification of:
   - Document 4 = ISSUED.
   - `updated_at` corresponds to the transition.
   - audit action = `DOCUMENT_STATUS_ISSUED`.
   - audit record identifies Document 4.
   - no reversal.

## Explicit exclusions

No other document transition, rejection, amendment, cancellation, expiration, upload/storage operation, schema/security change, test-data creation, or unrelated operational mutation is included.

## Current verification boundary

Qualification does not perform the production ISSUE mutation. The APPROVED state of Document 4 is preserved until the implementation and explicit mutation gates are satisfied.
