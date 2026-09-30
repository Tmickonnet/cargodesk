-- Controlled validation dataset only. All records are explicitly TEST-coded.
INSERT INTO logistics.inventory_statuses (status_code,status_name,sort_order,is_active)
VALUES
('AVAILABLE','Available',10,true),
('RESERVED','Reserved',20,true),
('ON_HOLD','On Hold',30,true),
('QUARANTINED','Quarantined',40,true),
('BLOCKED','Blocked',50,true);

INSERT INTO logistics.inventory_movement_types (movement_code,movement_name,sort_order,is_active)
VALUES
('RECEIPT','Receipt',10,true),
('ISSUE','Issue',20,true),
('TRANSFER','Transfer',30,true),
('ADJUSTMENT','Adjustment',40,true),
('RESERVATION','Reservation',50,true),
('RELEASE','Release',60,true);

INSERT INTO logistics.stock_locations (warehouse_id,location_code,location_name,location_type,is_active)
SELECT 1, 'TEST-A-' || lpad(g::text,2,'0'), 'Test Inventory Location ' || lpad(g::text,2,'0'), 'STORAGE', true
FROM generate_series(1,10) AS g;

INSERT INTO logistics.inventory_lots (commodity_id,lot_number,production_date,expiry_date,source_shipment_cargo_id)
SELECT 1,
       'TEST-INV-LOT-' || lpad(g::text,2,'0'),
       DATE '2026-09-01' + (g - 1),
       NULL,
       NULL
FROM generate_series(1,10) AS g;

INSERT INTO logistics.inventory_balances
(warehouse_id,stock_location_id,commodity_id,inventory_lot_id,owner_party_id,inventory_status_id,
 quantity,quantity_uom_id,net_weight,gross_weight,weight_uom_id)
SELECT
  1,
  sl.stock_location_id,
  1,
  il.inventory_lot_id,
  7,
  s.inventory_status_id,
  CASE WHEN g <= 5 THEN (100 + g * 10)::numeric ELSE (5 + g)::numeric END,
  CASE WHEN g <= 5 THEN 3 ELSE 2 END,
  CASE WHEN g <= 5 THEN (10000 + g * 100)::numeric ELSE (20 + g)::numeric END,
  CASE WHEN g <= 5 THEN (10100 + g * 100)::numeric ELSE (20.5 + g)::numeric END,
  CASE WHEN g <= 5 THEN 1 ELSE 2 END
FROM generate_series(1,10) AS g
JOIN logistics.stock_locations sl
  ON sl.warehouse_id = 1
 AND sl.location_code = 'TEST-A-' || lpad(g::text,2,'0')
JOIN logistics.inventory_lots il
  ON il.commodity_id = 1
 AND il.lot_number = 'TEST-INV-LOT-' || lpad(g::text,2,'0')
JOIN logistics.inventory_statuses s
  ON s.status_code = CASE
    WHEN g <= 6 THEN 'AVAILABLE'
    WHEN g <= 8 THEN 'RESERVED'
    WHEN g = 9 THEN 'ON_HOLD'
    ELSE 'QUARANTINED'
  END;