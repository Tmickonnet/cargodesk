# SEC-201 — Controlled Document Approval Qualification

Status: **PROPOSED → QUALIFIED FOR CONTROLLED IMPLEMENTATION**

## Scope

Controlled transition only:

**UNDER_REVIEW → APPROVED**

Existing database transition contract:
`request_document_transition(p_document_id, p_transition_code, p_reason)`

Approval uses `APPROVE` and requires `DOCUMENT_VERIFY`.

## Production evidence

- Document 4 is currently UNDER_REVIEW following the verified SEC-200 transition.
- Existing transition function already implements APPROVE.
- The database remains authoritative for status transition and audit creation.
- No new database function, table, column, permission, role, grant, RLS policy, trigger, index, or storage change is required.
- No production test data is required.

## Frontend contract

- Reuse existing authorization adapter.
- Show Approve only for UNDER_REVIEW rows and when DOCUMENT_VERIFY is granted.
- Validate positive document ID and current UNDER_REVIEW state.
- Call only:

```js
supabase.rpc("request_document_transition", {
  p_document_id,
  p_transition_code: "APPROVE",
  p_reason: null,
})
```

- Require `allowed=true` and `new_status_code="APPROVED"`.
- Update local UI only after successful RPC.
- No direct document UPDATE.
- No frontend audit INSERT.
- Fail closed during authorization loading.

## Production mutation gate

Approval of Document 4 requires explicit owner authorization after deployment and authenticated UI verification.

After successful mutation, verify:
- Document 4 = APPROVED.
- `updated_at` corresponds to the transition.
- Audit action = `DOCUMENT_STATUS_APPROVED`.
- Audit record identifies Document 4.
- No reversal is performed.

## Exclusions

No other document transition, upload/storage change, schema/security change, test-data creation, or unrelated operational mutation is included.
