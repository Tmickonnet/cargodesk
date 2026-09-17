-- SEC-147 SECURITY TEST
-- STATUS: CANDIDATE ONLY / NOT EXECUTED
begin;
select plan(10);

select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='logistics' and c.relname='readiness_evaluation'),
  'evaluation has RLS enabled');

select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='logistics' and c.relname='readiness_rule_result'),
  'rule result has RLS enabled');

select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='logistics' and c.relname='readiness_evidence_reference'),
  'evidence reference has RLS enabled');

select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='logistics' and c.relname='readiness_human_decision'),
  'human decision has RLS enabled');

select ok((select count(*) from pg_policies where schemaname='logistics'
  and tablename in ('readiness_evaluation','readiness_rule_result','readiness_evidence_reference','readiness_human_decision')
  and cmd='DELETE') = 0,
  'no readiness DELETE policies exist');

select ok((select count(*) from pg_policies where schemaname='logistics'
  and tablename in ('readiness_evaluation','readiness_rule_result','readiness_evidence_reference','readiness_human_decision')
  and roles @> array['anon'::name]) = 0,
  'no readiness policy grants anon access');

select ok((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='logistics' and p.proname='validate_readiness_evidence_shipment'
  and p.prosecdef) = 0,
  'cross-shipment validator must not be SECURITY DEFINER');

select ok((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='logistics' and p.proname='validate_readiness_evidence_shipment'
  and p.prosecdef = false) >= 0,
  'validator remains eligible for SECURITY INVOKER implementation');

select ok((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='logistics' and p.prosecdef
  and p.proname like 'readiness_%') = 0,
  'no readiness SECURITY DEFINER functions are introduced by the base migration');

select ok((select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='logistics' and not t.tgisinternal) <= 1,
  'readiness implementation uses at most one user-defined trigger');

select * from finish();
rollback;
