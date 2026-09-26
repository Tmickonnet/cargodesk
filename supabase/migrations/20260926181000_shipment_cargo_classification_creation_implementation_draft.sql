BEGIN;

CREATE OR REPLACE FUNCTION logistics.create_shipment_cargo_classification(
  p_shipment_cargo_id bigint,
  p_product_id bigint,
  p_classification_record_id bigint,
  p_source_code varchar DEFAULT 'HUMAN_ENTERED'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'logistics', 'pg_catalog'
AS $$
DECLARE
  v_user_id bigint;
  v_cargo logistics.shipment_cargo%ROWTYPE;
  v_product logistics.product%ROWTYPE;
  v_record logistics.classification_record%ROWTYPE;
  v_edition logistics.classification_edition%ROWTYPE;
  v_system logistics.classification_system%ROWTYPE;
  v_jurisdiction logistics.classification_jurisdiction%ROWTYPE;
  v_id bigint;
  v_now timestamptz := now();
  v_source varchar := upper(trim(coalesce(p_source_code, 'HUMAN_ENTERED')));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_user_id := logistics.current_user_id();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Application user context could not be resolved';
  END IF;

  IF NOT logistics.has_permission('CARGO_EDIT') THEN
    RAISE EXCEPTION 'Permission denied: CARGO_EDIT';
  END IF;

  IF v_source NOT IN ('MASTER_REFERENCE','HUMAN_ENTERED','IMPORTED_REFERENCE','DOCUMENT_DERIVED','SYSTEM_SUGGESTED') THEN
    RAISE EXCEPTION 'Invalid classification creation source';
  END IF;

  SELECT * INTO v_cargo
  FROM logistics.shipment_cargo
  WHERE shipment_cargo_id = p_shipment_cargo_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shipment cargo not found';
  END IF;

  SELECT * INTO v_product
  FROM logistics.product
  WHERE product_id = p_product_id
    AND is_active = true
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active product not found';
  END IF;

  SELECT * INTO v_record
  FROM logistics.classification_record
  WHERE classification_record_id = p_classification_record_id
    AND status_code = 'ACTIVE'
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active classification record not found';
  END IF;

  SELECT * INTO v_edition
  FROM logistics.classification_edition
  WHERE classification_edition_id = v_record.classification_edition_id
    AND status_code = 'ACTIVE'
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active classification edition not found';
  END IF;

  SELECT * INTO v_system
  FROM logistics.classification_system
  WHERE classification_system_id = v_edition.classification_system_id
    AND is_active = true
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active classification system not found';
  END IF;

  SELECT * INTO v_jurisdiction
  FROM logistics.classification_jurisdiction
  WHERE classification_jurisdiction_id = v_record.classification_jurisdiction_id
    AND is_active = true
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active classification jurisdiction not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM logistics.shipment_cargo_classification scc
    WHERE scc.shipment_cargo_id = p_shipment_cargo_id
      AND scc.product_id = p_product_id
      AND scc.classification_record_id = p_classification_record_id
      AND scc.status_code IN ('SUGGESTED','UNDER_REVIEW','VERIFIED')
  ) THEN
    RAISE EXCEPTION 'An active or pending classification already exists for this cargo, product and classification record';
  END IF;

  INSERT INTO logistics.shipment_cargo_classification (
    shipment_cargo_id,
    product_id,
    classification_record_id,
    classification_code_snapshot,
    classification_description_snapshot,
    classification_system_code_snapshot,
    classification_edition_code_snapshot,
    jurisdiction_code_snapshot,
    status_code,
    source_code,
    created_at,
    updated_at
  )
  VALUES (
    p_shipment_cargo_id,
    p_product_id,
    p_classification_record_id,
    v_record.classification_code,
    v_record.official_description,
    v_system.system_code,
    v_edition.edition_code,
    v_jurisdiction.jurisdiction_code,
    'SUGGESTED',
    v_source,
    v_now,
    v_now
  )
  RETURNING shipment_cargo_classification_id INTO v_id;

  INSERT INTO logistics.audit_log (
    user_id, action_type, table_name, record_id, record_reference,
    action_timestamp, old_values, new_values, description
  )
  VALUES (
    v_user_id,
    'SHIPMENT_CARGO_CLASSIFICATION_CREATED',
    'shipment_cargo_classification',
    v_id,
    'SHIPMENT-CARGO-CLASSIFICATION-' || v_id,
    v_now,
    NULL,
    jsonb_build_object(
      'shipment_cargo_classification_id', v_id,
      'shipment_cargo_id', p_shipment_cargo_id,
      'product_id', p_product_id,
      'classification_record_id', p_classification_record_id,
      'status_code', 'SUGGESTED',
      'source_code', v_source
    ),
    'Shipment cargo classification proposal created through controlled workflow.'
  );

  RETURN jsonb_build_object(
    'success', true,
    'shipment_cargo_classification_id', v_id,
    'shipment_cargo_id', p_shipment_cargo_id,
    'product_id', p_product_id,
    'classification_record_id', p_classification_record_id,
    'status_code', 'SUGGESTED',
    'source_code', v_source,
    'created_at', v_now,
    'updated_at', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION logistics.create_shipment_cargo_classification(bigint,bigint,bigint,varchar) FROM PUBLIC;
REVOKE ALL ON FUNCTION logistics.create_shipment_cargo_classification(bigint,bigint,bigint,varchar) FROM anon;
GRANT EXECUTE ON FUNCTION logistics.create_shipment_cargo_classification(bigint,bigint,bigint,varchar) TO authenticated;

COMMENT ON FUNCTION logistics.create_shipment_cargo_classification(bigint,bigint,bigint,varchar)
IS 'Controlled creation of a shipment cargo classification proposal. Never verifies classification.';

COMMIT;
