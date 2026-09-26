# SEC-200 — Controlled Document Review Initiation Qualification

## Status
PROPOSED → QUALIFIED FOR CONTROLLED IMPLEMENTATION

## Scope
Controlled frontend implementation of the existing database transition:
SUBMITTED → UNDER_REVIEW.

## Verified database contract
- Existing function: `logistics.request_document_transition(bigint, text, text)`
- Authentication is required.
- Active CargoDesk user resolution is required.
- `START_REVIEW` is accepted only from `SUBMITTED`.
- Required permission: `DOCUMENT_VERIFY`.
- Target status: `UNDER_REVIEW`.
- Audit action: `DOCUMENT_STATUS_REVIEW_STARTED`.
- Database performs the document update and audit insertion atomically.
- The application must not directly update `documents` or insert into `audit_log`.

## Current production evidence
- 11 documents are currently DRAFT.
- Document 4 is SUBMITTED following the verified SEC-199 production qualification.
- No other document is currently SUBMITTED.
- No production mutation is performed by this qualification document.

## Frontend implementation contract
The implementation reuses the existing authorization adapter and calls only:

```js
supabase.rpc("request_document_transition", {
  p_document_id,
  p_transition_code: "START_REVIEW",
  p_reason: null,
})
```

The action is shown only for SUBMITTED rows and only when `DOCUMENT_VERIFY` is granted.

The client performs basic state/identifier validation, while the database remains authoritative.

## Explicit exclusions
- No database/schema changes.
- No new permissions or roles.
- No RLS changes.
- No direct table write grants.
- No new SECURITY DEFINER function.
- No storage/upload changes.
- No other document transitions.
- No production test-data creation.
- No automatic side effects in unrelated modules.
- No reversal of document 4's existing SUBMITTED state.

## Verification gates
1. Review implementation diff.
2. Build/deployment verification.
3. Authenticated UI verification.
4. Confirm only the controlled RPC is used.
5. Controlled production SUBMITTED → UNDER_REVIEW mutation, separately approved.
6. Verify document status and matching audit record.
7. Final review and merge only after evidence is complete.
