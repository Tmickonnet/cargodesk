-- Product & Classification RBAC
-- IMPLEMENTATION CANDIDATE — reviewed before production application.
BEGIN;

INSERT INTO logistics.permissions (permission_code, permission_name, module_name, action_name, active)
SELECT 'SHIPMENT_CLASSIFICATION_VERIFY',
       'Verify shipment cargo classification',
       'CLASSIFICATION',
       'VERIFY',
       true
WHERE NOT EXISTS (
    SELECT 1 FROM logistics.permissions
    WHERE permission_code = 'SHIPMENT_CLASSIFICATION_VERIFY'
);

INSERT INTO logistics.role_permissions (role_id, permission_id, granted)
SELECT r.role_id, p.permission_id, true
FROM logistics.roles r
CROSS JOIN logistics.permissions p
WHERE p.permission_code = 'SHIPMENT_CLASSIFICATION_VERIFY'
  AND r.role_code IN ('SYSTEM_ADMIN','LOGISTICS_ADMIN','DOCUMENTATION_OFFICER')
  AND NOT EXISTS (
      SELECT 1
      FROM logistics.role_permissions rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
  );

COMMIT;
