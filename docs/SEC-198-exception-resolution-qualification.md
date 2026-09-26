# SEC-198 — Controlled Exception Resolution Qualification

## Status

PROPOSED → QUALIFIED → RECONCILED → CORRECTED → FRESH PREVIEW READY → AUTHENTICATED UI VERIFIED

SEC-198 is the controlled frontend implementation for exception resolution using the already-verified production database contract established under SEC-197.

## Reconciliation

The original SEC-198 implementation was based on an older `main` commit and was not merged directly. A fresh branch was created from the current production-aligned `main` commit after SEC-202:

- Current main base: `d22589e4011ff084b7c2bd8e0b1dd5bb58d2f930`
- Reconciled branch: `sec-198-reconciled-current-main`

Only the previously qualified SEC-198 application scope was carried forward:

- `src/ExceptionsWorkspace.jsx`
- the required Exceptions navigation/permission wiring in `src/App.jsx`
- this qualification record

No database/schema/RLS/RBAC/storage/auth changes are included.

## Existing database contract

The production database already provides `logistics.resolve_exception(bigint, text, text)`.

The established contract requires authentication, an active CargoDesk user, and `EXCEPTION_MANAGE`; permits only `OPEN → RESOLVED`; requires non-blank corrective action (maximum 4000 characters); permits optional remarks (maximum 4000 characters); and performs the exception update and `EXCEPTION_RESOLVED` audit insertion atomically.

The frontend must call only `supabase.rpc("resolve_exception", { p_exception_id, p_corrective_action, p_remarks })`. After a successful mutation, the frontend refreshes the affected exception through the existing authorized read path rather than fabricating `resolved_at` or `updated_at` locally. The production function returns success/status/reference but does not return authoritative timestamps.

The database remains authoritative.

## UI authorization

- Workspace visibility: `EXCEPTION_VIEW`
- Resolution action visibility: `EXCEPTION_MANAGE`
- Authorization fails closed while authentication/authorization is unresolved.
- The UI does not infer authorization from role names.

## Verification boundary and results

The reconciled implementation was verified for:

1. successful preview deployment readiness;
2. Exceptions navigation and workspace loading through the authorized read path;
3. existing exception visibility;
4. permission-gated resolution action behavior;
5. preservation of the already-resolved state;
6. client-side and RPC implementation inspection;
7. preservation of direct table-write restrictions;
8. preview runtime health.

Authenticated UI verification confirmed:

- Exceptions workspace loads successfully;
- 1 exception is loaded;
- `EXC-CDG-2026-0001` is displayed;
- type is `DOCUMENTATION_DISCREPANCY`;
- severity is `LOW`;
- status is `RESOLVED`;
- the existing reported/updated information displays;
- action is `No action`, as expected for an already-resolved exception;
- no production exception was created or modified.

The current preview deployment is READY and is tied to commit `32cb5a2a7fd265e0f32c589ffc928ef2959ad5dd`. Vercel reports no runtime errors in the selected verification window, and the GitHub Vercel status for that commit is successful.

A successful `OPEN → RESOLVED` production mutation remains intentionally unperformed because the current production exception is already RESOLVED. No production exception will be manufactured merely to obtain a successful test.

## Explicit exclusions

SEC-198 does not authorize:

- new tables or columns;
- new roles or permissions;
- RLS/RBAC changes;
- direct table write grants;
- new SECURITY DEFINER functions;
- production test-data creation;
- automatic shipment/delivery/tracking side effects;
- unrelated mutation workflows;
- changes to SEC-197 or SEC-202.

## Additional verification finding

The initial reconciled frontend locally synthesized `resolved_at` after a successful RPC. Live inspection of `logistics.resolve_exception(bigint,text,text)` confirmed that the production function returns JSONB containing success, exception ID, reference, and status, but not authoritative timestamps. Because the database sets `resolved_at` and `updated_at` with `clock_timestamp()`, local timestamp synthesis could display a state that was not the authoritative database value. This was corrected before merge by refreshing the affected exception through the existing authorized SELECT path after successful resolution.

Live security inspection also confirmed that `shipment_exception` has RLS enabled, its SELECT policy requires `EXCEPTION_VIEW`, its UPDATE policy requires `EXCEPTION_MANAGE`, and the table ACL grants `authenticated` SELECT only. Direct authenticated table UPDATE is therefore not available through the table grant path; the controlled RPC remains the mutation path.

## Current status

**PROPOSED → QUALIFIED → RECONCILED → CORRECTED → FRESH PREVIEW READY → AUTHENTICATED UI VERIFIED → PENDING OWNER APPROVAL**

No production database mutation has been performed by this reconciliation.
