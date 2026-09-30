-- Inventory security boundary: controlled read access only.
-- Design boundary: no inventory balances, movements, write permissions, or RPCs.
BEGIN;

INSERT INTO logistics.permissions (
  permission_code,
  permission_name,
  module_name,
  action_name,
  active
)
SELECT
  'INVENTORY_VIEW',
  'View inventory foundation and warehouse stock references',
  'INVENTORY',
  'VIEW',
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM logistics.permissions
  WHERE permission_code = 'INVENTORY_VIEW'
);

INSERT INTO logistics.role_permissions (role_id, permission_id, granted)
SELECT
  r.role_id,
  p.permission_id,
  true
FROM logistics.roles r
CROSS JOIN logistics.permissions p
WHERE p.permission_code = 'INVENTORY_VIEW'
  AND r.role_code IN (
    'SYSTEM_ADMIN',
    'LOGISTICS_ADMIN',
    'DOCUMENTATION_OFFICER',
    'OPERATIONS_OFFICER',
    'DATA_ENTRY_OFFICER',
    'VIEWER'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM logistics.role_permissions rp
    WHERE rp.role_id = r.role_id
      AND rp.permission_id = p.permission_id
  );

CREATE POLICY inventory_statuses_select_policy
  ON logistics.inventory_statuses
  FOR SELECT
  TO authenticated
  USING (logistics.has_permission('INVENTORY_VIEW'));

CREATE POLICY stock_locations_select_policy
  ON logistics.stock_locations
  FOR SELECT
  TO authenticated
  USING (logistics.has_permission('INVENTORY_VIEW'));

CREATE POLICY inventory_lots_select_policy
  ON logistics.inventory_lots
  FOR SELECT
  TO authenticated
  USING (logistics.has_permission('INVENTORY_VIEW'));

CREATE POLICY inventory_movement_types_select_policy
  ON logistics.inventory_movement_types
  FOR SELECT
  TO authenticated
  USING (logistics.has_permission('INVENTORY_VIEW'));

GRANT SELECT ON TABLE
  logistics.inventory_statuses,
  logistics.stock_locations,
  logistics.inventory_lots,
  logistics.inventory_movement_types
TO authenticated;

COMMIT;
