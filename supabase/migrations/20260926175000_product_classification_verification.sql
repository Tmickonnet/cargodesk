BEGIN;
CREATE OR REPLACE FUNCTION logistics.verify_shipment_cargo_classification(p_shipment_cargo_classification_id bigint,p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'logistics','pg_catalog' AS $$
DECLARE v_user_id bigint; v_row logistics.shipment_cargo_classification%ROWTYPE; v_now timestamptz:=now();
BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
v_user_id:=logistics.current_user_id(); IF v_user_id IS NULL THEN RAISE EXCEPTION 'Application user context could not be resolved'; END IF;
IF NOT logistics.has_permission('SHIPMENT_CLASSIFICATION_VERIFY') THEN RAISE EXCEPTION 'Permission denied: SHIPMENT_CLASSIFICATION_VERIFY'; END IF;
SELECT * INTO v_row FROM logistics.shipment_cargo_classification WHERE shipment_cargo_classification_id=p_shipment_cargo_classification_id FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Shipment cargo classification not found'; END IF;
IF v_row.status_code <> 'UNDER_REVIEW' THEN RAISE EXCEPTION 'Classification must be UNDER_REVIEW before verification'; END IF;
UPDATE logistics.shipment_cargo_classification SET status_code='VERIFIED',verified_by=v_user_id,verified_at=v_now,updated_at=v_now WHERE shipment_cargo_classification_id=p_shipment_cargo_classification_id;
INSERT INTO logistics.audit_log(user_id,action_type,table_name,record_id,record_reference,action_timestamp,old_values,new_values,description)
VALUES(v_user_id,'SHIPMENT_CARGO_CLASSIFICATION_VERIFIED','shipment_cargo_classification',p_shipment_cargo_classification_id,'SHIPMENT-CARGO-CLASSIFICATION-'||p_shipment_cargo_classification_id,v_now,jsonb_build_object('status_code',v_row.status_code,'verified_by',v_row.verified_by,'verified_at',v_row.verified_at),jsonb_build_object('status_code','VERIFIED','verified_by',v_user_id,'verified_at',v_now),CASE WHEN NULLIF(trim(p_reason),'') IS NULL THEN 'Shipment cargo classification verified through controlled workflow.' ELSE 'Shipment cargo classification verified through controlled workflow. Reason: '||trim(p_reason) END);
RETURN jsonb_build_object('success',true,'shipment_cargo_classification_id',p_shipment_cargo_classification_id,'status_code','VERIFIED','verified_by',v_user_id,'verified_at',v_now);
END; $$;
REVOKE ALL ON FUNCTION logistics.verify_shipment_cargo_classification(bigint,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION logistics.verify_shipment_cargo_classification(bigint,text) FROM anon;
GRANT EXECUTE ON FUNCTION logistics.verify_shipment_cargo_classification(bigint,text) TO authenticated;
COMMENT ON FUNCTION logistics.verify_shipment_cargo_classification(bigint,text) IS 'Controlled classification verification transition requiring SHIPMENT_CLASSIFICATION_VERIFY.';
COMMIT;
