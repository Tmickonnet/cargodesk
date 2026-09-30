-- Procurement P1 foundation: purchase requisition workflow only.
-- Design boundary: no RFQ, quotation, purchase order, receipt, inventory posting, or generic approval engine.
BEGIN;

CREATE SEQUENCE logistics.purchase_requisition_statuses_purchase_requisition_status_id_seq;
CREATE SEQUENCE logistics.purchase_requisitions_purchase_requisition_id_seq;
CREATE SEQUENCE logistics.purchase_requisition_lines_purchase_requisition_line_id_seq;

CREATE TABLE logistics.purchase_requisition_statuses (
  purchase_requisition_status_id bigint NOT NULL DEFAULT nextval('logistics.purchase_requisition_statuses_purchase_requisition_status_id_seq'),
  status_code varchar(50) NOT NULL,
  status_name varchar(100) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchase_requisition_statuses_pkey PRIMARY KEY (purchase_requisition_status_id),
  CONSTRAINT purchase_requisition_statuses_code_key UNIQUE (status_code)
);
ALTER SEQUENCE logistics.purchase_requisition_statuses_purchase_requisition_status_id_seq
  OWNED BY logistics.purchase_requisition_statuses.purchase_requisition_status_id;

CREATE TABLE logistics.purchase_requisitions (
  purchase_requisition_id bigint NOT NULL DEFAULT nextval('logistics.purchase_requisitions_purchase_requisition_id_seq'),
  requisition_number varchar(50) NOT NULL,
  requester_user_id bigint NOT NULL,
  warehouse_id bigint,
  stock_location_id bigint,
  required_date date,
  purpose varchar(500),
  notes text,
  status_id bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  approved_at timestamptz,
  CONSTRAINT purchase_requisitions_pkey PRIMARY KEY (purchase_requisition_id),
  CONSTRAINT purchase_requisitions_number_key UNIQUE (requisition_number),
  CONSTRAINT purchase_requisitions_requester_fk
    FOREIGN KEY (requester_user_id) REFERENCES logistics.users(user_id) ON DELETE RESTRICT,
  CONSTRAINT purchase_requisitions_warehouse_fk
    FOREIGN KEY (warehouse_id) REFERENCES logistics.warehouses(warehouse_id) ON DELETE RESTRICT,
  CONSTRAINT purchase_requisitions_stock_location_fk
    FOREIGN KEY (stock_location_id) REFERENCES logistics.stock_locations(stock_location_id) ON DELETE RESTRICT,
  CONSTRAINT purchase_requisitions_status_fk
    FOREIGN KEY (status_id) REFERENCES logistics.purchase_requisition_statuses(purchase_requisition_status_id) ON DELETE RESTRICT,
  CONSTRAINT purchase_requisitions_dates_ck
    CHECK (approved_at IS NULL OR submitted_at IS NOT NULL),
  CONSTRAINT purchase_requisitions_location_ck
    CHECK (stock_location_id IS NULL OR warehouse_id IS NOT NULL)
);
ALTER SEQUENCE logistics.purchase_requisitions_purchase_requisition_id_seq
  OWNED BY logistics.purchase_requisitions.purchase_requisition_id;
CREATE INDEX purchase_requisitions_requester_lookup_idx
  ON logistics.purchase_requisitions (requester_user_id);
CREATE INDEX purchase_requisitions_warehouse_lookup_idx
  ON logistics.purchase_requisitions (warehouse_id);
CREATE INDEX purchase_requisitions_stock_location_lookup_idx
  ON logistics.purchase_requisitions (stock_location_id);
CREATE INDEX purchase_requisitions_status_lookup_idx
  ON logistics.purchase_requisitions (status_id);

CREATE TABLE logistics.purchase_requisition_lines (
  purchase_requisition_line_id bigint NOT NULL DEFAULT nextval('logistics.purchase_requisition_lines_purchase_requisition_line_id_seq'),
  purchase_requisition_id bigint NOT NULL,
  line_number integer NOT NULL,
  product_id bigint,
  commodity_id bigint,
  description varchar(500) NOT NULL,
  quantity numeric(20,6) NOT NULL,
  uom_id bigint NOT NULL,
  estimated_unit_price numeric(20,6),
  estimated_line_amount numeric(20,6),
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchase_requisition_lines_pkey PRIMARY KEY (purchase_requisition_line_id),
  CONSTRAINT purchase_requisition_lines_requisition_fk
    FOREIGN KEY (purchase_requisition_id) REFERENCES logistics.purchase_requisitions(purchase_requisition_id) ON DELETE CASCADE,
  CONSTRAINT purchase_requisition_lines_product_fk
    FOREIGN KEY (product_id) REFERENCES logistics.product(product_id) ON DELETE RESTRICT,
  CONSTRAINT purchase_requisition_lines_commodity_fk
    FOREIGN KEY (commodity_id) REFERENCES logistics.commodities(commodity_id) ON DELETE RESTRICT,
  CONSTRAINT purchase_requisition_lines_uom_fk
    FOREIGN KEY (uom_id) REFERENCES logistics.unit_of_measures(uom_id) ON DELETE RESTRICT,
  CONSTRAINT purchase_requisition_lines_number_key UNIQUE (purchase_requisition_id, line_number),
  CONSTRAINT purchase_requisition_lines_quantity_ck CHECK (quantity > 0),
  CONSTRAINT purchase_requisition_lines_unit_price_ck CHECK (estimated_unit_price IS NULL OR estimated_unit_price >= 0),
  CONSTRAINT purchase_requisition_lines_amount_ck CHECK (estimated_line_amount IS NULL OR estimated_line_amount >= 0),
  CONSTRAINT purchase_requisition_lines_reference_ck CHECK (product_id IS NOT NULL OR commodity_id IS NOT NULL)
);
ALTER SEQUENCE logistics.purchase_requisition_lines_purchase_requisition_line_id_seq
  OWNED BY logistics.purchase_requisition_lines.purchase_requisition_line_id;
CREATE INDEX purchase_requisition_lines_requisition_lookup_idx
  ON logistics.purchase_requisition_lines (purchase_requisition_id);
CREATE INDEX purchase_requisition_lines_product_lookup_idx
  ON logistics.purchase_requisition_lines (product_id);
CREATE INDEX purchase_requisition_lines_commodity_lookup_idx
  ON logistics.purchase_requisition_lines (commodity_id);

ALTER TABLE logistics.purchase_requisition_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics.purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics.purchase_requisition_lines ENABLE ROW LEVEL SECURITY;

INSERT INTO logistics.purchase_requisition_statuses
  (status_code, status_name, sort_order, is_active)
VALUES
  ('DRAFT', 'Draft', 10, true),
  ('SUBMITTED', 'Submitted', 20, true),
  ('UNDER_REVIEW', 'Under Review', 30, true),
  ('APPROVED', 'Approved', 40, true),
  ('REJECTED', 'Rejected', 50, true),
  ('CANCELLED', 'Cancelled', 60, true)
ON CONFLICT (status_code) DO NOTHING;

INSERT INTO logistics.permissions
  (permission_code, permission_name, module_name, action_name, active)
SELECT v.permission_code, v.permission_name, 'PROCUREMENT', v.action_name, true
FROM (VALUES
  ('PROCUREMENT_VIEW', 'View procurement requisitions', 'VIEW'),
  ('PROCUREMENT_CREATE', 'Create purchase requisitions', 'CREATE'),
  ('PROCUREMENT_EDIT', 'Edit purchase requisitions', 'EDIT'),
  ('PROCUREMENT_SUBMIT', 'Submit purchase requisitions', 'SUBMIT'),
  ('PROCUREMENT_APPROVE', 'Approve purchase requisitions', 'APPROVE')
) AS v(permission_code, permission_name, action_name)
WHERE NOT EXISTS (
  SELECT 1 FROM logistics.permissions p WHERE p.permission_code = v.permission_code
);

INSERT INTO logistics.role_permissions (role_id, permission_id, granted)
SELECT r.role_id, p.permission_id, true
FROM logistics.roles r
JOIN logistics.permissions p ON p.permission_code IN (
  'PROCUREMENT_VIEW','PROCUREMENT_CREATE','PROCUREMENT_EDIT','PROCUREMENT_SUBMIT','PROCUREMENT_APPROVE'
)
WHERE r.role_code IN ('SYSTEM_ADMIN','LOGISTICS_ADMIN')
  AND NOT EXISTS (
    SELECT 1 FROM logistics.role_permissions rp
    WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id
  );

INSERT INTO logistics.role_permissions (role_id, permission_id, granted)
SELECT r.role_id, p.permission_id, true
FROM logistics.roles r
JOIN logistics.permissions p ON p.permission_code IN (
  'PROCUREMENT_VIEW','PROCUREMENT_CREATE','PROCUREMENT_EDIT','PROCUREMENT_SUBMIT'
)
WHERE r.role_code = 'DATA_ENTRY_OFFICER'
  AND NOT EXISTS (
    SELECT 1 FROM logistics.role_permissions rp
    WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id
  );

INSERT INTO logistics.role_permissions (role_id, permission_id, granted)
SELECT r.role_id, p.permission_id, true
FROM logistics.roles r
JOIN logistics.permissions p ON p.permission_code = 'PROCUREMENT_VIEW'
WHERE r.role_code IN ('OPERATIONS_OFFICER','DOCUMENTATION_OFFICER','VIEWER')
  AND NOT EXISTS (
    SELECT 1 FROM logistics.role_permissions rp
    WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id
  );

CREATE POLICY purchase_requisition_statuses_select_policy
  ON logistics.purchase_requisition_statuses
  FOR SELECT TO authenticated
  USING (logistics.has_permission('PROCUREMENT_VIEW'));

CREATE POLICY purchase_requisitions_select_policy
  ON logistics.purchase_requisitions
  FOR SELECT TO authenticated
  USING (logistics.has_permission('PROCUREMENT_VIEW'));

CREATE POLICY purchase_requisition_lines_select_policy
  ON logistics.purchase_requisition_lines
  FOR SELECT TO authenticated
  USING (logistics.has_permission('PROCUREMENT_VIEW'));

GRANT SELECT ON TABLE
  logistics.purchase_requisition_statuses,
  logistics.purchase_requisitions,
  logistics.purchase_requisition_lines
TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE
  logistics.purchase_requisitions,
  logistics.purchase_requisition_lines
FROM authenticated;

CREATE OR REPLACE FUNCTION logistics.create_purchase_requisition(
  p_warehouse_id bigint DEFAULT NULL,
  p_stock_location_id bigint DEFAULT NULL,
  p_required_date date DEFAULT NULL,
  p_purpose varchar DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'logistics', 'pg_catalog'
AS $$
DECLARE
  v_user_id bigint;
  v_status_id bigint;
  v_id bigint;
  v_number varchar(50);
  v_now timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  v_user_id := logistics.current_user_id();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Application user context could not be resolved';
  END IF;
  IF NOT logistics.has_permission('PROCUREMENT_CREATE') THEN
    RAISE EXCEPTION 'Permission denied: PROCUREMENT_CREATE';
  END IF;
  IF p_stock_location_id IS NOT NULL AND p_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'Warehouse is required when stock location is supplied';
  END IF;

  SELECT purchase_requisition_status_id INTO v_status_id
  FROM logistics.purchase_requisition_statuses
  WHERE status_code = 'DRAFT' AND is_active = true;

  IF v_status_id IS NULL THEN
    RAISE EXCEPTION 'Active DRAFT requisition status is not configured';
  END IF;

  v_number := 'PR-' || to_char(v_now, 'YYYYMMDDHH24MISSMS') || '-' || v_user_id;

  INSERT INTO logistics.purchase_requisitions (
    requisition_number, requester_user_id, warehouse_id, stock_location_id,
    required_date, purpose, notes, status_id, created_at, updated_at
  )
  VALUES (
    v_number, v_user_id, p_warehouse_id, p_stock_location_id,
    p_required_date, NULLIF(trim(p_purpose), ''), p_notes, v_status_id, v_now, v_now
  )
  RETURNING purchase_requisition_id INTO v_id;

  INSERT INTO logistics.audit_log (
    user_id, action_type, table_name, record_id, record_reference,
    action_timestamp, old_values, new_values, description
  )
  VALUES (
    v_user_id, 'PURCHASE_REQUISITION_CREATED',
    'purchase_requisitions', v_id, v_number, v_now, NULL,
    jsonb_build_object('status_code','DRAFT','requester_user_id',v_user_id,
      'warehouse_id',p_warehouse_id,'stock_location_id',p_stock_location_id),
    'Purchase requisition created through controlled procurement workflow.'
  );

  RETURN jsonb_build_object(
    'success', true,
    'purchase_requisition_id', v_id,
    'requisition_number', v_number,
    'status_code', 'DRAFT',
    'created_at', v_now
  );
END;
$$;

CREATE OR REPLACE FUNCTION logistics.submit_purchase_requisition(
  p_purchase_requisition_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'logistics', 'pg_catalog'
AS $$
DECLARE
  v_user_id bigint;
  v_row logistics.purchase_requisitions%ROWTYPE;
  v_status_code varchar(50);
  v_submitted_status_id bigint;
  v_now timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  v_user_id := logistics.current_user_id();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Application user context could not be resolved'; END IF;
  IF NOT logistics.has_permission('PROCUREMENT_SUBMIT') THEN
    RAISE EXCEPTION 'Permission denied: PROCUREMENT_SUBMIT';
  END IF;

  SELECT pr.*, s.status_code
  INTO v_row, v_status_code
  FROM logistics.purchase_requisitions pr
  JOIN logistics.purchase_requisition_statuses s
    ON s.purchase_requisition_status_id = pr.status_id
  WHERE pr.purchase_requisition_id = p_purchase_requisition_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase requisition not found'; END IF;
  IF v_status_code <> 'DRAFT' THEN
    RAISE EXCEPTION 'Only DRAFT requisitions can be submitted';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM logistics.purchase_requisition_lines
    WHERE purchase_requisition_id = p_purchase_requisition_id
  ) THEN
    RAISE EXCEPTION 'Purchase requisition must contain at least one line';
  END IF;

  SELECT purchase_requisition_status_id INTO v_submitted_status_id
  FROM logistics.purchase_requisition_statuses
  WHERE status_code = 'SUBMITTED' AND is_active = true;

  UPDATE logistics.purchase_requisitions
  SET status_id = v_submitted_status_id, submitted_at = v_now, updated_at = v_now
  WHERE purchase_requisition_id = p_purchase_requisition_id;

  INSERT INTO logistics.audit_log (
    user_id, action_type, table_name, record_id, record_reference,
    action_timestamp, old_values, new_values, description
  )
  VALUES (
    v_user_id, 'PURCHASE_REQUISITION_SUBMITTED',
    'purchase_requisitions', p_purchase_requisition_id, v_row.requisition_number,
    v_now, jsonb_build_object('status_code','DRAFT'),
    jsonb_build_object('status_code','SUBMITTED','submitted_at',v_now),
    'Purchase requisition submitted through controlled procurement workflow.'
  );

  RETURN jsonb_build_object('success',true,'purchase_requisition_id',p_purchase_requisition_id,
    'requisition_number',v_row.requisition_number,'status_code','SUBMITTED','submitted_at',v_now);
END;
$$;

CREATE OR REPLACE FUNCTION logistics.approve_purchase_requisition(
  p_purchase_requisition_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'logistics', 'pg_catalog'
AS $$
DECLARE
  v_user_id bigint;
  v_row logistics.purchase_requisitions%ROWTYPE;
  v_status_code varchar(50);
  v_approved_status_id bigint;
  v_now timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  v_user_id := logistics.current_user_id();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Application user context could not be resolved'; END IF;
  IF NOT logistics.has_permission('PROCUREMENT_APPROVE') THEN
    RAISE EXCEPTION 'Permission denied: PROCUREMENT_APPROVE';
  END IF;

  SELECT pr.*, s.status_code
  INTO v_row, v_status_code
  FROM logistics.purchase_requisitions pr
  JOIN logistics.purchase_requisition_statuses s
    ON s.purchase_requisition_status_id = pr.status_id
  WHERE pr.purchase_requisition_id = p_purchase_requisition_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase requisition not found'; END IF;
  IF v_status_code <> 'UNDER_REVIEW' THEN
    RAISE EXCEPTION 'Only UNDER_REVIEW requisitions can be approved';
  END IF;

  SELECT purchase_requisition_status_id INTO v_approved_status_id
  FROM logistics.purchase_requisition_statuses
  WHERE status_code = 'APPROVED' AND is_active = true;

  UPDATE logistics.purchase_requisitions
  SET status_id = v_approved_status_id, approved_at = v_now, updated_at = v_now
  WHERE purchase_requisition_id = p_purchase_requisition_id;

  INSERT INTO logistics.audit_log (
    user_id, action_type, table_name, record_id, record_reference,
    action_timestamp, old_values, new_values, description
  )
  VALUES (
    v_user_id, 'PURCHASE_REQUISITION_APPROVED',
    'purchase_requisitions', p_purchase_requisition_id, v_row.requisition_number,
    v_now, jsonb_build_object('status_code','UNDER_REVIEW'),
    jsonb_build_object('status_code','APPROVED','approved_at',v_now),
    'Purchase requisition approved through controlled procurement workflow.'
  );

  RETURN jsonb_build_object('success',true,'purchase_requisition_id',p_purchase_requisition_id,
    'requisition_number',v_row.requisition_number,'status_code','APPROVED','approved_at',v_now);
END;
$$;

REVOKE ALL ON FUNCTION logistics.create_purchase_requisition(bigint,bigint,date,varchar,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION logistics.create_purchase_requisition(bigint,bigint,date,varchar,text) FROM anon;
GRANT EXECUTE ON FUNCTION logistics.create_purchase_requisition(bigint,bigint,date,varchar,text) TO authenticated;

REVOKE ALL ON FUNCTION logistics.submit_purchase_requisition(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION logistics.submit_purchase_requisition(bigint) FROM anon;
GRANT EXECUTE ON FUNCTION logistics.submit_purchase_requisition(bigint) TO authenticated;

REVOKE ALL ON FUNCTION logistics.approve_purchase_requisition(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION logistics.approve_purchase_requisition(bigint) FROM anon;
GRANT EXECUTE ON FUNCTION logistics.approve_purchase_requisition(bigint) TO authenticated;

COMMENT ON TABLE logistics.purchase_requisitions IS
  'Procurement P1 purchase requisition header. Does not create purchase orders or inventory movements.';
COMMENT ON TABLE logistics.purchase_requisition_lines IS
  'Procurement P1 purchase requisition lines. Inventory is not posted from this structure.';
COMMENT ON FUNCTION logistics.create_purchase_requisition(bigint,bigint,date,varchar,text)
IS 'Controlled creation of a purchase requisition in DRAFT status.';
COMMENT ON FUNCTION logistics.submit_purchase_requisition(bigint)
IS 'Controlled submission of a DRAFT purchase requisition. Does not create a purchase order.';
COMMENT ON FUNCTION logistics.approve_purchase_requisition(bigint)
IS 'Controlled approval of an UNDER_REVIEW purchase requisition. Does not create a purchase order or inventory movement.';

COMMIT;
