# SEC-198 — Controlled Exception Resolution Qualification

## Status

PROPOSED → QUALIFIED → RECONCILED FOR CURRENT-MAIN VERIFICATION

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

The frontend must call only `supabase.rpc("resolve_exception", { p_exception_id, p_corrective_action, p_remarks })`.

The database remains authoritative.

## UI authorization

- Workspace visibility: `EXCEPTION_VIEW`
- Resolution action visibility: `EXCEPTION_MANAGE`
- Authorization fails closed while authentication/authorization is unresolved.
- The UI does not infer authorization from role names.

## Safe verification boundary

The reconciled implementation must be verified for:

1. successful application build;
2. Exceptions navigation and workspace loading through the authorized read path;
3. permission-gated resolution action;
4. client-side validation;
5. RPC wiring to the existing controlled function;
6. preservation of direct table-write restrictions;
7. invalid-transition protection using the existing resolved exception;
8. preview deployment readiness and runtime health.

A successful `OPEN → RESOLVED` production mutation remains pending because the current production exception is already RESOLVED. No production exception will be manufactured merely to obtain a successful test.

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

## Current status

**RECONCILED → PENDING BUILD/PREVIEW/AUTHENTICATED VERIFICATION**

No production database mutation has been performed by this reconciliation.
