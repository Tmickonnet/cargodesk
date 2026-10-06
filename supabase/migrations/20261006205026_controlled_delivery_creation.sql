BEGIN;

CREATE OR REPLACE FUNCTION logistics.create_delivery(
  p_shipment_id bigint,
  p_customer_id bigint DEFAULT NULL,
  p_transporter_id bigint DEFAULT NULL,
  p_origin_location_id bigint DEFAULT NULL,
  p_destination_location_id bigint DEFAULT NULL,
  p_planned_delivery_date timestamptz DEFAULT NULL,
  p_estimated_delivery_date timestamptz DEFAULT NULL,
  p_vehicle_reference varchar DEFAULT NULL,
  p_driver_name varchar DEFAULT NULL,
  p_driver_phone varchar DEFAULT NULL,
  p_delivery_instructions text DEFAULT NULL,
  p_remarks text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'logistics', 'pg_catalog'
AS $function$
DECLARE
  v_actor_user_id bigint;
  v_delivery_id bigint;
  v_delivery_reference varchar(100);
  v_delivery_status_id bigint;
  v_delivery_status_code varchar;
  v_year text := to_char(current_date, 'YYYY');
  v_next_number bigint;

  v_shipment_exists boolean;
  v_customer_exists boolean;
  v_transporter_exists boolean;
  v_origin_exists boolean;
  v_destination_exists boolean;

  v_delivery_created_at timestamptz;
  v_delivery_updated_at timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION
      USING ERRCODE = 'P0001',
      MESSAGE = 'Authentication is required to create a delivery.';
  END IF;

  v_actor_user_id := logistics.current_user_id();

  IF v_actor_user_id IS NULL THEN
    RAISE EXCEPTION
      USING ERRCODE = 'P0001',
      MESSAGE = 'Authenticated application user could not be resolved.';
  END IF;

  IF NOT logistics.has_permission('DELIVERY_CREATE') THEN
    RAISE EXCEPTION
      USING ERRCODE = 'P0001',
      MESSAGE = 'DELIVERY_CREATE permission is required.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM logistics.shipments s
    WHERE s.shipment_id = p_shipment_id
  )
  INTO v_shipment_exists;

  IF NOT v_shipment_exists THEN
    RAISE EXCEPTION
      USING ERRCODE = 'P0001',
      MESSAGE = format('Shipment %s does not exist.', p_shipment_id);
  END IF;

  IF p_customer_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM logistics.customers c
      WHERE c.customer_id = p_customer_id
        AND c.is_active = true
    )
    INTO v_customer_exists;

    IF NOT v_customer_exists THEN
      RAISE EXCEPTION
        USING ERRCODE = 'P0001',
        MESSAGE = format(
          'Customer %s does not exist or is inactive.',
          p_customer_id
        );
    END IF;
  END IF;

  IF p_transporter_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM logistics.transporters t
      WHERE t.transporter_id = p_transporter_id
        AND t.is_active = true
    )
    INTO v_transporter_exists;

    IF NOT v_transporter_exists THEN
      RAISE EXCEPTION
        USING ERRCODE = 'P0001',
        MESSAGE = format(
          'Transporter %s does not exist or is inactive.',
          p_transporter_id
        );
    END IF;
  END IF;

  IF p_origin_location_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM logistics.locations l
      WHERE l.location_id = p_origin_location_id
        AND l.is_active = true
    )
    INTO v_origin_exists;

    IF NOT v_origin_exists THEN
      RAISE EXCEPTION
        USING ERRCODE = 'P0001',
        MESSAGE = format(
          'Origin location %s does not exist or is inactive.',
          p_origin_location_id
        );
    END IF;
  END IF;

  IF p_destination_location_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM logistics.locations l
      WHERE l.location_id = p_destination_location_id
        AND l.is_active = true
    )
    INTO v_destination_exists;

    IF NOT v_destination_exists THEN
      RAISE EXCEPTION
        USING ERRCODE = 'P0001',
        MESSAGE = format(
          'Destination location %s does not exist or is inactive.',
          p_destination_location_id
        );
    END IF;
  END IF;

  IF p_planned_delivery_date IS NOT NULL
     AND p_estimated_delivery_date IS NOT NULL
     AND p_estimated_delivery_date < p_planned_delivery_date THEN
    RAISE EXCEPTION
      USING ERRCODE = 'P0001',
      MESSAGE = 'Estimated delivery date cannot be before planned delivery date.';
  END IF;

  IF p_vehicle_reference IS NOT NULL
     AND length(trim(p_vehicle_reference)) > 100 THEN
    RAISE EXCEPTION
      USING ERRCODE = 'P0001',
      MESSAGE = 'Vehicle reference cannot exceed 100 characters.';
  END IF;

  IF p_driver_name IS NOT NULL
     AND length(trim(p_driver_name)) > 150 THEN
    RAISE EXCEPTION
      USING ERRCODE = 'P0001',
      MESSAGE = 'Driver name cannot exceed 150 characters.';
  END IF;

  IF p_driver_phone IS NOT NULL
     AND length(trim(p_driver_phone)) > 50 THEN
    RAISE EXCEPTION
      USING ERRCODE = 'P0001',
      MESSAGE = 'Driver phone cannot exceed 50 characters.';
  END IF;

  SELECT
    ds.delivery_status_id,
    ds.status_code
  INTO
    v_delivery_status_id,
    v_delivery_status_code
  FROM logistics.delivery_statuses ds
  WHERE ds.status_code = 'PLANNED'
    AND ds.is_active = true
  ORDER BY ds.delivery_status_id
  LIMIT 1;

  IF v_delivery_status_id IS NULL THEN
    RAISE EXCEPTION
      USING ERRCODE = 'P0001',
      MESSAGE = 'Active PLANNED delivery status is not configured.';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('logistics.delivery.reference.' || v_year)
  );

  SELECT
    COALESCE(
      MAX(
        (
          substring(
            d.delivery_reference
            FROM '^DEL-CDG-' || v_year || '-([0-9]+)$'
          )
        )::bigint
      ),
      0
    ) + 1
  INTO v_next_number
  FROM logistics.delivery d
  WHERE d.delivery_reference ~ (
    '^DEL-CDG-' || v_year || '-[0-9]+$'
  );

  v_delivery_reference :=
    'DEL-CDG-' ||
    v_year ||
    '-' ||
    lpad(v_next_number::text, 4, '0');

  INSERT INTO logistics.delivery (
    shipment_id,
    delivery_reference,
    delivery_status_id,
    customer_id,
    transporter_id,
    origin_location_id,
    destination_location_id,
    planned_delivery_date,
    estimated_delivery_date,
    vehicle_reference,
    driver_name,
    driver_phone,
    delivery_instructions,
    remarks
  )
  VALUES (
    p_shipment_id,
    v_delivery_reference,
    v_delivery_status_id,
    p_customer_id,
    p_transporter_id,
    p_origin_location_id,
    p_destination_location_id,
    p_planned_delivery_date,
    p_estimated_delivery_date,
    NULLIF(trim(p_vehicle_reference), ''),
    NULLIF(trim(p_driver_name), ''),
    NULLIF(trim(p_driver_phone), ''),
    NULLIF(trim(p_delivery_instructions), ''),
    NULLIF(trim(p_remarks), '')
  )
  RETURNING
    delivery_id,
    created_at,
    updated_at
  INTO
    v_delivery_id,
    v_delivery_created_at,
    v_delivery_updated_at;

  INSERT INTO logistics.audit_log (
    user_id,
    action_type,
    table_name,
    record_id,
    record_reference,
    new_values,
    description
  )
  VALUES (
    v_actor_user_id,
    'DELIVERY_CREATED',
    'delivery',
    v_delivery_id,
    v_delivery_reference,
    jsonb_build_object(
      'delivery_id', v_delivery_id,
      'shipment_id', p_shipment_id,
      'delivery_reference', v_delivery_reference,
      'delivery_status_id', v_delivery_status_id,
      'delivery_status_code', v_delivery_status_code,
      'customer_id', p_customer_id,
      'transporter_id', p_transporter_id,
      'origin_location_id', p_origin_location_id,
      'destination_location_id', p_destination_location_id,
      'planned_delivery_date', p_planned_delivery_date,
      'estimated_delivery_date', p_estimated_delivery_date,
      'vehicle_reference', NULLIF(trim(p_vehicle_reference), ''),
      'driver_name', NULLIF(trim(p_driver_name), ''),
      'driver_phone', NULLIF(trim(p_driver_phone), '')
    ),
    'Delivery created in PLANNED status.'
  );

  RETURN jsonb_build_object(
    'success', true,
    'delivery_id', v_delivery_id,
    'delivery_reference', v_delivery_reference,
    'delivery_status_id', v_delivery_status_id,
    'delivery_status_code', v_delivery_status_code,
    'shipment_id', p_shipment_id,
    'actor_user_id', v_actor_user_id,
    'created_at', v_delivery_created_at,
    'updated_at', v_delivery_updated_at
  );
END;
$function$;

REVOKE ALL
ON FUNCTION logistics.create_delivery(
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  timestamptz,
  timestamptz,
  varchar,
  varchar,
  varchar,
  text,
  text
)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION logistics.create_delivery(
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  timestamptz,
  timestamptz,
  varchar,
  varchar,
  varchar,
  text,
  text
)
FROM anon;

GRANT EXECUTE
ON FUNCTION logistics.create_delivery(
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  timestamptz,
  timestamptz,
  varchar,
  varchar,
  varchar,
  text,
  text
)
TO authenticated;

COMMENT ON FUNCTION logistics.create_delivery(
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  timestamptz,
  timestamptz,
  varchar,
  varchar,
  varchar,
  text,
  text
)
IS 'Controlled Delivery creation. Requires DELIVERY_CREATE, creates an active PLANNED delivery, validates active references, generates a unique DEL-CDG-YYYY-NNNN reference, and records DELIVERY_CREATED audit evidence.';

COMMIT;
