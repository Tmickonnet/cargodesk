-- SEC-044: Controlled document expiration/cancellation authorization boundary
-- PREPARED FOR REVIEW ONLY. DO NOT APPLY TO PRODUCTION FROM THIS BRANCH.
-- Scope: dedicated DOCUMENT_EXPIRE/DOCUMENT_CANCEL permissions and controlled
-- ISSUED -> EXPIRED / ISSUED -> CANCELLED functions. No Storage changes,
-- no automatic expiry, no new tables, no production deployment.

BEGIN;

INSERT INTO logistics.permissions
    (permission_code, permission_name, module_name, action_name, description, active)
VALUES
    ('DOCUMENT_EXPIRE', 'Document Expiration', 'DOCUMENTS', 'EXPIRE',
     'Authorize controlled expiration of an issued document.', TRUE),
    ('DOCUMENT_CANCEL', 'Document Cancellation', 'DOCUMENTS', 'CANCEL',
     'Authorize controlled cancellation of an issued document.', TRUE)
ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO logistics.role_permissions (role_id, permission_id, granted)
SELECT r.role_id, p.permission_id, TRUE
FROM logistics.roles r
JOIN logistics.permissions p
  ON p.permission_code IN ('DOCUMENT_EXPIRE', 'DOCUMENT_CANCEL')
WHERE r.role_code IN ('SYSTEM_ADMIN', 'LOGISTICS_ADMIN')
  AND r.active = TRUE
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION logistics.request_document_expiration(
    p_document_id bigint,
    p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'logistics', 'pg_catalog'
AS $function$
DECLARE
    v_user_id bigint;
    v_document logistics.documents%ROWTYPE;
    v_old_status_code text;
    v_new_status_id bigint;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'DOCUMENT_TRANSITION_UNAUTHENTICATED'; END IF;
    SELECT u.user_id INTO v_user_id FROM logistics.users u
     WHERE u.auth_user_id = auth.uid() AND u.active = TRUE;
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'DOCUMENT_TRANSITION_USER_NOT_FOUND'; END IF;
    IF NOT logistics.has_permission('DOCUMENT_EXPIRE') THEN RAISE EXCEPTION 'DOCUMENT_TRANSITION_FORBIDDEN'; END IF;
    IF p_reason IS NULL OR btrim(p_reason) = '' THEN RAISE EXCEPTION 'TRANSITION_REASON_REQUIRED'; END IF;

    SELECT d.* INTO v_document FROM logistics.documents d
     WHERE d.document_id = p_document_id AND d.is_current_version = TRUE FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'DOCUMENT_NOT_FOUND'; END IF;

    SELECT ds.status_code INTO v_old_status_code FROM logistics.document_statuses ds
     WHERE ds.document_status_id = v_document.document_status_id AND ds.is_active = TRUE;
    IF v_old_status_code IS NULL THEN RAISE EXCEPTION 'DOCUMENT_STATUS_NOT_FOUND'; END IF;
    IF v_old_status_code <> 'ISSUED' THEN RAISE EXCEPTION 'INVALID_DOCUMENT_TRANSITION'; END IF;

    SELECT ds.document_status_id INTO v_new_status_id FROM logistics.document_statuses ds
     WHERE ds.status_code = 'EXPIRED' AND ds.is_active = TRUE;
    IF v_new_status_id IS NULL THEN RAISE EXCEPTION 'DOCUMENT_STATUS_NOT_FOUND'; END IF;

    UPDATE logistics.documents SET document_status_id = v_new_status_id, updated_at = now()
     WHERE document_id = v_document.document_id;

    INSERT INTO logistics.audit_log
        (user_id, action_type, table_name, record_id, record_reference,
         old_values, new_values, description)
    VALUES
        (v_user_id, 'DOCUMENT_STATUS_EXPIRED', 'documents', v_document.document_id,
         v_document.document_number,
         jsonb_build_object('document_status', v_old_status_code),
         jsonb_build_object('document_status', 'EXPIRED'), btrim(p_reason));

    RETURN jsonb_build_object('success', TRUE, 'document_id', v_document.document_id,
        'previous_status', v_old_status_code, 'new_status', 'EXPIRED');
END;
$function$;

CREATE OR REPLACE FUNCTION logistics.request_document_cancellation(
    p_document_id bigint,
    p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'logistics', 'pg_catalog'
AS $function$
DECLARE
    v_user_id bigint;
    v_document logistics.documents%ROWTYPE;
    v_old_status_code text;
    v_new_status_id bigint;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'DOCUMENT_TRANSITION_UNAUTHENTICATED'; END IF;
    SELECT u.user_id INTO v_user_id FROM logistics.users u
     WHERE u.auth_user_id = auth.uid() AND u.active = TRUE;
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'DOCUMENT_TRANSITION_USER_NOT_FOUND'; END IF;
    IF NOT logistics.has_permission('DOCUMENT_CANCEL') THEN RAISE EXCEPTION 'DOCUMENT_TRANSITION_FORBIDDEN'; END IF;
    IF p_reason IS NULL OR btrim(p_reason) = '' THEN RAISE EXCEPTION 'TRANSITION_REASON_REQUIRED'; END IF;

    SELECT d.* INTO v_document FROM logistics.documents d
     WHERE d.document_id = p_document_id AND d.is_current_version = TRUE FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'DOCUMENT_NOT_FOUND'; END IF;

    SELECT ds.status_code INTO v_old_status_code FROM logistics.document_statuses ds
     WHERE ds.document_status_id = v_document.document_status_id AND ds.is_active = TRUE;
    IF v_old_status_code IS NULL THEN RAISE EXCEPTION 'DOCUMENT_STATUS_NOT_FOUND'; END IF;
    IF v_old_status_code <> 'ISSUED' THEN RAISE EXCEPTION 'INVALID_DOCUMENT_TRANSITION'; END IF;

    SELECT ds.document_status_id INTO v_new_status_id FROM logistics.document_statuses ds
     WHERE ds.status_code = 'CANCELLED' AND ds.is_active = TRUE;
    IF v_new_status_id IS NULL THEN RAISE EXCEPTION 'DOCUMENT_STATUS_NOT_FOUND'; END IF;

    UPDATE logistics.documents SET document_status_id = v_new_status_id, updated_at = now()
     WHERE document_id = v_document.document_id;

    INSERT INTO logistics.audit_log
        (user_id, action_type, table_name, record_id, record_reference,
         old_values, new_values, description)
    VALUES
        (v_user_id, 'DOCUMENT_STATUS_CANCELLED', 'documents', v_document.document_id,
         v_document.document_number,
         jsonb_build_object('document_status', v_old_status_code),
         jsonb_build_object('document_status', 'CANCELLED'), btrim(p_reason));

    RETURN jsonb_build_object('success', TRUE, 'document_id', v_document.document_id,
        'previous_status', v_old_status_code, 'new_status', 'CANCELLED');
END;
$function$;

REVOKE ALL ON FUNCTION logistics.request_document_expiration(bigint, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION logistics.request_document_expiration(bigint, text) FROM anon;
GRANT EXECUTE ON FUNCTION logistics.request_document_expiration(bigint, text) TO authenticated;

REVOKE ALL ON FUNCTION logistics.request_document_cancellation(bigint, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION logistics.request_document_cancellation(bigint, text) FROM anon;
GRANT EXECUTE ON FUNCTION logistics.request_document_cancellation(bigint, text) TO authenticated;

COMMIT;
