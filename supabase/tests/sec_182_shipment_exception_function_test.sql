-- SEC-182 candidate test contract.
-- Execute only in an explicitly isolated test database after approval.
-- This file intentionally contains no production execution commands.

-- 1. Function exists with the exact candidate signature.
select
    p.proname,
    pg_get_function_identity_arguments(p.oid) as arguments,
    p.prosecdef as security_definer,
    pg_catalog.pg_get_userbyid(p.proowner) as owner
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'logistics'
  and p.proname = 'create_shipment_exception';

-- 2. Execution boundary: authenticated only; anonymous/public denied.
select
    has_function_privilege(
        'authenticated',
        'logistics.create_shipment_exception(bigint,text,text,text,text,bigint,bigint,bigint,bigint,text)',
        'EXECUTE'
    ) as authenticated_execute,
    has_function_privilege(
        'anon',
        'logistics.create_shipment_exception(bigint,text,text,text,text,bigint,bigint,bigint,bigint,text)',
        'EXECUTE'
    ) as anon_execute,
    has_function_privilege(
        'public',
        'logistics.create_shipment_exception(bigint,text,text,text,text,bigint,bigint,bigint,bigint,text)',
        'EXECUTE'
    ) as public_execute;

-- 3. Static security assertions.
-- Expected:
-- security_definer = true only because authenticated direct INSERT is not granted
-- and audit_log INSERT is not granted to authenticated.
-- search_path must remain exactly logistics, pg_catalog.
-- The function must resolve caller identity through auth.uid()/current_user_id().
-- The caller must possess EXCEPTION_MANAGE.
-- No status/actor/audit identity parameter exists.

-- 4. Business validation tests to execute only after isolated authentication setup:
-- a) valid exception => one shipment_exception row + one matching audit_log row
-- b) unauthenticated => rejected
-- c) user without EXCEPTION_MANAGE => rejected
-- d) nonexistent shipment => rejected
-- e) container not belonging to shipment => rejected
-- f) leg not belonging to shipment => rejected
-- g) nonexistent location => rejected
-- h) nonexistent responsible party => rejected
-- i) missing reference/type/description => rejected
-- j) duplicate reference => rejected by existing UNIQUE constraint
-- k) caller cannot create RESOLVED because status is not an input
-- l) audit creation failure must roll back exception creation
-- m) no shipment status/milestone/readiness change
-- n) no anonymous execution
