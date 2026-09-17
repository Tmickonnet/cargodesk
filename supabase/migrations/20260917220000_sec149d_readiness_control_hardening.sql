-- SEC-149D CANDIDATE READINESS CONTROL HARDENING
-- STATUS: CANDIDATE ONLY / NOT EXECUTED
-- Purpose: controlled-environment hardening for evidence scope, lifecycle immutability,
-- and human authorization separation of duties.
-- This file must not be applied to production until a reproducible 90-table
-- local baseline has been reconstructed and all tests pass.

begin;

-- 1. Cross-shipment evidence validation.
create or replace function logistics.validate_readiness_evidence_shipment()
returns trigger
language plpgsql
security invoker
set search_path = logistics, pg_catalog
as $$
declare
  v_expected_shipment_id bigint;
  v_source_shipment_id bigint;
  v_source_count integer;
begin
  select re.shipment_id
    into v_expected_shipment_id
  from logistics.readiness_rule_result rr
  join logistics.readiness_evaluation re
    on re.readiness_evaluation_id = rr.readiness_evaluation_id
  where rr.readiness_rule_result_id = new.readiness_rule_result_id;

  if v_expected_shipment_id is null then
    raise exception 'Readiness evidence validation failed: parent evaluation shipment could not be resolved';
  end if;

  if new.shipment_id <> v_expected_shipment_id then
    raise exception 'Readiness evidence validation failed: evidence shipment does not match evaluation shipment';
  end if;

  v_source_count := 0;
  v_source_shipment_id := null;

  if new.shipment_cargo_id is not null then
    v_source_count := v_source_count + 1;
    select shipment_id into v_source_shipment_id
    from logistics.shipment_cargo
    where shipment_cargo_id = new.shipment_cargo_id;
  end if;

  if new.shipment_container_id is not null then
    v_source_count := v_source_count + 1;
    select shipment_id into v_source_shipment_id
    from logistics.shipment_container
    where shipment_container_id = new.shipment_container_id;
  end if;

  if new.container_vgm_id is not null then
    v_source_count := v_source_count + 1;
    select shipment_id into v_source_shipment_id
    from logistics.container_vgm
    where container_vgm_id = new.container_vgm_id;
  end if;

  if new.weighbridge_record_id is not null then
    v_source_count := v_source_count + 1;
    select shipment_id into v_source_shipment_id
    from logistics.weighbridge_record
    where weighbridge_record_id = new.weighbridge_record_id;
  end if;

  if new.stuffing_record_id is not null then
    v_source_count := v_source_count + 1;
    select shipment_id into v_source_shipment_id
    from logistics.stuffing_record
    where stuffing_record_id = new.stuffing_record_id;
  end if;

  if new.tracking_event_id is not null then
    v_source_count := v_source_count + 1;
    select shipment_id into v_source_shipment_id
    from logistics.tracking_event
    where tracking_event_id = new.tracking_event_id;
  end if;

  if new.shipment_milestone_id is not null then
    v_source_count := v_source_count + 1;
    select shipment_id into v_source_shipment_id
    from logistics.shipment_milestone
    where shipment_milestone_id = new.shipment_milestone_id;
  end if;

  if new.shipment_exception_id is not null then
    v_source_count := v_source_count + 1;
    select shipment_id into v_source_shipment_id
    from logistics.shipment_exception
    where shipment_exception_id = new.shipment_exception_id;
  end if;

  if new.shipment_leg_id is not null then
    v_source_count := v_source_count + 1;
    select shipment_id into v_source_shipment_id
    from logistics.shipment_legs
    where shipment_leg_id = new.shipment_leg_id;
  end if;

  if new.shipment_document_id is not null then
    v_source_count := v_source_count + 1;
    select shipment_id into v_source_shipment_id
    from logistics.shipment_documents
    where shipment_document_id = new.shipment_document_id;
  end if;

  if new.delivery_id is not null then
    v_source_count := v_source_count + 1;
    select shipment_id into v_source_shipment_id
    from logistics.delivery
    where delivery_id = new.delivery_id;
  end if;

  if new.proof_of_delivery_id is not null then
    v_source_count := v_source_count + 1;
    select d.shipment_id
      into v_source_shipment_id
    from logistics.proof_of_delivery pod
    join logistics.delivery d on d.delivery_id = pod.delivery_id
    where pod.proof_of_delivery_id = new.proof_of_delivery_id;
  end if;

  if v_source_count <> 1 then
    raise exception 'Readiness evidence validation failed: expected exactly one resolvable evidence source, found %', v_source_count;
  end if;

  if v_source_shipment_id is null then
    raise exception 'Readiness evidence validation failed: evidence source does not resolve to a shipment';
  end if;

  if v_source_shipment_id <> v_expected_shipment_id
     or v_source_shipment_id <> new.shipment_id then
    raise exception 'Readiness evidence validation failed: source shipment does not match evaluation shipment';
  end if;

  return new;
end;
$$;

create trigger trg_validate_readiness_evidence_shipment
before insert or update on logistics.readiness_evidence_reference
for each row
execute function logistics.validate_readiness_evidence_shipment();

-- 2. Lifecycle immutability.
create or replace function logistics.protect_readiness_evaluation_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = logistics, pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Readiness evaluation records are immutable; create a new version instead';
  end if;

  if old.lifecycle_status in ('DECIDED','SUPERSEDED') then
    raise exception 'Finalized or superseded readiness evaluations are immutable';
  end if;

  return new;
end;
$$;

create or replace function logistics.protect_readiness_child_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = logistics, pg_catalog
as $$
declare
  v_old_evaluation_id bigint;
  v_new_evaluation_id bigint;
  v_old_lifecycle_status text;
  v_new_lifecycle_status text;
begin
  if tg_table_name = 'readiness_rule_result' then
    v_old_evaluation_id := old.readiness_evaluation_id;
    v_new_evaluation_id := new.readiness_evaluation_id;
  elsif tg_table_name = 'readiness_evidence_reference' then
    select rr.readiness_evaluation_id
      into v_old_evaluation_id
    from logistics.readiness_rule_result rr
    where rr.readiness_rule_result_id = old.readiness_rule_result_id;

    select rr.readiness_evaluation_id
      into v_new_evaluation_id
    from logistics.readiness_rule_result rr
    where rr.readiness_rule_result_id = new.readiness_rule_result_id;
  else
    raise exception 'Unsupported readiness child table for lifecycle protection';
  end if;

  select lifecycle_status
    into v_old_lifecycle_status
  from logistics.readiness_evaluation
  where readiness_evaluation_id = v_old_evaluation_id;

  if v_old_lifecycle_status in ('DECIDED','SUPERSEDED') then
    raise exception 'Readiness child evidence is immutable after evaluation finalization';
  end if;

  if tg_op = 'DELETE' then
    raise exception 'Readiness child records are immutable; create a new evaluation version instead';
  end if;

  select lifecycle_status
    into v_new_lifecycle_status
  from logistics.readiness_evaluation
  where readiness_evaluation_id = v_new_evaluation_id;

  if v_new_lifecycle_status in ('DECIDED','SUPERSEDED') then
    raise exception 'Readiness child cannot be re-parented into a finalized or superseded evaluation';
  end if;

  return new;
end;
$$;

create or replace function logistics.protect_readiness_human_decision()
returns trigger
language plpgsql
security invoker
set search_path = logistics, pg_catalog
as $$
begin
  raise exception 'Human authorization decisions are immutable';
end;
$$;

create trigger trg_protect_readiness_evaluation_lifecycle
before update or delete on logistics.readiness_evaluation
for each row
execute function logistics.protect_readiness_evaluation_lifecycle();

create trigger trg_protect_readiness_rule_result_lifecycle
before update or delete on logistics.readiness_rule_result
for each row
execute function logistics.protect_readiness_child_lifecycle();

create trigger trg_protect_readiness_evidence_lifecycle
before update or delete on logistics.readiness_evidence_reference
for each row
execute function logistics.protect_readiness_child_lifecycle();

create trigger trg_protect_readiness_human_decision
before update or delete on logistics.readiness_human_decision
for each row
execute function logistics.protect_readiness_human_decision();

-- 3. Human authorization separation of duties.
create or replace function logistics.enforce_readiness_authorization_sod()
returns trigger
language plpgsql
security invoker
set search_path = logistics, pg_catalog
as $$
declare
  v_evaluated_by bigint;
  v_lifecycle_status text;
begin
  select evaluated_by, lifecycle_status
    into v_evaluated_by, v_lifecycle_status
  from logistics.readiness_evaluation
  where readiness_evaluation_id = new.readiness_evaluation_id
  for update;

  if v_evaluated_by is null then
    raise exception 'Human authorization requires an identified readiness evaluator';
  end if;

  if new.decided_by = v_evaluated_by then
    raise exception 'Separation of duties violation: evaluator cannot authorize the same readiness evaluation';
  end if;

  if v_lifecycle_status not in ('REVIEW_REQUIRED','HUMAN_APPROVAL','EVALUATED') then
    raise exception 'Human authorization is not permitted from readiness lifecycle status %', v_lifecycle_status;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_readiness_authorization_sod
before insert on logistics.readiness_human_decision
for each row
execute function logistics.enforce_readiness_authorization_sod();

commit;
