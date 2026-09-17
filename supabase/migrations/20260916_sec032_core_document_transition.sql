-- SEC-032 — Core document lifecycle transition function
-- Scope: core lifecycle only. No AMEND/EXPIRE/CANCEL paths are implemented here.
-- This migration intentionally changes no tables, RLS policies, Storage policies, or roles.
-- Apply to a reviewed/test environment first; do not treat this file as production approval.

BEGIN;

CREATE OR REPLACE FUNCTION logistics.request_document_transition(
    p_document_id bigint,
    p_transition_code text,
    p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'logistics', 'pg_catalog'
AS $function$
DECLARE
    v_user_id bigint;
    v_document_id bigint;
    v_current_status_id bigint;
    v_current_status_code text;
    v_target_status_id bigint;
    v_target_status_code text;
    v_transition_code text := upper(trim(COALESCE(p_transition_code, '')));
    v_reason text := NULLIF(btrim(p_reason), '');
    v_required_permission text;
    v_action_type text;
    v_now timestamptz := clock_timestamp();
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DOCUMENT_TRANSITION_UNAUTHENTICATED';
    END IF;

    IF p_document_id IS NULL OR p_document_id <= 0 THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DOCUMENT_NOT_FOUND';
    END IF;

    IF v_transition_code NOT IN ('SUBMIT', 'START_REVIEW', 'APPROVE', 'REJECT', 'ISSUE') THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'INVALID_TRANSITION_CODE';
    END IF;

    IF v_transition_code = 'REJECT' AND v_reason IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'TRANSITION_REASON_REQUIRED';
    END IF;

    IF v_reason IS NOT NULL AND length(v_reason) > 2000 THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'TRANSITION_REASON_TOO_LONG';
    END IF;

    SELECT logistics.current_user_id()
    INTO v_user_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DOCUMENT_TRANSITION_USER_NOT_FOUND';
    END IF;

    SELECT
        d.document_id,
        d.document_status_id,
        ds.status_code
    INTO
        v_document_id,
        v_current_status_id,
        v_current_status_code
    FROM logistics.documents d
    LEFT JOIN logistics.document_statuses ds
      ON ds.document_status_id = d.document_status_id
    WHERE d.document_id = p_document_id
    FOR UPDATE OF d;

    IF v_document_id IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DOCUMENT_NOT_FOUND';
    END IF;

    IF v_current_status_code IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DOCUMENT_STATUS_NOT_FOUND';
    END IF;

    CASE v_transition_code
        WHEN 'SUBMIT' THEN
            IF v_current_status_code <> 'DRAFT' THEN
                RAISE EXCEPTION USING
                    ERRCODE = 'P0001',
                    MESSAGE = 'INVALID_DOCUMENT_TRANSITION';
            END IF;
            v_target_status_code := 'SUBMITTED';
            v_required_permission := 'DOCUMENT_EDIT';
            v_action_type := 'DOCUMENT_STATUS_SUBMITTED';

        WHEN 'START_REVIEW' THEN
            IF v_current_status_code <> 'SUBMITTED' THEN
                RAISE EXCEPTION USING
                    ERRCODE = 'P0001',
                    MESSAGE = 'INVALID_DOCUMENT_TRANSITION';
            END IF;
            v_target_status_code := 'UNDER_REVIEW';
            v_required_permission := 'DOCUMENT_VERIFY';
            v_action_type := 'DOCUMENT_STATUS_REVIEW_STARTED';

        WHEN 'APPROVE' THEN
            IF v_current_status_code <> 'UNDER_REVIEW' THEN
                RAISE EXCEPTION USING
                    ERRCODE = 'P0001',
                    MESSAGE = 'INVALID_DOCUMENT_TRANSITION';
            END IF;
            v_target_status_code := 'APPROVED';
            v_required_permission := 'DOCUMENT_VERIFY';
            v_action_type := 'DOCUMENT_STATUS_APPROVED';

        WHEN 'REJECT' THEN
            IF v_current_status_code <> 'UNDER_REVIEW' THEN
                RAISE EXCEPTION USING
                    ERRCODE = 'P0001',
                    MESSAGE = 'INVALID_DOCUMENT_TRANSITION';
            END IF;
            v_target_status_code := 'REJECTED';
            v_required_permission := 'DOCUMENT_VERIFY';
            v_action_type := 'DOCUMENT_STATUS_REJECTED';

        WHEN 'ISSUE' THEN
            IF v_current_status_code <> 'APPROVED' THEN
                RAISE EXCEPTION USING
                    ERRCODE = 'P0001',
                    MESSAGE = 'INVALID_DOCUMENT_TRANSITION';
            END IF;
            v_target_status_code := 'ISSUED';
            v_required_permission := 'DOCUMENT_VERIFY';
            v_action_type := 'DOCUMENT_STATUS_ISSUED';
    END CASE;

    IF NOT logistics.has_permission(v_required_permission) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DOCUMENT_TRANSITION_FORBIDDEN';
    END IF;

    SELECT document_status_id
    INTO v_target_status_id
    FROM logistics.document_statuses
    WHERE status_code = v_target_status_code
      AND active = TRUE;

    IF v_target_status_id IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DOCUMENT_STATUS_NOT_FOUND';
    END IF;

    UPDATE logistics.documents
    SET
        document_status_id = v_target_status_id,
        updated_at = v_now
    WHERE document_id = v_document_id;

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
        'documents',
        v_document_id,
        v_document_id::text,
        v_now,
        jsonb_build_object(
            'document_status_id', v_current_status_id,
            'document_status_code', v_current_status_code
        ),
        jsonb_build_object(
            'document_status_id', v_target_status_id,
            'document_status_code', v_target_status_code,
            'transition_code', v_transition_code,
            'reason', v_reason
        ),
        format(
            'Document %s transitioned from %s to %s using %s.',
            v_document_id,
            v_current_status_code,
            v_target_status_code,
            v_transition_code
        ) || CASE WHEN v_reason IS NOT NULL THEN ' Reason: ' || v_reason ELSE '' END
    );

    RETURN jsonb_build_object(
        'allowed', true,
        'document_id', v_document_id,
        'transition_code', v_transition_code,
        'previous_status_id', v_current_status_id,
        'previous_status_code', v_current_status_code,
        'new_status_id', v_target_status_id,
        'new_status_code', v_target_status_code,
        'actor_user_id', v_user_id,
        'action_type', v_action_type,
        'transitioned_at', v_now
    );
END;
$function$;

REVOKE EXECUTE ON FUNCTION logistics.request_document_transition(bigint, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION logistics.request_document_transition(bigint, text, text) TO authenticated;

COMMENT ON FUNCTION logistics.request_document_transition(bigint, text, text)
IS 'SEC-032 controlled core document lifecycle transition boundary. Implements DRAFT->SUBMITTED->UNDER_REVIEW->{APPROVED|REJECTED}->ISSUED only; AMEND/EXPIRE/CANCEL are intentionally deferred.';

COMMIT;
