-- SEC-147 REGRESSION TEST
-- STATUS: CANDIDATE ONLY / NOT EXECUTED
begin;
select plan(6);

select is(
  (select count(*) from information_schema.tables where table_schema='logistics' and table_type='BASE TABLE'),
  94::bigint,
  'verified post-migration state contains 90 existing tables plus 4 readiness tables'
);

select is(
  (select count(*) from pg_constraint c
   join pg_class t on t.oid=c.conrelid
   join pg_namespace n on n.oid=t.relnamespace
   where n.nspname='logistics' and c.contype='p'),
  94::bigint,
  'post-migration primary-key count remains one per base table'
);

select ok(
  to_regclass('logistics.shipments') is not null,
  'shipments remains present'
);

select ok(
  to_regclass('logistics.shipment_milestone') is not null,
  'shipment_milestone remains present'
);

select ok(
  to_regclass('logistics.audit_log') is not null,
  'existing audit_log remains authoritative'
);

select ok(
  (select count(*) from information_schema.tables
   where table_schema='logistics' and table_name='readiness_audit_log') = 0,
  'no readiness-specific audit table is introduced'
);

select * from finish();
rollback;
