# SEC-182 — Static Security & Architecture Review

Status: Candidate / review only. No production execution.

## Verified live facts

- `shipment_exception` has required shipment/reference/type/description fields and defaults `status` to `OPEN`.
- `exception_reference` is UNIQUE.
- `shipment_exception` has FKs to shipment, container, shipment leg, location and party.
- Authenticated users have no direct INSERT grant on `shipment_exception`.
- Authenticated users have no direct INSERT grant on `audit_log`.
- Existing controlled document functions use narrow `SECURITY DEFINER`, fixed `search_path = logistics, pg_catalog`, authenticated-only execution and explicit permission checks.
- `audit_log` supports bigint user/record IDs and JSONB old/new values.

## Security decision

The candidate `SECURITY DEFINER` model is justified by the current write boundary, but only as a narrow workflow function. It must not be generalized into arbitrary CRUD.

## Candidate controls verified by inspection

1. Caller must be authenticated.
2. Caller must resolve to an active CargoDesk user.
3. Caller must have `EXCEPTION_MANAGE`.
4. Shipment must exist.
5. Optional container and shipment leg must belong to the shipment.
6. Optional location and responsible party must exist.
7. Initial status is not caller-controlled.
8. Audit actor is derived from the authenticated CargoDesk user.
9. Audit write occurs in the same transaction as exception creation.
10. Execute is revoked from PUBLIC/anon and granted to authenticated.
11. No readiness or shipment-status side effect is included.
12. Proposed exception type/severity catalogues are not hard-coded.

## Required validation before any execution

- Execute the candidate only in an isolated test environment if such execution becomes necessary.
- Confirm the SECURITY DEFINER function cannot be invoked by anon.
- Confirm unauthorized authenticated users are rejected.
- Confirm authorized users can create an OPEN exception.
- Confirm audit failure rolls back the exception insert.
- Confirm duplicate references fail.
- Confirm invalid related-object relationships fail.
- Confirm no readiness, milestone or shipment-status changes occur.
- Run Supabase security/performance advisors after any isolated database deployment.

## Current disposition

STATIC REVIEW: PASS WITH CONTROLLED-EXECUTION GATE

The candidate is sufficiently specified for isolated execution testing, but this review does not authorize production deployment or merge to main.
