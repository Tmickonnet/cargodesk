UPDATE logistics.inventory_balances
SET net_weight=quantity,
    gross_weight=quantity+0.500
WHERE quantity_uom_id=2
  AND weight_uom_id=2;