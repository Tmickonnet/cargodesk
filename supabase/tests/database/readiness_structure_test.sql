-- SEC-147 STRUCTURE TEST
-- STATUS: CANDIDATE ONLY / NOT EXECUTED
begin;
select plan(12);

select has_table('logistics','readiness_evaluation','readiness_evaluation exists');
select has_table('logistics','readiness_rule_result','readiness_rule_result exists');
select has_table('logistics','readiness_evidence_reference','readiness_evidence_reference exists');
select has_table('logistics','readiness_human_decision','readiness_human_decision exists');

select has_pk('logistics','readiness_evaluation','readiness_evaluation has primary key');
select has_pk('logistics','readiness_rule_result','readiness_rule_result has primary key');
select has_pk('logistics','readiness_evidence_reference','readiness_evidence_reference has primary key');
select has_pk('logistics','readiness_human_decision','readiness_human_decision has primary key');

select col_not_null('logistics','readiness_evaluation','shipment_id','evaluation shipment_id is NOT NULL');
select col_not_null('logistics','readiness_rule_result','readiness_evaluation_id','rule result evaluation FK is NOT NULL');
select col_not_null('logistics','readiness_human_decision','decided_by','human decision actor is NOT NULL');
select col_not_null('logistics','readiness_human_decision','decision_reason','human decision reason is NOT NULL');

select * from finish();
rollback;
