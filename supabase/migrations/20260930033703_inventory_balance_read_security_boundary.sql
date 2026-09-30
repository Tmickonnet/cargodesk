-- Inventory balance security boundary: controlled read access only.
-- Design boundary: no inventory writes, movement ledger, or inventory write RPCs.
BEGIN;

CREATE POLICY inventory_balances_select_policy
  ON logistics.inventory_balances
  FOR SELECT
  TO authenticated
  USING (logistics.has_permission('INVENTORY_VIEW'));

GRANT SELECT ON TABLE logistics.inventory_balances TO authenticated;

COMMIT;
