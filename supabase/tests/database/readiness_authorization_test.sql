-- SEC-147 AUTHORIZATION TEST
-- STATUS: CANDIDATE ONLY / NOT EXECUTED
begin;
select plan(6);

select ok(
  (select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid
   join pg_namespace n on n.oid=t.relnamespace
   where n.nspname='logistics' and t.relname='readiness_human_decision'
   and c.conname='readiness_human_decision_ck') = 1,
  'only approved human decision values are accepted'
);

select ok(
  (select count(*) from information_schema.columns
   where table_schema='logistics' and table_name='readiness_human_decision'
   and column_name='decided_by' and is_nullable='NO') = 1,
  'decision actor is mandatory'
);

select ok(
  (select count(*) from information_schema.columns
   where table_schema='logistics' and table_name='readiness_human_decision'
   and column_name='decision_reason' and is_nullable='NO') = 1,
  'decision reason is mandatory'
);

select ok(
  (select count(*) from pg_policies where schemaname='logistics'
   and tablename='readiness_human_decision' and cmd='DELETE') = 0,
  'human decisions have no ordinary DELETE policy'
);

select ok(
  (select count(*) from pg_policies where schemaname='logistics'
   and tablename='readiness_human_decision' and cmd='UPDATE') = 0,
  'human decisions have no ordinary UPDATE policy'
);

select ok(
  (select count(*) from pg_policies where schemaname='logistics'
   and tablename='readiness_human_decision' and cmd='INSERT'
   and roles @> array['anon'::name]) = 0,
  'anonymous human authorization is denied'
);

select * from finish();
rollback;
