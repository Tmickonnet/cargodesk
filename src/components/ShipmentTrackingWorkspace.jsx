import React, { useEffect, useState } from "react";
import { getShipmentTrackingData, listShipments } from "../lib/shipmentTracking";

const formatValue = (value) => value === null || value === undefined || value === "" ? "Not recorded" : String(value);
const dateValue = (value) => (value ? new Date(value).toLocaleString() : "Not recorded");
const panelStyle = { background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "22px", boxShadow: "0 2px 8px rgba(16,42,67,0.04)" };

function ShipmentTrackingWorkspace() {
  const [shipments, setShipments] = useState([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState("");
  const [tracking, setTracking] = useState(null);
  const [listLoading, setListLoading] = useState(true);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setListLoading(true); setError("");
      const result = await listShipments();
      if (!mounted) return;
      if (result.error) { setShipments([]); setError(result.error.message || "Unable to load shipments."); }
      else {
        setShipments(result.data);
        setSelectedShipmentId((current) => current && result.data.some((x) => x.shipment_id === current) ? current : result.data[0]?.shipment_id ?? "");
      }
      setListLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!selectedShipmentId) { setTracking(null); setTrackingLoading(false); return () => { mounted = false; }; }
    const load = async () => {
      setTrackingLoading(true); setError("");
      const result = await getShipmentTrackingData(selectedShipmentId);
      if (!mounted) return;
      if (result.error) { setTracking(null); setError(result.error.message || "Unable to load shipment tracking data."); }
      else setTracking(result);
      setTrackingLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [selectedShipmentId]);

  const selected = shipments.find((x) => x.shipment_id === selectedShipmentId);

  return (
    <div>
      <div style={{ marginBottom: "22px" }}>
        <div style={{ fontSize: "12px", fontWeight: "600", color: "#627d98", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.6px" }}>Operations / Shipments</div>
        <h1 style={{ margin: 0, fontSize: "28px", color: "#173b6c" }}>Shipment Tracking</h1>
        <p style={{ margin: "8px 0 0", color: "#627d98", fontSize: "14px" }}>Read-only visibility into shipment identity, route, milestones, and tracking events.</p>
      </div>

      {error && <section style={{ ...panelStyle, borderColor: "#fed7d7", marginBottom: "18px" }}>
        <div style={{ color: "#b83232", fontSize: "13px", fontWeight: "600" }}>Unable to load shipment data</div>
        <div style={{ color: "#627d98", fontSize: "12px", marginTop: "6px" }}>{error}</div>
      </section>}

      <section style={{ ...panelStyle, marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "14px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.7px" }}>Shipment list</div>
            <div style={{ marginTop: "5px", fontSize: "13px", color: "#829ab1" }}>{listLoading ? "Loading shipments..." : shipments.length + " shipment" + (shipments.length === 1 ? "" : "s") + " available"}</div>
          </div>
          <div style={{ padding: "7px 10px", borderRadius: "16px", background: "#eef2f7", color: "#334e68", fontSize: "11px", fontWeight: "600" }}>READ ONLY</div>
        </div>

        {listLoading ? <div style={{ padding: "20px 0", color: "#627d98", fontSize: "13px" }}>Loading shipment records...</div> :
          shipments.length === 0 ? <div style={{ padding: "20px 0", color: "#627d98", fontSize: "13px" }}>No shipment records are available through your authorized read access.</div> :
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
              <thead><tr>{["Shipment", "Status ID", "Transport Mode ID", "Origin ID", "Destination ID", "Planned Departure", "Planned Arrival"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 9px", borderBottom: "1px solid #e5e9f0", color: "#627d98", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>)}</tr></thead>
              <tbody>{shipments.map((shipment) => {
                const isSelected = shipment.shipment_id === selectedShipmentId;
                return <tr key={shipment.shipment_id} onClick={() => setSelectedShipmentId(shipment.shipment_id)} style={{ cursor: "pointer", background: isSelected ? "#f5f7fb" : "#ffffff" }}>
                  {[shipment.shipment_number, shipment.shipment_status_id, shipment.primary_transport_mode_id, shipment.origin_location_id, shipment.destination_location_id, shipment.planned_departure_date, shipment.planned_arrival_date].map((value, index) =>
                    <td key={index} style={{ padding: "11px 9px", borderBottom: "1px solid #eef2f7", fontSize: index === 0 ? "13px" : "12px", fontWeight: index === 0 ? "600" : "400", color: index === 0 ? "#173b6c" : "#334e68" }}>{formatValue(value)}</td>
                  )}
                </tr>;
              })}</tbody>
            </table>
          </div>}
      </section>

      {selected && <section style={{ ...panelStyle, marginBottom: "18px" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.7px" }}>Shipment detail</div>
        <h2 style={{ margin: "7px 0 14px", color: "#173b6c", fontSize: "21px" }}>{formatValue(selected.shipment_number)}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          {[["Current status ID", selected.shipment_status_id], ["Transport mode ID", selected.primary_transport_mode_id], ["Origin location ID", selected.origin_location_id], ["Destination location ID", selected.destination_location_id], ["Planned departure", selected.planned_departure_date], ["Actual departure", selected.actual_departure_date], ["Planned arrival", selected.planned_arrival_date], ["Actual arrival", selected.actual_arrival_date]].map(([label, value]) =>
            <div key={label} style={{ padding: "12px", background: "#f5f7fb", border: "1px solid #e5e9f0", borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", color: "#829ab1", marginBottom: "5px" }}>{label}</div>
              <div style={{ fontSize: "13px", color: "#334e68", fontWeight: "600" }}>{formatValue(value)}</div>
            </div>
          )}
        </div>
      </section>}

      {trackingLoading ? <section style={panelStyle}><div style={{ color: "#627d98", fontSize: "13px" }}>Loading shipment tracking details...</div></section> :
        tracking ? <>
          <section style={{ ...panelStyle, marginBottom: "18px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "12px" }}>Ordered shipment legs</div>
            {tracking.legs.length === 0 ? <div style={{ color: "#627d98", fontSize: "13px" }}>No leg records are available.</div> :
              <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
                <thead><tr>{["Seq","Transport Mode ID","Origin ID","Destination ID","Planned Departure","Actual Departure","Planned Arrival","Actual Arrival","Leg Status"].map((h) => <th key={h} style={{ textAlign: "left", padding: "9px", borderBottom: "1px solid #e5e9f0", color: "#627d98", fontSize: "11px" }}>{h}</th>)}</tr></thead>
                <tbody>{tracking.legs.map((leg) => <tr key={leg.shipment_leg_id}>
                  {[leg.leg_sequence, leg.transport_mode_id, leg.origin_location_id, leg.destination_location_id, dateValue(leg.departure_planned_at), dateValue(leg.departure_actual_at), dateValue(leg.arrival_planned_at), dateValue(leg.arrival_actual_at), leg.leg_status].map((value,index) => <td key={index} style={{ padding: "10px 9px", borderBottom: "1px solid #eef2f7", fontSize: "12px", fontWeight: index === 8 ? "600" : "400" }}>{formatValue(value)}</td>)}
                </tr>)}</tbody>
              </table></div>}
          </section>

          <section style={{ ...panelStyle, marginBottom: "18px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "12px" }}>Milestone timeline</div>
            {tracking.milestones.length === 0 ? <div style={{ color: "#627d98", fontSize: "13px" }}>No milestone records are available.</div> :
              <div>{tracking.milestones.map((milestone) => <div key={milestone.shipment_milestone_id} style={{ padding: "13px 0", borderBottom: "1px solid #eef2f7" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                  <div><div style={{ fontSize: "13px", fontWeight: "700", color: "#173b6c" }}>{formatValue(milestone.milestone_name)}</div><div style={{ marginTop: "3px", fontSize: "11px", color: "#829ab1" }}>{formatValue(milestone.milestone_code)} · Sequence {formatValue(milestone.sequence_number)}</div></div>
                  <div style={{ fontSize: "12px", color: "#334e68", fontWeight: "600" }}>{milestone.completed === true ? "Completed" : milestone.completed === false ? "Not completed" : "Not recorded"}</div>
                </div>
                <div style={{ marginTop: "9px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "8px" }}>
                  <div style={{ fontSize: "12px", color: "#627d98" }}>Planned: {formatValue(milestone.planned_date)}</div>
                  <div style={{ fontSize: "12px", color: "#627d98" }}>Estimated: {formatValue(milestone.estimated_date)}</div>
                  <div style={{ fontSize: "12px", color: "#627d98" }}>Actual: {formatValue(milestone.actual_date)}</div>
                </div>
              </div>)}</div>}
          </section>

          <section style={panelStyle}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "12px" }}>Tracking-event timeline</div>
            {tracking.events.length === 0 ? <div style={{ color: "#627d98", fontSize: "13px" }}>No tracking events are available.</div> :
              <div>{tracking.events.map((event) => <div key={event.tracking_event_id} style={{ padding: "12px 0", borderBottom: "1px solid #eef2f7" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                  <div><div style={{ fontSize: "13px", fontWeight: "700", color: "#173b6c" }}>{formatValue(event.tracking_event_type_id)}</div><div style={{ marginTop: "3px", fontSize: "11px", color: "#829ab1" }}>{formatValue(event.event_reference)}</div></div>
                  <div style={{ fontSize: "12px", color: "#334e68", fontWeight: "600" }}>{dateValue(event.event_datetime)}</div>
                </div>
                <div style={{ marginTop: "7px", fontSize: "12px", color: "#627d98", lineHeight: 1.6 }}>Status: {formatValue(event.status_text)} · Estimated: {dateValue(event.estimated_datetime)} · Actual: {dateValue(event.actual_datetime)}</div>
                {(event.location_id || event.port_id || event.vessel_id || event.source_system || event.remarks) && <div style={{ marginTop: "5px", fontSize: "11px", color: "#829ab1", lineHeight: 1.6 }}>
                  Location ID: {formatValue(event.location_id)} · Port ID: {formatValue(event.port_id)} · Vessel ID: {formatValue(event.vessel_id)} · Source: {formatValue(event.source_system)}{event.remarks ? " · " + event.remarks : ""}
                </div>}
              </div>)}</div>}
          </section>
        </> : selected ? <section style={panelStyle}><div style={{ color: "#627d98", fontSize: "13px" }}>Select a shipment to load its tracking details.</div></section> : null}
    </div>
  );
}

export default ShipmentTrackingWorkspace;
