-- Controlled Shipment Cargo Creation
-- Scope:
--   - Adds one narrowly scoped cargo-line creation RPC.
--   - No table, column, role, permission, RLS policy, trigger, index, storage,
--     or direct authenticated shipment_cargo write-grant changes.
--   - Existing shipment_cargo structure and CARGO_EDIT authorization are preserved.
--   - Cargo creation and its audit entry occur in one transaction.

BEGIN;

CREATE OR REPLACE FUNCTION logistics.create_shipment_cargo(
    p_shipment_id bigint,
    p_commodity_id bigint,
    p_cargo_description varchar DEFAULT NULL,
    p_hs_code varchar DEFAULT NULL,
    p_packaging_type_id bigint DEFAULT NULL,
    p_quantity numeric DEFAULT NULL,
    p_quantity_uom_id bigint DEFAULT NULL,
    p_net_weight numeric DEFAULT NULL,
    p_gross_weight numeric DEFAULT NULL,
    p_weight_uom_id bigint DEFAULT NULL,
    p_volume numeric DEFAULT NULL,
    p_volume_uom_id bigint DEFAULT NULL,
    p_marks_and_numbers text DEFAULT NULL,
    p_lot_number varchar DEFAULT NULL,
    p_production_date date DEFAULT NULL,
    p_expiry_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'logistics', 'pg_catalog'
AS $function$
DECLARE
    v_user_id bigint;
    v_shipment_cargo_id bigint;
    v_now timestamptz := clock_timestamp();
    v_cargo_description varchar := NULLIF(btrim(p_cargo_description), '');
    v_hs_code varchar := NULLIF(btrim(p_hs_code), '');
    v_marks_and_numbers text := NULLIF(btrim(p_marks_and_numbers), '');
    v_lot_number varchar := NULLIF(btrim(p_lot_number), '');
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CARGO_CREATE_UNAUTHENTICATED';
    END IF;

    v_user_id := logistics.current_user_id();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CARGO_CREATE_USER_NOT_FOUND';
    END IF;

    IF NOT logistics.has_permission('CARGO_EDIT') THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CARGO_CREATE_FORBIDDEN';
    END IF;

    IF p_shipment_id IS NULL OR p_shipment_id <= 0 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'SHIPMENT_REQUIRED';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM logistics.shipments
        WHERE shipment_id = p_shipment_id
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'SHIPMENT_NOT_FOUND';
    END IF;

    IF p_commodity_id IS NULL OR p_commodity_id <= 0 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'COMMODITY_REQUIRED';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM logistics.commodities
        WHERE commodity_id = p_commodity_id AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'COMMODITY_NOT_FOUND';
    END IF;

    IF p_packaging_type_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM logistics.packaging_types
        WHERE packaging_type_id = p_packaging_type_id AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PACKAGING_TYPE_NOT_FOUND';
    END IF;

    IF p_quantity_uom_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM logistics.unit_of_measures
        WHERE uom_id = p_quantity_uom_id AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'QUANTITY_UOM_NOT_FOUND';
    END IF;

    IF p_weight_uom_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM logistics.unit_of_measures
        WHERE uom_id = p_weight_uom_id AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'WEIGHT_UOM_NOT_FOUND';
    END IF;

    IF p_volume_uom_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM logistics.unit_of_measures
        WHERE uom_id = p_volume_uom_id AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'VOLUME_UOM_NOT_FOUND';
    END IF;

    IF p_quantity IS NOT NULL AND p_quantity < 0 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'QUANTITY_NEGATIVE';
    END IF;

    IF p_net_weight IS NOT NULL AND p_net_weight < 0 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'NET_WEIGHT_NEGATIVE';
    END IF;

    IF p_gross_weight IS NOT NULL AND p_gross_weight < 0 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'GROSS_WEIGHT_NEGATIVE';
    END IF;

    IF p_volume IS NOT NULL AND p_volume < 0 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'VOLUME_NEGATIVE';
    END IF;

    IF v_cargo_description IS NOT NULL AND length(v_cargo_description) > 4000 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CARGO_DESCRIPTION_TOO_LONG';
    END IF;

    IF v_marks_and_numbers IS NOT NULL AND length(v_marks_and_numbers) > 4000 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'MARKS_AND_NUMBERS_TOO_LONG';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('shipment_cargo_id_generation', 0));

    SELECT COALESCE(MAX(shipment_cargo_id), 0) + 1
    INTO v_shipment_cargo_id
    FROM logistics.shipment_cargo;

    INSERT INTO logistics.shipment_cargo (
        shipment_cargo_id,
        shipment_id,
        commodity_id,
        cargo_description,
        hs_code,
        packaging_type_id,
        quantity,
        quantity_uom_id,
        net_weight,
        gross_weight,
        weight_uom_id,
        volume,
        volume_uom_id,
        marks_and_numbers,
        lot_number,
        production_date,
        expiry_date,
        created_at,
        updated_at
    )
    VALUES (
        v_shipment_cargo_id,
        p_shipment_id,
        p_commodity_id,
        v_cargo_description,
        v_hs_code,
        p_packaging_type_id,
        p_quantity,
        p_quantity_uom_id,
        p_net_weight,
        p_gross_weight,
        p_weight_uom_id,
        p_volume,
        p_volume_uom_id,
        v_marks_and_numbers,
        v_lot_number,
        p_production_date,
        p_expiry_date,
        v_now,
        v_now
    );

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
        'SHIPMENT_CARGO_CREATED',
        'shipment_cargo',
        v_shipment_cargo_id,
        'SHIPMENT-CARGO-' || v_shipment_cargo_id,
        v_now,
        NULL,
        jsonb_build_object(
            'shipment_cargo_id', v_shipment_cargo_id,
            'shipment_id', p_shipment_id,
            'commodity_id', p_commodity_id
        ),
        format(
            'Cargo line %s created through controlled shipment-cargo creation workflow for shipment %s.',
            v_shipment_cargo_id,
            p_shipment_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'shipment_cargo_id', v_shipment_cargo_id,
        'shipment_id', p_shipment_id,
        'commodity_id', p_commodity_id,
        'created_at', v_now,
        'updated_at', v_now
    );
END;
$function$;

REVOKE ALL ON FUNCTION logistics.create_shipment_cargo(
    bigint, bigint, varchar, varchar, bigint, numeric, bigint, numeric, numeric,
    bigint, numeric, bigint, text, varchar, date, date
) FROM PUBLIC;

REVOKE ALL ON FUNCTION logistics.create_shipment_cargo(
    bigint, bigint, varchar, varchar, bigint, numeric, bigint, numeric, numeric,
    bigint, numeric, bigint, text, varchar, date, date
) FROM anon;

GRANT EXECUTE ON FUNCTION logistics.create_shipment_cargo(
    bigint, bigint, varchar, varchar, bigint, numeric, bigint, numeric, numeric,
    bigint, numeric, bigint, text, varchar, date, date
) TO authenticated;

COMMENT ON FUNCTION logistics.create_shipment_cargo(
    bigint, bigint, varchar, varchar, bigint, numeric, bigint, numeric, numeric,
    bigint, numeric, bigint, text, varchar, date, date
) IS 'Controlled shipment cargo-line creation boundary. Requires authenticated CARGO_EDIT authorization and writes a SHIPMENT_CARGO_CREATED audit entry atomically.';

COMMIT;
