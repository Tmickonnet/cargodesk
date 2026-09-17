-- SEC-147 TEST SETUP
-- STATUS: CANDIDATE ONLY / NOT EXECUTED
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

select ok(
  to_regclass('logistics.shipments') is not null,
  'existing shipments table is available'
);

select ok(
  to_regclass('logistics.users') is not null,
  'existing users table is available'
);

select ok(
  to_regclass('logistics.audit_log') is not null,
  'existing audit_log table is available'
);

select ok(
  (select count(*) from information_schema.tables
   where table_schema='logistics' and table_type='BASE TABLE') = 90,
  'CargoDesk baseline contains exactly 90 existing logistics base tables before readiness migration'
);

select ok(
  to_regclass('logistics.readiness_evaluation') is null,
  'readiness layer is absent before candidate migration'
);

select * from finish();
rollback;
