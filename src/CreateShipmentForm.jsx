import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

const emptyForm = {
  shipmentTypeId: "",
  customerId: "",
  supplierId: "",
  transportModeId: "",
  incotermId: "",
  originLocationId: "",
  destinationLocationId: "",
  originCountryId: "",
  destinationCountryId: "",
  plannedDepartureDate: "",
  plannedArrivalDate: "",
  cargoReadyDate: "",
  specialInstructions: "",
};

function CreateShipmentForm({ onCreated, onCancel }) {
  const [form, setForm] = useState(emptyForm);
  const [references, setReferences] = useState({
    shipmentTypes: [],
    customers: [],
    suppliers: [],
    transportModes: [],
    incoterms: [],
    locations: [],
    countries: [],
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadReferences = async () => {
      setLoading(true);
      setError("");

      const results = await Promise.all([
        supabase.from("shipment_types").select("shipment_type_id, type_code, type_name").eq("is_active", true).order("type_name"),
        supabase.from("customers").select("customer_id, customer_reference, party_id").eq("is_active", true).order("customer_reference"),
        supabase.from("suppliers").select("supplier_id, supplier_reference, party_id").eq("is_active", true).order("supplier_reference"),
        supabase.from("transport_modes").select("transport_mode_id, mode_code, mode_name").eq("is_active", true).order("mode_name"),
        supabase.from("incoterms").select("incoterm_id, incoterm_code, incoterm_name").eq("is_active", true).order("incoterm_code"),
        supabase.from("locations").select("location_id, location_code, location_name").eq("is_active", true).order("location_name"),
        supabase.from("countries").select("country_id, country_code, country_name").eq("is_active", true).order("country_name"),
      ]);

      if (!mounted) return;

      const firstError = results.find((result) => result?.error)?.error;
      if (firstError) {
        setError(firstError.message || "Unable to load shipment reference data.");
        setLoading(false);
        return;
      }

      setReferences({
        shipmentTypes: results[0]?.data ?? [],
        customers: results[1]?.data ?? [],
        suppliers: results[2]?.data ?? [],
        transportModes: results[3]?.data ?? [],
        incoterms: results[4]?.data ?? [],
        locations: results[5]?.data ?? [],
        countries: results[6]?.data ?? [],
      });
      setLoading(false);
    };

    loadReferences();

    return () => {
      mounted = false;
    };
  }, []);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const locationLabel = useMemo(
    () => new Map(references.locations.map((item) => [String(item.location_id), item])),
    [references.locations]
  );

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.shipmentTypeId) {
      setError("Shipment type is required.");
      return;
    }

    setSubmitting(true);

    const { data, error: rpcError } = await supabase.rpc("create_shipment", {
      p_shipment_type_id: Number(form.shipmentTypeId),
      p_customer_id: form.customerId ? Number(form.customerId) : null,
      p_supplier_id: form.supplierId ? Number(form.supplierId) : null,
      p_primary_transport_mode_id: form.transportModeId ? Number(form.transportModeId) : null,
      p_incoterm_id: form.incotermId ? Number(form.incotermId) : null,
      p_origin_location_id: form.originLocationId ? Number(form.originLocationId) : null,
      p_destination_location_id: form.destinationLocationId ? Number(form.destinationLocationId) : null,
      p_origin_country_id: form.originCountryId ? Number(form.originCountryId) : null,
      p_destination_country_id: form.destinationCountryId ? Number(form.destinationCountryId) : null,
      p_planned_departure_date: form.plannedDepartureDate || null,
      p_planned_arrival_date: form.plannedArrivalDate || null,
      p_cargo_ready_date: form.cargoReadyDate || null,
      p_special_instructions: form.specialInstructions.trim() || null,
    });

    if (rpcError) {
      setError(rpcError.message || "Unable to create shipment.");
      setSubmitting(false);
      return;
    }

    if (!data?.success || !data?.shipment_id || !data?.shipment_number || data?.shipment_status_code !== "DRAFT") {
      setError("Shipment creation returned an invalid result. No local shipment state was assumed.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onCreated(data);
  };

  if (loading) {
    return (
      <section style={cardStyle}>
        <h2 style={titleStyle}>Create Shipment</h2>
        <p style={mutedStyle}>Loading authorized reference data...</p>
      </section>
    );
  }

  if (error && references.shipmentTypes.length === 0) {
    return (
      <section style={cardStyle}>
        <h2 style={titleStyle}>Create Shipment</h2>
        <p style={errorStyle}>{error}</p>
        <button type="button" onClick={onCancel} style={secondaryButtonStyle}>Back to Shipments</button>
      </section>
    );
  }

  const selectStyle = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e0",
    borderRadius: "7px",
    padding: "10px 11px",
    fontSize: "13px",
    color: "#172033",
    background: "#ffffff",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#334e68",
  };

  const fieldStyle = { marginBottom: "16px" };

  const renderSelect = (label, field, options, valueKey, labelFn, required = false) => (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}{required ? " *" : ""}</label>
      <select value={form[field]} onChange={(event) => update(field, event.target.value)} style={selectStyle} disabled={submitting}>
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((item) => (
          <option key={item[valueKey]} value={item[valueKey]}>
            {labelFn(item)}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <section style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
        <div>
          <div style={eyebrowStyle}>Controlled workflow</div>
          <h2 style={titleStyle}>Create Shipment</h2>
          <p style={mutedStyle}>Creates one core shipment record in DRAFT. Cargo, booking, legs, and containers are added separately.</p>
        </div>
        <button type="button" onClick={onCancel} style={secondaryButtonStyle} disabled={submitting}>Back</button>
      </div>

      {error && <p style={errorStyle}>{error}</p>}

      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "0 18px" }}>
          {renderSelect("Shipment Type", "shipmentTypeId", references.shipmentTypes, "shipment_type_id", (item) => item.type_name || item.type_code, true)}
          {renderSelect("Customer", "customerId", references.customers, "customer_id", (item) => item.customer_reference)}
          {renderSelect("Supplier", "supplierId", references.suppliers, "supplier_id", (item) => item.supplier_reference)}
          {renderSelect("Primary Transport Mode", "transportModeId", references.transportModes, "transport_mode_id", (item) => item.mode_name || item.mode_code)}
          {renderSelect("Incoterm", "incotermId", references.incoterms, "incoterm_id", (item) => item.incoterm_code + (item.incoterm_name ? " — " + item.incoterm_name : ""))}
          {renderSelect("Origin Location", "originLocationId", references.locations, "location_id", (item) => item.location_name + " (" + item.location_code + ")")}
          {renderSelect("Destination Location", "destinationLocationId", references.locations, "location_id", (item) => item.location_name + " (" + item.location_code + ")")}
          {renderSelect("Origin Country", "originCountryId", references.countries, "country_id", (item) => item.country_name + " (" + item.country_code + ")")}
          {renderSelect("Destination Country", "destinationCountryId", references.countries, "country_id", (item) => item.country_name + " (" + item.country_code + ")")}
          <div style={fieldStyle}>
            <label style={labelStyle}>Planned Departure</label>
            <input type="date" value={form.plannedDepartureDate} onChange={(event) => update("plannedDepartureDate", event.target.value)} style={selectStyle} disabled={submitting} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Planned Arrival</label>
            <input type="date" value={form.plannedArrivalDate} onChange={(event) => update("plannedArrivalDate", event.target.value)} style={selectStyle} disabled={submitting} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Cargo Ready Date</label>
            <input type="date" value={form.cargoReadyDate} onChange={(event) => update("cargoReadyDate", event.target.value)} style={selectStyle} disabled={submitting} />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Special Instructions</label>
          <textarea value={form.specialInstructions} onChange={(event) => update("specialInstructions", event.target.value)} rows={4} maxLength={4000} style={{ ...selectStyle, resize: "vertical" }} disabled={submitting} />
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button type="submit" style={primaryButtonStyle} disabled={submitting}>
            {submitting ? "Creating..." : "Create Shipment"}
          </button>
          <button type="button" onClick={onCancel} style={secondaryButtonStyle} disabled={submitting}>Cancel</button>
        </div>
      </form>
    </section>
  );
}

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e5e9f0",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 8px 30px rgba(16,42,67,0.05)",
};

const titleStyle = { margin: 0, fontSize: "21px", color: "#173b6c" };
const eyebrowStyle = { fontSize: "11px", fontWeight: "700", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "7px" };
const mutedStyle = { margin: "8px 0 0", color: "#627d98", fontSize: "13px", lineHeight: 1.6 };
const errorStyle = { margin: "0 0 16px", color: "#b83232", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "7px", padding: "10px 12px", fontSize: "12px", lineHeight: 1.5 };
const primaryButtonStyle = { border: "none", borderRadius: "7px", padding: "10px 14px", background: "#173b6c", color: "#ffffff", fontSize: "12px", fontWeight: "700", cursor: "pointer" };
const secondaryButtonStyle = { border: "1px solid #d9e2ec", borderRadius: "7px", padding: "9px 13px", background: "#ffffff", color: "#334e68", fontSize: "12px", fontWeight: "600", cursor: "pointer" };

export default CreateShipmentForm;
