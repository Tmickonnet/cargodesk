-- SEC-147 CONSTRAINT TEST
-- STATUS: CANDIDATE ONLY / NOT EXECUTED
begin;
select plan(8);

select col_has_check('logistics','readiness_evaluation','evaluation_version','positive evaluation version is constrained');
select col_has_check('logistics','readiness_evaluation','lifecycle_status','evaluation lifecycle is constrained');
select col_has_check('logistics','readiness_evaluation','system_result','system result is constrained');
select col_has_check('logistics','readiness_rule_result','result_status','rule result status is constrained');
select col_has_check('logistics','readiness_evidence_reference','applicability','evidence applicability is constrained');
select col_has_check('logistics','readiness_evidence_reference','conflict_status','evidence conflict status is constrained');
select col_has_check('logistics','readiness_evidence_reference','shipment_id','evidence has shipment scope');
select col_has_check('logistics','readiness_human_decision','decision','human decision values are constrained');

select * from finish();
rollback;
