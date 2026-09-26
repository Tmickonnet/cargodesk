# SEC-198 — Controlled Exception Resolution Qualification

## Status

PROPOSED → QUALIFIED FOR CONTROLLED IMPLEMENTATION

This document records the next controlled operational mutation candidate after SEC-197.

## Evidence basis

- The production database contains the controlled function `logistics.resolve_exception(bigint, text, text)`.
- The function requires authentication, an active CargoDesk user, and `EXCEPTION_MANAGE`.
- The function permits only `OPEN → RESOLVED`.
- Corrective action is mandatory and trimmed/non-blank, with a 4000-character maximum.
- Remarks are optional and limited to 4000 characters.
- The function performs the exception update and `EXCEPTION_RESOLVED` audit insertion atomically.
- Direct authenticated INSERT/UPDATE/DELETE privileges remain absent on `shipment_exception` and `audit_log`.
- Existing RLS policies remain permission-based.
- The current Vite/React main application is read-oriented and has no operational mutation calls.
- The current authorization adapter already exposes the established `has_permission` RPC pattern.

## Selected first mutation candidate

**Exception resolution** is selected as the first controlled operational write-path candidate because its database-side action contract is already implemented and verified under SEC-197.

This selection does not authorize unrelated operational mutations.

## Controlled application scope

The implementation should add an Exceptions workspace to the existing application without changing the database security model.

### Read path

Use the existing `EXCEPTION_VIEW` permission and query only the fields required for the workspace:

- shipment_exception_id
- shipment_id
- container_id
- shipment_leg_id
- exception_reference
- exception_type
- severity
- reported_at
- resolved_at
- description
- corrective_action
- status
- resolved_by
- remarks
- updated_at

### Write path

The frontend must call only:

`supabase.rpc("resolve_exception", {
  p_exception_id,
  p_corrective_action,
  p_remarks
})`

The frontend must not receive or use direct UPDATE privileges.

### UI authorization

- Workspace visibility: `EXCEPTION_VIEW`
- Resolution action visibility/enabled state: `EXCEPTION_MANAGE`
- Authorization failures must fail closed.
- The UI must not infer authorization from role names.

### Validation

Before RPC submission:

- exception identifier must be valid;
- corrective action must be non-blank after trimming;
- corrective action must not exceed 4000 characters;
- remarks, when supplied, must not exceed 4000 characters.

The database function remains authoritative and must revalidate all rules.

### Failure handling

The UI must surface controlled RPC failures without manufacturing or mutating replacement records.

A non-OPEN exception must remain unchanged.

## Audit contract

The frontend must not insert audit rows.

The database function remains responsible for exactly one `EXCEPTION_RESOLVED` audit event when resolution succeeds.

## Testing boundary

### Safe tests available without production-data manufacture

1. Exceptions read-path authorization and loading.
2. UI validation for blank/oversized corrective action.
3. RPC invocation wiring.
4. Existing resolved exception used to verify that an invalid transition is rejected and does not change the record.
5. Build/deployment verification.

### Pending success-path test

A successful `OPEN → RESOLVED` production test requires an existing disposable OPEN exception or separate explicit approval to create controlled test data.

No production exception will be manufactured merely to obtain a green test.

## Explicit exclusions

SEC-198 does not authorize:

- new tables;
- new columns;
- new permissions;
- role changes;
- RLS changes;
- direct table write grants;
- new SECURITY DEFINER functions;
- changes to SEC-197;
- automatic shipment/delivery/tracking side effects;
- unrelated mutation workflows;
- production test-data creation.

## Implementation gate

The next implementation should be a frontend-only controlled application change using the already-verified SEC-197 database contract.

Production database mutation is **not required** for this implementation step.

## Verification target

The implementation is complete only when:

1. the exception workspace is permission-gated;
2. exception data loads through the existing authorized read path;
3. resolution invokes only the SEC-197 RPC;
4. direct table writes remain absent;
5. invalid transition handling is verified against an existing resolved exception;
6. application build succeeds;
7. production deployment is READY;
8. runtime verification confirms the workspace loads without runtime errors;
9. successful mutation remains explicitly marked pending until a legitimate OPEN test record exists.

