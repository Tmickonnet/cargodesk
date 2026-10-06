BEGIN;

CREATE OR REPLACE FUNCTION logistics.transition_delivery(
  p_delivery_id bigint,
  p_target_status_code character varying,
  p_received_by character varying DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'logistics', 'pg_catalog'
AS $function$
DECLARE
  v_user_id bigint;
  v_delivery RECORD;
  v_target_status_id bigint;
  v_target_status_code character varying;
  v_now timestamptz := now();
  v_old_values jsonb;
  v_new_values jsonb;
  v_action_type character varying;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_user_id := logistics.current_user_id();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Application user context not found';
  END IF;

  IF NOT logistics.has_permission('DELIVERY_EDIT') THEN
    RAISE EXCEPTION 'Permission denied: DELIVERY_EDIT required';
  END IF;

  IF p_delivery_id IS NULL OR p_delivery_id <= 0 THEN
    RAISE EXCEPTION 'Delivery ID is required';
  END IF;

  IF NULLIF(btrim(p_target_status_code), '') IS NULL THEN
    RAISE EXCEPTION 'Target delivery status is required';
  END IF;

  IF p_received_by IS NOT NULL AND length(btrim(p_received_by)) > 255 THEN
    RAISE EXCEPTION 'Received-by value exceeds maximum length';
  END IF;

  SELECT d.*, s.status_code AS current_status_code, s.status_name AS current_status_name
  INTO v_delivery
  FROM logistics.delivery d
  JOIN logistics.delivery_statuses s
    ON s.delivery_status_id = d.delivery_status_id
  WHERE d.delivery_id = p_delivery_id
  FOR UPDATE OF d;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  SELECT delivery_status_id, status_code
  INTO v_target_status_id, v_target_status_code
  FROM logistics.delivery_statuses
  WHERE upper(status_code) = upper(btrim(p_target_status_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unsupported delivery target status: %', btrim(p_target_status_code);
  END IF;

  IF v_delivery.current_status_code = v_target_status_code THEN
    RAISE EXCEPTION 'Delivery is already in status %', v_target_status_code;
  END IF;

  IF NOT (
    (v_delivery.current_status_code = 'PLANNED' AND v_target_status_code = 'DISPATCHED')
    OR
    (v_delivery.current_status_code = 'DISPATCHED' AND v_target_status_code = 'IN_TRANSIT')
    OR
    (v_delivery.current_status_code = 'IN_TRANSIT' AND v_target_status_code = 'ARRIVED')
    OR
    (v_delivery.current_status_code = 'ARRIVED' AND v_target_status_code = 'DELIVERED')
  ) THEN
    RAISE EXCEPTION 'Invalid delivery status transition: % -> %',
      v_delivery.current_status_code, v_target_status_code;
  END IF;

  v_old_values := jsonb_build_object(
    'delivery_status_id', v_delivery.delivery_status_id,
    'status_code', v_delivery.current_status_code,
    'dispatch_date', v_delivery.dispatch_date,
    'actual_delivery_date', v_delivery.actual_delivery_date,
    'received_by', v_delivery.received_by
  );

  UPDATE logistics.delivery
  SET
    delivery_status_id = v_target_status_id,
    dispatch_date = CASE
      WHEN v_target_status_code = 'DISPATCHED' THEN COALESCE(dispatch_date, v_now)
      ELSE dispatch_date
    END,
    actual_delivery_date = CASE
      WHEN v_target_status_code = 'DELIVERED' THEN COALESCE(actual_delivery_date, v_now)
      ELSE actual_delivery_date
    END,
    received_by = CASE
      WHEN v_target_status_code = 'DELIVERED' AND p_received_by IS NOT NULL
        THEN NULLIF(btrim(p_received_by), '')
      ELSE received_by
    END,
    updated_at = v_now
  WHERE delivery_id = p_delivery_id;

  v_new_values := jsonb_build_object(
    'delivery_status_id', v_target_status_id,
    'status_code', v_target_status_code,
    'dispatch_date', CASE
      WHEN v_target_status_code = 'DISPATCHED' THEN COALESCE(v_delivery.dispatch_date, v_now)
      ELSE v_delivery.dispatch_date
    END,
    'actual_delivery_date', CASE
      WHEN v_target_status_code = 'DELIVERED' THEN COALESCE(v_delivery.actual_delivery_date, v_now)
      ELSE v_delivery.actual_delivery_date
    END,
    'received_by', CASE
      WHEN v_target_status_code = 'DELIVERED' AND p_received_by IS NOT NULL
        THEN NULLIF(btrim(p_received_by), '')
      ELSE v_delivery.received_by
    END
  );

  v_action_type := 'DELIVERY_STATUS_' || v_target_status_code;

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
    v_action_type,
    'delivery',
    p_delivery_id,
    v_delivery.delivery_reference,
    v_now,
    v_old_values,
    v_new_values,
    format('Delivery status transitioned from %s to %s.', v_delivery.current_status_code, v_target_status_code)
  );

  RETURN jsonb_build_object(
    'success', true,
    'delivery_id', p_delivery_id,
    'delivery_reference', v_delivery.delivery_reference,
    'previous_status_code', v_delivery.current_status_code,
    'delivery_status_code', v_target_status_code,
    'transitioned_at', v_now
  );
END;
$function$;

REVOKE ALL ON FUNCTION logistics.transition_delivery(bigint, character varying, character varying) FROM PUBLIC;
REVOKE ALL ON FUNCTION logistics.transition_delivery(bigint, character varying, character varying) FROM anon;
GRANT EXECUTE ON FUNCTION logistics.transition_delivery(bigint, character varying, character varying) TO authenticated;

COMMENT ON FUNCTION logistics.transition_delivery(bigint, character varying, character varying)
IS 'Controlled Delivery lifecycle transition requiring DELIVERY_EDIT; validates supported transitions, updates lifecycle timestamps, and records an audit event.';

COMMIT;
