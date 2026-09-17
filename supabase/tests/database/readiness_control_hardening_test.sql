-- SEC-149D CONTROL HARDENING TESTS
-- STATUS: CANDIDATE ONLY / NOT EXECUTED
-- These tests are intended for the reconstructed 90-table local baseline.
-- They include structural checks and negative-path tests where prerequisite
-- production-like rows can be safely discovered.

begin;
select plan(12);

select ok(
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='logistics'
     and p.proname='validate_readiness_evidence_shipment'
     and p.prosecdef = false) = 1,
  'cross-shipment validator exists as SECURITY INVOKER'
);

select ok(
  (select count(*) from pg_trigger t
   join pg_class c on c.oid=t.tgrelid
   join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='logistics'
     and c.relname='readiness_evidence_reference'
     and t.tgname='trg_validate_readiness_evidence_shipment'
     and not t.tgisinternal) = 1,
  'cross-shipment evidence trigger exists with exact controlled name'
);

select ok(
  (select count(*) from pg_trigger t
   join pg_class c on c.oid=t.tgrelid
   join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='logistics'
     and c.relname='readiness_evaluation'
     and t.tgname='trg_protect_readiness_evaluation_lifecycle'
     and not t.tgisinternal) = 1,
  'evaluation lifecycle protection trigger exists'
);

select ok(
  (select count(*) from pg_trigger t
   join pg_class c on c.oid=t.tgrelid
   join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='logistics'
     and c.relname='readiness_rule_result'
     and t.tgname='trg_protect_readiness_rule_result_lifecycle'
     and not t.tgisinternal) = 1,
  'rule-result lifecycle protection trigger exists'
);

select ok(
  (select count(*) from pg_trigger t
   join pg_class c on c.oid=t.tgrelid
   join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='logistics'
     and c.relname='readiness_evidence_reference'
     and t.tgname='trg_protect_readiness_evidence_lifecycle'
     and not t.tgisinternal) = 1,
  'evidence lifecycle protection trigger exists'
);

select ok(
  (select count(*) from pg_trigger t
   join pg_class c on c.oid=t.tgrelid
   join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='logistics'
     and c.relname='readiness_human_decision'
     and t.tgname='trg_protect_readiness_human_decision'
     and not t.tgisinternal) = 1,
  'human-decision immutability trigger exists'
);

select ok(
  (select count(*) from pg_trigger t
   join pg_class c on c.oid=t.tgrelid
   join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='logistics'
     and c.relname='readiness_human_decision'
     and t.tgname='trg_enforce_readiness_authorization_sod'
     and not t.tgisinternal) = 1,
  'authorization separation-of-duties trigger exists'
);

select ok(
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='logistics'
     and p.proname in (
       'protect_readiness_evaluation_lifecycle',
       'protect_readiness_child_lifecycle',
       'protect_readiness_human_decision',
       'enforce_readiness_authorization_sod'
     )
     and p.prosecdef) = 0,
  'readiness control functions are not SECURITY DEFINER'
);

select ok(
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='logistics'
     and p.proname='validate_readiness_evidence_shipment'
     and pg_get_functiondef(p.oid) like '%security invoker%') = 1,
  'validator definition explicitly declares SECURITY INVOKER'
);

select ok(
  (select count(*) from pg_trigger t
   join pg_class c on c.oid=t.tgrelid
   join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='logistics'
     and not t.tgisinternal
     and c.relname in (
       'readiness_evaluation',
       'readiness_rule_result',
       'readiness_evidence_reference',
       'readiness_human_decision'
     )) >= 7,
  'readiness control triggers cover all protected readiness objects'
);

select ok(
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='logistics'
     and p.proname='enforce_readiness_authorization_sod'
     and pg_get_functiondef(p.oid) like '%new.decided_by = v_evaluated_by%') = 1,
  'SoD validator explicitly rejects evaluator self-authorization'
);

select ok(
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='logistics'
     and p.proname='protect_readiness_child_lifecycle'
     and pg_get_functiondef(p.oid) like '%v_new_evaluation_id%'
     and pg_get_functiondef(p.oid) like '%v_new_lifecycle_status%'
     and pg_get_functiondef(p.oid) like '%Readiness child cannot be re-parented into a finalized or superseded evaluation%') = 1,
  'child lifecycle protection rejects re-parenting into a finalized or superseded evaluation'
);

select * from finish();
rollback;
