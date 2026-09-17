-- SEC-147 EVIDENCE TEST
-- STATUS: CANDIDATE ONLY / NOT EXECUTED
begin;
select plan(8);

select ok(
  (select count(*) from information_schema.columns
   where table_schema='logistics' and table_name='readiness_evidence_reference'
   and column_name='shipment_document_id') = 1,
  'shipment document evidence uses shipment_documents reference'
);

select ok(
  (select count(*) from information_schema.columns
   where table_schema='logistics' and table_name='readiness_evidence_reference'
   and column_name='document_id') = 0,
  'no direct document_id polymorphic shortcut exists'
);

select ok(
  (select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid
   join pg_namespace n on n.oid=t.relnamespace
   where n.nspname='logistics' and t.relname='readiness_evidence_reference'
   and c.conname='readiness_evidence_exactly_one_source_ck') = 1,
  'exactly-one evidence source constraint exists'
);

select ok(
  (select count(*) from information_schema.columns
   where table_schema='logistics' and table_name='readiness_evidence_reference'
   and column_name='shipment_id' and is_nullable='NO') = 1,
  'evidence is explicitly shipment-scoped'
);

select ok(
  (select count(*) from information_schema.columns
   where table_schema='logistics' and table_name='readiness_evidence_reference'
   and column_name='conflict_status') = 1,
  'evidence conflict state is represented'
);

select ok(
  (select count(*) from information_schema.columns
   where table_schema='logistics' and table_name='readiness_evidence_reference'
   and column_name='source_version') = 1,
  'evidence version metadata is represented'
);

select ok(
  (select count(*) from information_schema.columns
   where table_schema='logistics' and table_name='readiness_evidence_reference'
   and column_name='snapshot_metadata') = 1,
  'snapshot metadata is represented'
);

select ok(
  (select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid
   join pg_namespace n on n.oid=t.relnamespace
   where n.nspname='logistics' and t.relname='readiness_evidence_reference'
   and c.conname='readiness_evidence_conflict_ck') = 1,
  'conflict classification is constrained'
);

select * from finish();
rollback;
