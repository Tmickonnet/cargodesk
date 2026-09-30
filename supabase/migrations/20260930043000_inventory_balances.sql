-- Inventory balance foundation: stock identity and integrity only.
-- Design boundary: no inventory movement ledger, write permissions, grants, or RPCs.
BEGIN;

ALTER TABLE logistics.stock_locations
  ADD CONSTRAINT stock_locations_warehouse_id_id_key
  UNIQUE (warehouse_id, stock_location_id);

ALTER TABLE logistics.inventory_lots
  ADD CONSTRAINT inventory_lots_commodity_id_id_key
  UNIQUE (commodity_id, inventory_lot_id);

CREATE SEQUENCE logistics.inventory_balances_inventory_balance_id_seq;

CREATE TABLE logistics.inventory_balances (
  inventory_balance_id bigint NOT NULL DEFAULT nextval('logistics.inventory_balances_inventory_balance_id_seq'),
  warehouse_id bigint NOT NULL,
  stock_location_id bigint NOT NULL,
  commodity_id bigint NOT NULL,
  inventory_lot_id bigint,
  owner_party_id bigint,
  inventory_status_id bigint NOT NULL,
  quantity numeric(18,3) NOT NULL,
  quantity_uom_id bigint NOT NULL,
  net_weight numeric(18,3),
  gross_weight numeric(18,3),
  weight_uom_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_balances_pkey PRIMARY KEY (inventory_balance_id),
  CONSTRAINT inventory_balances_warehouse_fk
    FOREIGN KEY (warehouse_id) REFERENCES logistics.warehouses(warehouse_id) ON DELETE RESTRICT,
  CONSTRAINT inventory_balances_location_warehouse_fk
    FOREIGN KEY (warehouse_id, stock_location_id)
    REFERENCES logistics.stock_locations(warehouse_id, stock_location_id) ON DELETE RESTRICT,
  CONSTRAINT inventory_balances_commodity_fk
    FOREIGN KEY (commodity_id) REFERENCES logistics.commodities(commodity_id) ON DELETE RESTRICT,
  CONSTRAINT inventory_balances_lot_commodity_fk
    FOREIGN KEY (commodity_id, inventory_lot_id)
    REFERENCES logistics.inventory_lots(commodity_id, inventory_lot_id) ON DELETE RESTRICT,
  CONSTRAINT inventory_balances_owner_fk
    FOREIGN KEY (owner_party_id) REFERENCES logistics.parties(party_id) ON DELETE RESTRICT,
  CONSTRAINT inventory_balances_status_fk
    FOREIGN KEY (inventory_status_id) REFERENCES logistics.inventory_statuses(inventory_status_id) ON DELETE RESTRICT,
  CONSTRAINT inventory_balances_quantity_uom_fk
    FOREIGN KEY (quantity_uom_id) REFERENCES logistics.unit_of_measures(uom_id) ON DELETE RESTRICT,
  CONSTRAINT inventory_balances_weight_uom_fk
    FOREIGN KEY (weight_uom_id) REFERENCES logistics.unit_of_measures(uom_id) ON DELETE RESTRICT,
  CONSTRAINT inventory_balances_quantity_nonnegative_ck
    CHECK (quantity >= 0),
  CONSTRAINT inventory_balances_weight_nonnegative_ck
    CHECK (
      (net_weight IS NULL AND gross_weight IS NULL AND weight_uom_id IS NULL)
      OR
      (net_weight IS NOT NULL AND gross_weight IS NOT NULL AND weight_uom_id IS NOT NULL
       AND net_weight >= 0 AND gross_weight >= 0 AND gross_weight >= net_weight)
    )
);

ALTER SEQUENCE logistics.inventory_balances_inventory_balance_id_seq
  OWNED BY logistics.inventory_balances.inventory_balance_id;

CREATE UNIQUE INDEX inventory_balances_identity_idx
  ON logistics.inventory_balances (
    warehouse_id, stock_location_id, commodity_id,
    COALESCE(inventory_lot_id, 0),
    COALESCE(owner_party_id, 0),
    inventory_status_id, quantity_uom_id,
    COALESCE(weight_uom_id, 0)
  );

CREATE INDEX inventory_balances_warehouse_lookup_idx ON logistics.inventory_balances (warehouse_id);
CREATE INDEX inventory_balances_location_lookup_idx ON logistics.inventory_balances (stock_location_id);
CREATE INDEX inventory_balances_commodity_lookup_idx ON logistics.inventory_balances (commodity_id);
CREATE INDEX inventory_balances_lot_lookup_idx ON logistics.inventory_balances (inventory_lot_id);
CREATE INDEX inventory_balances_owner_lookup_idx ON logistics.inventory_balances (owner_party_id);
CREATE INDEX inventory_balances_status_lookup_idx ON logistics.inventory_balances (inventory_status_id);

ALTER TABLE logistics.inventory_balances ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE logistics.inventory_balances IS
  'Current physical inventory balance by warehouse location, commodity, optional lot/owner, status, quantity and explicit UOMs.';
COMMENT ON COLUMN logistics.inventory_balances.quantity IS
  'Recorded stock quantity. Preserve the source measurement and its quantity_uom_id; do not silently convert units.';
COMMENT ON COLUMN logistics.inventory_balances.net_weight IS
  'Optional recorded net weight. Preserve the source measurement and its weight_uom_id.';
COMMENT ON COLUMN logistics.inventory_balances.gross_weight IS
  'Optional recorded gross weight. Preserve the source measurement and its weight_uom_id.';

COMMIT;
