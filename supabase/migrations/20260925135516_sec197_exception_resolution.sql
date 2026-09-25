-- SEC-197: Controlled Exception Resolution
-- APPROVED BUSINESS RULES:
--   EXC-R05: OPEN -> RESOLVED only
--   EXC-R09: corrective_action is mandatory and non-blank
--   EXC-R13: audit action_type = EXCEPTION_RESOLVED
--
-- Scope:
--   - Adds one narrowly scoped exception-resolution function.
--   - No table, column, role, permission, RLS policy, trigger, index,
--     storage, or direct table-grant changes.
--   - Existing resolved test data is not modified.
--   - Exception update and audit record occur in one transaction.

BEGIN;

CREATE OR REPLACE FUNCTION logistics.resolve_exception(
    p_exception_id bigint,
    p_corrective_action text,
    p_remarks text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'logistics', 'pg_catalog'
AS $function$
DECLARE
    v_user_id bigint;
    v_exception logistics.shipment_exception%ROWTYPE;
    v_old_values jsonb;
    v_new_values jsonb;
    v_corrective_action text;
    v_remarks text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF p_exception_id IS NULL OR p_exception_id <= 0 THEN
        RAISE EXCEPTION 'Invalid exception identifier';
    END IF;

    v_user_id := logistics.current_user_id();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Active CargoDesk user required';
    END IF;

    IF NOT logistics.has_permission('EXCEPTION_MANAGE') THEN
        RAISE EXCEPTION 'EXCEPTION_MANAGE permission required';
    END IF;

    v_corrective_action := btrim(p_corrective_action);

    IF v_corrective_action IS NULL OR v_corrective_action = '' THEN
        RAISE EXCEPTION 'Corrective action is required';
    END IF;

    IF length(v_corrective_action) > 4000 THEN
        RAISE EXCEPTION 'Corrective action exceeds maximum length';
    END IF;

    v_remarks := CASE
        WHEN p_remarks IS NULL THEN NULL
        ELSE btrim(p_remarks)
    END;

    IF v_remarks IS NOT NULL AND length(v_remarks) > 4000 THEN
        RAISE EXCEPTION 'Remarks exceed maximum length';
    END IF;

    SELECT *
      INTO v_exception
      FROM logistics.shipment_exception
     WHERE shipment_exception_id = p_exception_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Exception not found';
    END IF;

    IF v_exception.status <> 'OPEN' THEN
        RAISE EXCEPTION
            'Exception % cannot be resolved from status %',
            v_exception.exception_reference,
            v_exception.status;
    END IF;

    v_old_values := jsonb_build_object(
        'status', v_exception.status,
        'resolved_at', v_exception.resolved_at,
        'resolved_by', v_exception.resolved_by,
        'corrective_action', v_exception.corrective_action,
        'remarks', v_exception.remarks
    );

    UPDATE logistics.shipment_exception
       SET status = 'RESOLVED',
           resolved_at = clock_timestamp(),
           resolved_by = v_user_id::text,
           corrective_action = v_corrective_action,
           remarks = v_remarks,
           updated_at = clock_timestamp()
     WHERE shipment_exception_id = p_exception_id;

    v_new_values := jsonb_build_object(
        'status', 'RESOLVED',
        'resolved_at', (
            SELECT resolved_at
              FROM logistics.shipment_exception
             WHERE shipment_exception_id = p_exception_id
        ),
        'resolved_by', v_user_id::text,
        'corrective_action', v_corrective_action,
        'remarks', v_remarks
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
        'EXCEPTION_RESOLVED',
        'shipment_exception',
        v_exception.shipment_exception_id,
        v_exception.exception_reference,
        clock_timestamp(),
        v_old_values,
        v_new_values,
        'Exception resolved through controlled exception-resolution workflow.'
    );

    RETURN jsonb_build_object(
        'success', true,
        'exception_id', v_exception.shipment_exception_id,
        'exception_reference', v_exception.exception_reference,
        'status', 'RESOLVED'
    );
END;
$function$;

REVOKE ALL
ON FUNCTION logistics.resolve_exception(bigint, text, text)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION logistics.resolve_exception(bigint, text, text)
FROM anon;

GRANT EXECUTE
ON FUNCTION logistics.resolve_exception(bigint, text, text)
TO authenticated;

COMMIT;
