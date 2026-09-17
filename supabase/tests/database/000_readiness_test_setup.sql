-- SEC-147 TEST SETUP
-- STATUS: CANDIDATE ONLY / NOT EXECUTED
-- This suite runs AFTER the candidate migration in the controlled environment.
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

select ok(to_regclass('logistics.shipments') is not null,'existing shipments table is available');
select ok(to_regclass('logistics.users') is not null,'existing users table is available');
select ok(to_regclass('logistics.audit_log') is not null,'existing audit_log table is available');

select is(
  (select count(*) from information_schema.tables where table_schema='logistics' and table_type='BASE TABLE'),
  94::bigint,
  'controlled post-migration state contains 90 foundation tables plus 4 readiness tables'
);

select ok(
  to_regclass('logistics.readiness_evaluation') is not null
  and to_regclass('logistics.readiness_rule_result') is not null
  and to_regclass('logistics.readiness_evidence_reference') is not null
  and to_regclass('logistics.readiness_human_decision') is not null,
  'all four readiness tables exist after migration'
);

select * from finish();
rollback;
