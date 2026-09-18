-- SEC-182 candidate only: controlled shipment exception creation
-- NOT FOR PRODUCTION APPLICATION YET.
-- This function intentionally does not hard-code the proposed exception-type/severity
-- catalogue from SEC-181 because those values remain governance proposals.

create or replace function logistics.create_shipment_exception(
    p_shipment_id bigint,
    p_exception_reference text,
    p_exception_type text,
    p_severity text default null,
    p_description text default null,
    p_container_id bigint default null,
    p_shipment_leg_id bigint default null,
    p_location_id bigint default null,
    p_responsible_party_id bigint default null,
    p_remarks text default null
)
returns jsonb
language plpgsql
security definer
set search_path = logistics, pg_catalog
as $function$
declare
    v_user_id bigint;
    v_exception_id bigint;
    v_reference text := nullif(btrim(p_exception_reference), '');
    v_type text := nullif(btrim(p_exception_type), '');
    v_severity text := nullif(btrim(p_severity), '');
    v_description text := nullif(btrim(p_description), '');
    v_remarks text := nullif(btrim(p_remarks), '');
begin
    -- Authentication is based on the caller's Supabase Auth identity.
    if auth.uid() is null then
        raise exception using errcode = 'P0001',
            message = 'EXCEPTION_CREATE_UNAUTHENTICATED';
    end if;

    -- Resolve the caller to an active CargoDesk user.
    v_user_id := logistics.current_user_id();

    if v_user_id is null then
        raise exception using errcode = 'P0001',
            message = 'EXCEPTION_CREATE_USER_NOT_FOUND';
    end if;

    -- Preserve the existing RBAC boundary.
    if not logistics.has_permission('EXCEPTION_MANAGE') then
        raise exception using errcode = 'P0001',
            message = 'EXCEPTION_CREATE_FORBIDDEN';
    end if;

    -- Required business inputs.
    if p_shipment_id is null or p_shipment_id <= 0 then
        raise exception using errcode = 'P0001',
            message = 'EXCEPTION_SHIPMENT_REQUIRED';
    end if;

    if v_reference is null then
        raise exception using errcode = 'P0001',
            message = 'EXCEPTION_REFERENCE_REQUIRED';
    end if;

    if length(v_reference) > 255 then
        raise exception using errcode = 'P0001',
            message = 'EXCEPTION_REFERENCE_TOO_LONG';
    end if;

    if v_type is null then
        raise exception using errcode = 'P0001',
            message = 'EXCEPTION_TYPE_REQUIRED';
    end if;

    if length(v_type) > 255 then
        raise exception using errcode = 'P0001',
            message = 'EXCEPTION_TYPE_TOO_LONG';
    end if;

    if v_severity is not null and length(v_severity) > 50 then
        raise exception using errcode = 'P0001',
            message = 'EXCEPTION_SEVERITY_TOO_LONG';
    end if;

    if v_description is null then
        raise exception using errcode = 'P0001',
            message = 'EXCEPTION_DESCRIPTION_REQUIRED';
    end if;

    if length(v_description) > 10000 then
        raise exception using errcode = 'P0001',
            message = 'EXCEPTION_DESCRIPTION_TOO_LONG';
    end if;

    if v_remarks is not null and length(v_remarks) > 10000 then
        raise exception using errcode = 'P0001',
            message = 'EXCEPTION_REMARKS_TOO_LONG';
    end if;

    -- Authoritative shipment validation.
    if not exists (
        select 1
        from logistics.shipments s
        where s.shipment_id = p_shipment_id
    ) then
        raise exception using errcode = 'P0001',
            message = 'EXCEPTION_SHIPMENT_NOT_FOUND';
    end if;

    -- Optional related objects must exist and belong to the same shipment.
    if p_container_id is not null then
        if not exists (
            select 1
            from logistics.shipment_container sc
            where sc.shipment_id = p_shipment_id
              and sc.container_id = p_container_id
        ) then
            raise exception using errcode = 'P0001',
                message = 'EXCEPTION_CONTAINER_NOT_BOUND_TO_SHIPMENT';
        end if;
    end if;

    if p_shipment_leg_id is not null then
        if not exists (
            select 1
            from logistics.shipment_legs sl
            where sl.shipment_id = p_shipment_id
              and sl.shipment_leg_id = p_shipment_leg_id
        ) then
            raise exception using errcode = 'P0001',
                message = 'EXCEPTION_LEG_NOT_BOUND_TO_SHIPMENT';
        end if;
    end if;

    if p_location_id is not null then
        if not exists (
            select 1
            from logistics.locations l
            where l.location_id = p_location_id
        ) then
            raise exception using errcode = 'P0001',
                message = 'EXCEPTION_LOCATION_NOT_FOUND';
        end if;
    end if;

    if p_responsible_party_id is not null then
        if not exists (
            select 1
            from logistics.parties p
            where p.party_id = p_responsible_party_id
        ) then
            raise exception using errcode = 'P0001',
                message = 'EXCEPTION_RESPONSIBLE_PARTY_NOT_FOUND';
        end if;
    end if;

    -- Status, reported_at, created_at, updated_at, created-by identity and audit
    -- identity are deliberately not caller-controlled.
    insert into logistics.shipment_exception (
        shipment_id,
        container_id,
        shipment_leg_id,
        exception_reference,
        exception_type,
        severity,
        description,
        location_id,
        responsible_party_id,
        remarks
    )
    values (
        p_shipment_id,
        p_container_id,
        p_shipment_leg_id,
        v_reference,
        v_type,
        v_severity,
        v_description,
        p_location_id,
        p_responsible_party_id,
        v_remarks
    )
    returning shipment_exception_id into v_exception_id;

    -- The audit record is part of the same transaction. If it fails,
    -- the exception creation fails with it.
    insert into logistics.audit_log (
        user_id,
        action_type,
        table_name,
        record_id,
        record_reference,
        action_timestamp,
        old_values,
        new_values,
        description
    )
    values (
        v_user_id,
        'EXCEPTION_CREATED',
        'shipment_exception',
        v_exception_id,
        v_reference,
        clock_timestamp(),
        null,
        jsonb_build_object(
            'shipment_id', p_shipment_id,
            'container_id', p_container_id,
            'shipment_leg_id', p_shipment_leg_id,
            'exception_reference', v_reference,
            'exception_type', v_type,
            'severity', v_severity,
            'description', v_description,
            'location_id', p_location_id,
            'responsible_party_id', p_responsible_party_id,
            'status', 'OPEN',
            'created_by_user_id', v_user_id
        ),
        'Controlled shipment exception created through authorized CargoDesk workflow.'
    );

    return jsonb_build_object(
        'success', true,
        'code', 'EXCEPTION_CREATED',
        'shipment_exception_id', v_exception_id,
        'shipment_id', p_shipment_id,
        'exception_reference', v_reference,
        'exception_type', v_type,
        'severity', v_severity,
        'status', 'OPEN',
        'created_by_user_id', v_user_id
    );
end;
$function$;

revoke execute on function logistics.create_shipment_exception(
    bigint, text, text, text, text, bigint, bigint, bigint, bigint, text
) from public, anon;

grant execute on function logistics.create_shipment_exception(
    bigint, text, text, text, text, bigint, bigint, bigint, bigint, text
) to authenticated;
