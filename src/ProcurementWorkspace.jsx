import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

const emptyState = {
  requisitions: [],
  lines: [],
  statuses: [],
  warehouses: [],
  error: "",
};

export default function ProcurementWorkspace({ session, authorizationLoading, role, hasPermission }) {
  const [data, setData] = useState(emptyState);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProcurement = async () => {
      if (!session || authorizationLoading || !role) return;

      const permitted = await hasPermission("PROCUREMENT_VIEW");
      if (!isMounted) return;

      if (!permitted) {
        setData({ ...emptyState, error: "Procurement records are not available for this role." });
        setLoading(false);
        return;
      }

      setLoading(true);
      setData(emptyState);

      try {
        const requisitionsResult = await supabase
          .from("purchase_requisitions")
          .select(
            "purchase_requisition_id, requisition_number, requester_user_id, warehouse_id, stock_location_id, required_date, purpose, notes, status_id, created_at, updated_at, submitted_at, approved_at"
          )
          .order("updated_at", { ascending: false, nullsFirst: false })
          .limit(50);

        if (requisitionsResult.error) throw requisitionsResult.error;

        const requisitions = requisitionsResult.data ?? [];
        const requisitionIds = requisitions.map((row) => row.purchase_requisition_id);
        const warehouseIds = [...new Set(requisitions.map((row) => row.warehouse_id).filter(Boolean))];

        const [linesResult, statusesResult, warehousesResult] = await Promise.all([
          requisitionIds.length
            ? supabase
                .from("purchase_requisition_lines")
                .select(
                  "purchase_requisition_line_id, purchase_requisition_id, line_number, product_id, commodity_id, description, quantity, uom_id, estimated_unit_price, estimated_line_amount, remarks"
                )
                .in("purchase_requisition_id", requisitionIds)
                .order("line_number", { ascending: true })
            : Promise.resolve({ data: [], error: null }),
          supabase
            .from("purchase_requisition_statuses")
            .select("purchase_requisition_status_id, status_code, status_name, sort_order")
            .order("sort_order", { ascending: true }),
          warehouseIds.length
            ? supabase
                .from("warehouses")
                .select("warehouse_id, warehouse_code, warehouse_name")
                .in("warehouse_id", warehouseIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        const firstError = [linesResult, statusesResult, warehousesResult].find((result) => result?.error)?.error;
        if (firstError) throw firstError;

        if (!isMounted) return;

        setData({
          requisitions,
          lines: linesResult.data ?? [],
          statuses: statusesResult.data ?? [],
          warehouses: warehousesResult.data ?? [],
          error: "",
        });
      } catch (error) {
        if (!isMounted) return;
        console.error("CargoDesk procurement workspace load failed:", error);
        setData({ ...emptyState, error: error?.message || "Unable to load procurement requisitions." });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProcurement();
    return () => {
      isMounted = false;
    };
  }, [session, authorizationLoading, role, hasPermission]);

  const statusById = new Map(data.statuses.map((item) => [Number(item.purchase_requisition_status_id), item]));
  const warehouseById = new Map(data.warehouses.map((item) => [Number(item.warehouse_id), item]));
  const linesByRequisition = new Map();

  data.lines.forEach((line) => {
    const key = Number(line.purchase_requisition_id);
    const existing = linesByRequisition.get(key) ?? [];
    existing.push(line);
    linesByRequisition.set(key, existing);
  });

  return (
    <div style={{ marginBottom: "22px" }}>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "12px", fontWeight: "600", color: "#627d98", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.6px" }}>
          Management
        </div>
        <h1 style={{ margin: 0, fontSize: "28px", color: "#173b6c" }}>Procurement</h1>
        <p style={{ margin: "8px 0 0", color: "#627d98", fontSize: "14px", lineHeight: 1.6 }}>
          Review purchase requisitions through the authorized read path. P1 currently covers requisitions only; RFQs, quotations, purchase orders, receipts, and inventory posting are not part of this workspace.
        </p>
      </div>

      {loading ? (
        <div style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", color: "#627d98", fontSize: "13px" }}>
          Loading procurement records...
        </div>
      ) : data.error ? (
        <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "12px", padding: "20px", color: "#b83232", fontSize: "13px", lineHeight: 1.6 }}>
          {data.error}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
            {[
              ["Requisitions", data.requisitions.length],
              ["Lines", data.lines.length],
              ["Statuses", data.statuses.filter((item) => item.is_active !== false).length],
            ].map(([label, value]) => (
              <div key={label} style={{ minWidth: "170px", padding: "15px 17px", background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "10px" }}>
                <div style={{ fontSize: "11px", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
                <div style={{ marginTop: "6px", fontSize: "24px", fontWeight: "700", color: "#173b6c" }}>{value}</div>
              </div>
            ))}
          </div>

          <section style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", overflowX: "auto" }}>
            <h2 style={{ margin: "0 0 14px", fontSize: "18px", color: "#173b6c" }}>Purchase requisitions</h2>
            {data.requisitions.length === 0 ? (
              <div style={{ color: "#627d98", fontSize: "13px", lineHeight: 1.7 }}>
                No purchase requisitions have been created yet. This is an expected empty-state condition for the newly deployed P1 foundation; no sample or production requisition has been inserted by this workspace.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1150px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #d9e2ec" }}>
                    {["Reference", "Status", "Requester ID", "Warehouse", "Required", "Purpose", "Lines", "Updated"].map((heading) => (
                      <th key={heading} style={{ padding: "9px 8px", textAlign: "left", fontSize: "11px", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.5px" }}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.requisitions.map((item) => {
                    const status = statusById.get(Number(item.status_id));
                    const warehouse = warehouseById.get(Number(item.warehouse_id));
                    const lines = linesByRequisition.get(Number(item.purchase_requisition_id)) ?? [];
                    return (
                      <tr key={item.purchase_requisition_id} style={{ borderBottom: "1px solid #eef2f7", verticalAlign: "top" }}>
                        <td style={{ padding: "10px 8px", fontSize: "12px", fontWeight: "700", color: "#1f5f95" }}>{item.requisition_number}</td>
                        <td style={{ padding: "10px 8px", fontSize: "12px", color: "#334e68" }}>{status?.status_name || status?.status_code || "Unknown"}</td>
                        <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.requester_user_id}</td>
                        <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{warehouse ? [warehouse.warehouse_code, warehouse.warehouse_name].filter(Boolean).join(" — ") : "—"}</td>
                        <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.required_date || "—"}</td>
                        <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98", maxWidth: "280px" }}>{item.purpose || "—"}</td>
                        <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{lines.length}</td>
                        <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.updated_at ? new Date(item.updated_at).toLocaleString() : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {data.requisitions.length > 0 && (
            <section style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", marginTop: "18px", overflowX: "auto" }}>
              <h2 style={{ margin: "0 0 14px", fontSize: "18px", color: "#173b6c" }}>Requisition lines</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1050px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #d9e2ec" }}>
                    {["Requisition", "Line", "Description", "Quantity", "UOM ID", "Product ID", "Commodity ID", "Estimated Amount"].map((heading) => (
                      <th key={heading} style={{ padding: "9px 8px", textAlign: "left", fontSize: "11px", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.5px" }}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((line) => {
                    const requisition = data.requisitions.find((item) => Number(item.purchase_requisition_id) === Number(line.purchase_requisition_id));
                    return (
                      <tr key={line.purchase_requisition_line_id} style={{ borderBottom: "1px solid #eef2f7" }}>
                        <td style={{ padding: "10px 8px", fontSize: "12px", fontWeight: "700", color: "#1f5f95" }}>{requisition?.requisition_number || line.purchase_requisition_id}</td>
                        <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{line.line_number}</td>
                        <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{line.description}</td>
                        <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{line.quantity}</td>
                        <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{line.uom_id}</td>
                        <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{line.product_id ?? "—"}</td>
                        <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{line.commodity_id ?? "—"}</td>
                        <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{line.estimated_line_amount ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
}
