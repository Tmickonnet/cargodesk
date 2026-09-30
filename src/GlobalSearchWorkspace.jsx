import React, { useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e5e9f0",
  borderRadius: "12px",
  padding: "18px",
};

const SOURCE_CONFIG = [
  {
    key: "shipments",
    label: "Shipments",
    permission: "SHIPMENT_VIEW",
    table: "shipments",
    select: "shipment_id, shipment_number, shipment_status_id, planned_departure_date, planned_arrival_date, actual_departure_date, actual_arrival_date, updated_at",
    fields: ["shipment_number"],
    reference: (row) => row.shipment_number || ("Shipment " + row.shipment_id),
    status: (row) => row.shipment_status_id,
    date: (row) => row.updated_at || row.planned_departure_date,
  },
  {
    key: "cargo",
    label: "Cargo",
    permission: "CARGO_VIEW",
    table: "shipment_cargo",
    select: "shipment_cargo_id, shipment_id, hs_code, lot_number, marks_and_numbers, production_date, expiry_date, updated_at",
    fields: ["hs_code", "lot_number", "marks_and_numbers"],
    reference: (row) => "Cargo " + row.shipment_cargo_id,
    status: () => null,
    date: (row) => row.updated_at || row.production_date,
  },
  {
    key: "containers",
    label: "Containers",
    permission: "CARGO_VIEW",
    table: "containers",
    select: "container_id, container_number, container_status, updated_at",
    fields: ["container_number", "container_status"],
    reference: (row) => row.container_number || ("Container " + row.container_id),
    status: (row) => row.container_status,
    date: (row) => row.updated_at,
  },
  {
    key: "bookings",
    label: "Bookings",
    permission: "BOOKING_VIEW",
    table: "bookings",
    select: "booking_id, shipment_id, booking_number, booking_status_id, voyage_number, carrier_reference, booking_date, updated_at",
    fields: ["booking_number", "voyage_number", "carrier_reference"],
    reference: (row) => row.booking_number || ("Booking " + row.booking_id),
    status: (row) => row.booking_status_id,
    date: (row) => row.updated_at || row.booking_date,
  },
  {
    key: "warehouses",
    label: "Warehouses",
    permission: "MASTER_DATA_VIEW",
    table: "warehouses",
    select: "warehouse_id, warehouse_code, warehouse_name, city, state_region, is_active, updated_at",
    fields: ["warehouse_code", "warehouse_name", "city", "state_region"],
    reference: (row) => row.warehouse_code || row.warehouse_name || ("Warehouse " + row.warehouse_id),
    status: (row) => row.is_active == null ? null : row.is_active ? "ACTIVE" : "INACTIVE",
    date: (row) => row.updated_at,
  },
  {
    key: "deliveries",
    label: "Deliveries",
    permission: "DELIVERY_VIEW",
    table: "delivery",
    select: "delivery_id, shipment_id, delivery_reference, delivery_status_id, vehicle_reference, driver_name, planned_delivery_date, actual_delivery_date, updated_at",
    fields: ["delivery_reference", "vehicle_reference", "driver_name"],
    reference: (row) => row.delivery_reference || ("Delivery " + row.delivery_id),
    status: (row) => row.delivery_status_id,
    date: (row) => row.updated_at || row.planned_delivery_date,
  },
  {
    key: "documents",
    label: "Documents",
    permission: "DOCUMENT_VIEW",
    table: "documents",
    select: "document_id, document_number, document_title, file_name, document_status_id, expiry_date, updated_at",
    fields: ["document_number", "document_title", "file_name"],
    reference: (row) => row.document_number || row.document_title || ("Document " + row.document_id),
    status: (row) => row.document_status_id,
    date: (row) => row.updated_at || row.expiry_date,
  },
  {
    key: "exceptions",
    label: "Exceptions",
    permission: "EXCEPTION_VIEW",
    table: "shipment_exception",
    select: "shipment_exception_id, shipment_id, container_id, exception_reference, exception_type, severity, status, reported_at, resolved_at, updated_at",
    fields: ["exception_reference", "exception_type", "severity", "status"],
    reference: (row) => row.exception_reference || ("Exception " + row.shipment_exception_id),
    status: (row) => row.status || row.severity,
    date: (row) => row.updated_at || row.reported_at,
  },
  {
    key: "inventory_lots",
    label: "Inventory Lots",
    permission: "INVENTORY_VIEW",
    table: "inventory_lots",
    select: "inventory_lot_id, commodity_id, lot_number, production_date, expiry_date, updated_at",
    fields: ["lot_number"],
    reference: (row) => row.lot_number || ("Inventory Lot " + row.inventory_lot_id),
    status: () => null,
    date: (row) => row.updated_at || row.production_date,
  },
  {
    key: "stock_locations",
    label: "Stock Locations",
    permission: "INVENTORY_VIEW",
    table: "stock_locations",
    select: "stock_location_id, warehouse_id, location_code, location_name, location_type, is_active, updated_at",
    fields: ["location_code", "location_name", "location_type"],
    reference: (row) => row.location_code || row.location_name || ("Location " + row.stock_location_id),
    status: (row) => row.is_active == null ? null : row.is_active ? "ACTIVE" : "INACTIVE",
    date: (row) => row.updated_at,
  },
];

function escapeLike(value) {
  return value.replace(/([%_\\])/g, "\\$1");
}

export default function GlobalSearchWorkspace({ hasPermission, onNavigate }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const availableSources = useMemo(
    () => SOURCE_CONFIG,
    []
  );

  const runSearch = async (event) => {
    event?.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setResults([]);
      setSearched(false);
      setError("");
      return;
    }

    setLoading(true);
    setSearched(true);
    setError("");

    try {
      const permitted = await Promise.all(
        availableSources.map(async (source) => ({
          source,
          allowed: await hasPermission(source.permission),
        }))
      );

      const term = escapeLike(cleanQuery);
      const sourceResults = await Promise.all(
        permitted.filter((item) => item.allowed).map(async ({ source }) => {
          const or = source.fields.map((field) => field + ".ilike.%" + term + "%").join(",");
          const response = await supabase
            .from(source.table)
            .select(source.select)
            .or(or)
            .order("updated_at", { ascending: false, nullsFirst: false })
            .limit(10);

          if (response.error) {
            return { source, rows: [], error: response.error };
          }

          return { source, rows: response.data ?? [], error: null };
        })
      );

      const failed = sourceResults.find((item) => item.error);
      if (failed) {
        throw new Error(failed.error.message || ("Unable to search " + failed.source.label + "."));
      }

      const flattened = sourceResults.flatMap(({ source, rows }) =>
        rows.map((row) => ({
          key: source.key + "-" + (row[source.key === "shipments" ? "shipment_id" : source.key === "cargo" ? "shipment_cargo_id" : source.key === "containers" ? "container_id" : source.key === "bookings" ? "booking_id" : source.key === "warehouses" ? "warehouse_id" : source.key === "deliveries" ? "delivery_id" : source.key === "documents" ? "document_id" : source.key === "exceptions" ? "shipment_exception_id" : source.key === "inventory_lots" ? "inventory_lot_id" : "stock_location_id"]),
          type: source.label,
          reference: source.reference(row),
          status: source.status(row),
          date: source.date(row),
          row,
        }))
      );

      setResults(flattened);
    } catch (searchError) {
      setResults([]);
      setError(searchError.message || "Unable to complete authorized search.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: "22px" }}>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "12px", fontWeight: "600", color: "#627d98", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.6px" }}>
          Control & visibility
        </div>
        <h1 style={{ margin: 0, fontSize: "28px", color: "#173b6c" }}>Global Search</h1>
        <p style={{ margin: "8px 0 0", color: "#627d98", fontSize: "14px", lineHeight: 1.6 }}>
          Search authorized CargoDesk operational records without changing or bypassing their existing security boundaries.
        </p>
      </div>

      <section style={cardStyle}>
        <form onSubmit={runSearch} style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Shipment, container, booking, document, lot, vehicle, driver..."
            aria-label="Global search"
            style={{ flex: "1 1 420px", minWidth: "260px", padding: "11px 13px", border: "1px solid #bcccdc", borderRadius: "8px", fontSize: "13px" }}
          />
          <button type="submit" disabled={loading || !query.trim()} style={{ border: "none", borderRadius: "8px", padding: "10px 16px", background: "#173b6c", color: "#fff", fontSize: "12px", fontWeight: "700", cursor: loading ? "wait" : "pointer" }}>
            {loading ? "Searching..." : "Search"}
          </button>
          <button type="button" onClick={() => { setQuery(""); setResults([]); setSearched(false); setError(""); }} style={{ border: "1px solid #bcccdc", borderRadius: "8px", padding: "10px 16px", background: "#fff", color: "#334e68", fontSize: "12px", fontWeight: "600" }}>
            Clear
          </button>
        </form>
        <div style={{ marginTop: "10px", fontSize: "11px", color: "#829ab1" }}>
          Search is read-only. Only domains permitted for the signed-in role are queried.
        </div>
      </section>

      {error && <div style={{ marginTop: "14px", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "10px", padding: "12px 14px", color: "#b83232", fontSize: "12px" }}>{error}</div>}

      {searched && !loading && !error && (
        <section style={{ ...cardStyle, marginTop: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "12px" }}>
            <h2 style={{ margin: 0, fontSize: "17px", color: "#173b6c" }}>Search results</h2>
            <span style={{ fontSize: "11px", color: "#627d98" }}>{results.length} authorized result{results.length === 1 ? "" : "s"}</span>
          </div>
          {results.length === 0 ? (
            <div style={{ color: "#627d98", fontSize: "13px" }}>No authorized records matched the search.</div>
          ) : (
            <div style={{ display: "grid", gap: "8px" }}>
              {results.map((result) => (
                <button
                  type="button"
                  key={result.key}
                  onClick={() => onNavigate?.(result)}
                  style={{ textAlign: "left", border: "1px solid #e5e9f0", background: "#fff", borderRadius: "8px", padding: "12px", cursor: onNavigate ? "pointer" : "default" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                    <div>
                      <strong style={{ color: "#1f5f95", fontSize: "13px" }}>{result.type}</strong>
                      <div style={{ marginTop: "4px", color: "#243b53", fontSize: "13px", fontWeight: "600" }}>{result.reference}</div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: "11px", color: "#627d98" }}>
                      <div>Status: {result.status ?? "—"}</div>
                      <div style={{ marginTop: "3px" }}>{result.date ? new Date(result.date).toLocaleString() : "—"}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
