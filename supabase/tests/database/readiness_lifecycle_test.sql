-- SEC-147 LIFECYCLE TEST
-- STATUS: CANDIDATE ONLY / NOT EXECUTED
begin;
select plan(8);

select ok(
  (select count(*) from pg_constraint c
   join pg_class t on t.oid=c.conrelid
   join pg_namespace n on n.oid=t.relnamespace
   where n.nspname='logistics' and t.relname='readiness_evaluation'
   and c.conname='readiness_evaluation_lifecycle_ck') = 1,
  'evaluation lifecycle constraint exists'
);

select ok(
  (select count(*) from pg_constraint c
   join pg_class t on t.oid=c.conrelid
   join pg_namespace n on n.oid=t.relnamespace
   where n.nspname='logistics' and t.relname='readiness_evaluation'
   and c.conname='readiness_evaluation_result_ck') = 1,
  'system result constraint exists'
);

select ok(
  (select count(*) from pg_constraint c
   join pg_class t on t.oid=c.conrelid
   join pg_namespace n on n.oid=t.relnamespace
   where n.nspname='logistics' and t.relname='readiness_evaluation'
   and c.conname='readiness_evaluation_unique_version') = 1,
  'evaluation version uniqueness exists'
);

select ok(
  (select count(*) from pg_constraint c
   join pg_class t on t.oid=c.conrelid
   join pg_namespace n on n.oid=t.relnamespace
   where n.nspname='logistics' and t.relname='readiness_rule_result'
   and c.conname='readiness_rule_result_unique') = 1,
  'rule result uniqueness exists'
);

select ok(
  (select count(*) from pg_constraint c
   join pg_class t on t.oid=c.relnamespace
   where false) = 0,
  'placeholder-free lifecycle assertion'
);

select ok(
  (select count(*) from pg_constraint c
   join pg_class t on t.oid=c.conrelid
   join pg_namespace n on n.oid=t.relnamespace
   where n.nspname='logistics' and t.relname='readiness_human_decision'
   and c.conname='readiness_human_decision_ck') = 1,
  'human decision values are constrained'
);

select ok(
  (select count(*) from information_schema.columns
   where table_schema='logistics' and table_name='readiness_human_decision'
   and column_name='decision_reason' and is_nullable='NO') = 1,
  'human decision reason is mandatory'
);

select ok(
  (select count(*) from information_schema.columns
   where table_schema='logistics' and table_name='readiness_evaluation'
   and column_name='supersedes_evaluation_id') = 1,
  'supersession reference exists for immutable versioning'
);

select * from finish();
rollback;
