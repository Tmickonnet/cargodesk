-- Inventory foundation: reference and location/lot structures.
-- Design boundary: no inventory balances, movements, permissions, grants, or RPCs.
BEGIN;

CREATE SEQUENCE logistics.inventory_statuses_inventory_status_id_seq;
CREATE SEQUENCE logistics.stock_locations_stock_location_id_seq;
CREATE SEQUENCE logistics.inventory_lots_inventory_lot_id_seq;
CREATE SEQUENCE logistics.inventory_movement_types_inventory_movement_type_id_seq;

CREATE TABLE logistics.inventory_statuses (
  inventory_status_id bigint NOT NULL DEFAULT nextval('logistics.inventory_statuses_inventory_status_id_seq'),
  status_code varchar(50) NOT NULL,
  status_name varchar(100) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_statuses_pkey PRIMARY KEY (inventory_status_id),
  CONSTRAINT inventory_statuses_code_key UNIQUE (status_code)
);
ALTER SEQUENCE logistics.inventory_statuses_inventory_status_id_seq
  OWNED BY logistics.inventory_statuses.inventory_status_id;

CREATE TABLE logistics.stock_locations (
  stock_location_id bigint NOT NULL DEFAULT nextval('logistics.stock_locations_stock_location_id_seq'),
  warehouse_id bigint NOT NULL,
  location_code varchar(100) NOT NULL,
  location_name varchar(255) NOT NULL,
  location_type varchar(50),
  parent_location_id bigint,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_locations_pkey PRIMARY KEY (stock_location_id),
  CONSTRAINT stock_locations_warehouse_fk
    FOREIGN KEY (warehouse_id) REFERENCES logistics.warehouses(warehouse_id) ON DELETE RESTRICT,
  CONSTRAINT stock_locations_parent_fk
    FOREIGN KEY (parent_location_id) REFERENCES logistics.stock_locations(stock_location_id) ON DELETE RESTRICT,
  CONSTRAINT stock_locations_not_self_parent_ck
    CHECK (parent_location_id IS NULL OR parent_location_id <> stock_location_id),
  CONSTRAINT stock_locations_warehouse_code_key UNIQUE (warehouse_id, location_code)
);
ALTER SEQUENCE logistics.stock_locations_stock_location_id_seq
  OWNED BY logistics.stock_locations.stock_location_id;
CREATE INDEX stock_locations_warehouse_lookup_idx
  ON logistics.stock_locations (warehouse_id);
CREATE INDEX stock_locations_parent_lookup_idx
  ON logistics.stock_locations (parent_location_id);

CREATE TABLE logistics.inventory_lots (
  inventory_lot_id bigint NOT NULL DEFAULT nextval('logistics.inventory_lots_inventory_lot_id_seq'),
  commodity_id bigint NOT NULL,
  lot_number varchar(255) NOT NULL,
  production_date date,
  expiry_date date,
  source_shipment_cargo_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_lots_pkey PRIMARY KEY (inventory_lot_id),
  CONSTRAINT inventory_lots_commodity_fk
    FOREIGN KEY (commodity_id) REFERENCES logistics.commodities(commodity_id) ON DELETE RESTRICT,
  CONSTRAINT inventory_lots_source_shipment_cargo_fk
    FOREIGN KEY (source_shipment_cargo_id) REFERENCES logistics.shipment_cargo(shipment_cargo_id) ON DELETE RESTRICT,
  CONSTRAINT inventory_lots_dates_ck
    CHECK (expiry_date IS NULL OR production_date IS NULL OR expiry_date >= production_date),
  CONSTRAINT inventory_lots_commodity_lot_key UNIQUE (commodity_id, lot_number)
);
ALTER SEQUENCE logistics.inventory_lots_inventory_lot_id_seq
  OWNED BY logistics.inventory_lots.inventory_lot_id;
CREATE INDEX inventory_lots_commodity_lookup_idx
  ON logistics.inventory_lots (commodity_id);
CREATE INDEX inventory_lots_source_cargo_lookup_idx
  ON logistics.inventory_lots (source_shipment_cargo_id);

CREATE TABLE logistics.inventory_movement_types (
  inventory_movement_type_id bigint NOT NULL DEFAULT nextval('logistics.inventory_movement_types_inventory_movement_type_id_seq'),
  movement_code varchar(50) NOT NULL,
  movement_name varchar(100) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_movement_types_pkey PRIMARY KEY (inventory_movement_type_id),
  CONSTRAINT inventory_movement_types_code_key UNIQUE (movement_code)
);
ALTER SEQUENCE logistics.inventory_movement_types_inventory_movement_type_id_seq
  OWNED BY logistics.inventory_movement_types.inventory_movement_type_id;

ALTER TABLE logistics.inventory_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics.stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics.inventory_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics.inventory_movement_types ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE logistics.inventory_statuses IS
  'Controlled inventory availability and control statuses. Reference data only.';
COMMENT ON TABLE logistics.stock_locations IS
  'Physical warehouse stock locations with optional hierarchical parent locations.';
COMMENT ON TABLE logistics.inventory_lots IS
  'Reusable inventory lot/batch identity linked to the existing commodity master.';
COMMENT ON TABLE logistics.inventory_movement_types IS
  'Controlled inventory movement types. Reference data only.';

COMMIT;
