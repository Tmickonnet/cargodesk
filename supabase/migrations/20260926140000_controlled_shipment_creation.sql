-- Controlled Shipment Creation
-- Scope:
--   - Adds one narrowly scoped shipment-creation RPC.
--   - No table, column, role, permission, RLS policy, trigger, index, storage,
--     or direct authenticated table-grant changes.
--   - Initial status is always DRAFT.
--   - Shipment number is generated server-side under a transaction advisory lock.
--   - Shipment creation and its audit entry occur in one transaction.

BEGIN;

CREATE OR REPLACE FUNCTION logistics.create_shipment(
    p_shipment_type_id bigint,
    p_customer_id bigint DEFAULT NULL,
    p_supplier_id bigint DEFAULT NULL,
    p_primary_transport_mode_id bigint DEFAULT NULL,
    p_incoterm_id bigint DEFAULT NULL,
    p_origin_location_id bigint DEFAULT NULL,
    p_destination_location_id bigint DEFAULT NULL,
    p_origin_country_id bigint DEFAULT NULL,
    p_destination_country_id bigint DEFAULT NULL,
    p_planned_departure_date date DEFAULT NULL,
    p_planned_arrival_date date DEFAULT NULL,
    p_cargo_ready_date date DEFAULT NULL,
    p_special_instructions text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'logistics', 'pg_catalog'
AS $function$
DECLARE
    v_user_id bigint;
    v_shipment_id bigint;
    v_status_id bigint;
    v_shipment_number text;
    v_prefix text;
    v_year text := to_char(current_date, 'YYYY');
    v_next_number integer;
    v_now timestamptz := clock_timestamp();
    v_instructions text := NULLIF(btrim(p_special_instructions), '');
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'SHIPMENT_CREATE_UNAUTHENTICATED';
    END IF;

    v_user_id := logistics.current_user_id();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'SHIPMENT_CREATE_USER_NOT_FOUND';
    END IF;

    IF NOT logistics.has_permission('SHIPMENT_CREATE') THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'SHIPMENT_CREATE_FORBIDDEN';
    END IF;

    IF p_shipment_type_id IS NULL OR p_shipment_type_id <= 0 THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'SHIPMENT_TYPE_REQUIRED';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM logistics.shipment_types
        WHERE shipment_type_id = p_shipment_type_id
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'SHIPMENT_TYPE_NOT_FOUND';
    END IF;

    IF p_customer_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM logistics.customers
        WHERE customer_id = p_customer_id
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'CUSTOMER_NOT_FOUND';
    END IF;

    IF p_supplier_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM logistics.suppliers
        WHERE supplier_id = p_supplier_id
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'SUPPLIER_NOT_FOUND';
    END IF;

    IF p_primary_transport_mode_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM logistics.transport_modes
        WHERE transport_mode_id = p_primary_transport_mode_id
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'TRANSPORT_MODE_NOT_FOUND';
    END IF;

    IF p_incoterm_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM logistics.incoterms
        WHERE incoterm_id = p_incoterm_id
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'INCOTERM_NOT_FOUND';
    END IF;

    IF p_origin_location_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM logistics.locations
        WHERE location_id = p_origin_location_id
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'ORIGIN_LOCATION_NOT_FOUND';
    END IF;

    IF p_destination_location_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM logistics.locations
        WHERE location_id = p_destination_location_id
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DESTINATION_LOCATION_NOT_FOUND';
    END IF;

    IF p_origin_country_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM logistics.countries
        WHERE country_id = p_origin_country_id
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'ORIGIN_COUNTRY_NOT_FOUND';
    END IF;

    IF p_destination_country_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM logistics.countries
        WHERE country_id = p_destination_country_id
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DESTINATION_COUNTRY_NOT_FOUND';
    END IF;

    IF v_instructions IS NOT NULL AND length(v_instructions) > 4000 THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'SPECIAL_INSTRUCTIONS_TOO_LONG';
    END IF;

    v_prefix := 'CDG-SHP-' || v_year || '-';

    PERFORM pg_advisory_xact_lock(hashtextextended(v_prefix, 0));

    SELECT COALESCE(
        MAX(substring(s.shipment_number from 14 for 4)::integer),
        0
    ) + 1
    INTO v_next_number
    FROM logistics.shipments s
    WHERE s.shipment_number ~ ('^' || v_prefix || '[0-9]{4}$');

    IF v_next_number > 9999 THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'SHIPMENT_NUMBER_EXHAUSTED';
    END IF;

    v_shipment_number := v_prefix || lpad(v_next_number::text, 4, '0');

    SELECT shipment_status_id
    INTO v_status_id
    FROM logistics.shipment_statuses
    WHERE status_code = 'DRAFT'
      AND is_active = TRUE;

    IF v_status_id IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DRAFT_STATUS_NOT_FOUND';
    END IF;

    INSERT INTO logistics.shipments (
        shipment_number,
        customer_id,
        supplier_id,
        shipment_type_id,
        shipment_status_id,
        primary_transport_mode_id,
        incoterm_id,
        origin_location_id,
        destination_location_id,
        origin_country_id,
        destination_country_id,
        planned_departure_date,
        planned_arrival_date,
        cargo_ready_date,
        special_instructions,
        created_at,
        updated_at
    )
    VALUES (
        v_shipment_number,
        p_customer_id,
        p_supplier_id,
        p_shipment_type_id,
        v_status_id,
        p_primary_transport_mode_id,
        p_incoterm_id,
        p_origin_location_id,
        p_destination_location_id,
        p_origin_country_id,
        p_destination_country_id,
        p_planned_departure_date,
        p_planned_arrival_date,
        p_cargo_ready_date,
        v_instructions,
        v_now,
        v_now
    )
    RETURNING shipment_id INTO v_shipment_id;

    INSERT INTO logistics.audit_log (
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
    VALUES (
        v_user_id,
        'SHIPMENT_CREATED',
        'shipments',
        v_shipment_id,
        v_shipment_number,
        v_now,
        NULL,
        jsonb_build_object(
            'shipment_id', v_shipment_id,
            'shipment_number', v_shipment_number,
            'shipment_status_id', v_status_id,
            'shipment_status_code', 'DRAFT'
        ),
        format(
            'Shipment %s created through controlled shipment-creation workflow.',
            v_shipment_number
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'shipment_id', v_shipment_id,
        'shipment_number', v_shipment_number,
        'shipment_status_id', v_status_id,
        'shipment_status_code', 'DRAFT',
        'actor_user_id', v_user_id,
        'created_at', v_now,
        'updated_at', v_now
    );
END;
$function$;

REVOKE ALL
ON FUNCTION logistics.create_shipment(bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, date, date, date, text)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION logistics.create_shipment(bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, date, date, date, text)
FROM anon;

GRANT EXECUTE
ON FUNCTION logistics.create_shipment(bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, date, date, date, text)
TO authenticated;

COMMENT ON FUNCTION logistics.create_shipment(bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, date, date, date, text)
IS 'Controlled shipment creation boundary. Requires authenticated SHIPMENT_CREATE authorization, creates DRAFT only, generates collision-safe CDG-SHP-YYYY-NNNN number, and writes a SHIPMENT_CREATED audit entry atomically.';

COMMIT;
