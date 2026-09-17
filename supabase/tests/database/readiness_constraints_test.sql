-- SEC-147 CONSTRAINT TEST
-- STATUS: CANDIDATE ONLY / NOT EXECUTED
begin;
select plan(9);

select col_has_check('logistics','readiness_evaluation','evaluation_version','positive evaluation version is constrained');
select col_has_check('logistics','readiness_evaluation','lifecycle_status','evaluation lifecycle is constrained');
select col_has_check('logistics','readiness_evaluation','system_result','system result is constrained');
select col_has_check('logistics','readiness_rule_result','result_status','rule result status is constrained');
select col_has_check('logistics','readiness_evidence_reference','applicability','evidence applicability is constrained');
select col_has_check('logistics','readiness_evidence_reference','conflict_status','evidence conflict status is constrained');
select col_not_null('logistics','readiness_evidence_reference','shipment_id','evidence has mandatory shipment scope');
select col_has_check('logistics','readiness_human_decision','decision','human decision values are constrained');
select ok(
  (select count(*) from pg_constraint con
   join pg_class c on c.oid=con.conrelid
   join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='logistics'
     and c.relname='readiness_human_decision'
     and con.conname='readiness_human_decision_unique_evaluation'
     and con.contype='u') = 1,
  'one human decision is structurally allowed per readiness evaluation'
);

select * from finish();
rollback;
