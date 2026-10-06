import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

const emptyForm = {
  shipmentId: "",
  customerId: "",
  transporterId: "",
  originLocationId: "",
  destinationLocationId: "",
  plannedDeliveryDate: "",
  estimatedDeliveryDate: "",
  vehicleReference: "",
  driverName: "",
  driverPhone: "",
  deliveryInstructions: "",
  remarks: "",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  fontSize: "14px",
  background: "#ffffff",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontSize: "12px",
  fontWeight: "600",
  color: "#334e68",
};

const fieldStyle = {
  marginBottom: "14px",
};

export default function CreateDeliveryForm({ onCreated, onCancel }) {
  const [form, setForm] = useState(emptyForm);
  const [shipments, setShipments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loadingReferences, setLoadingReferences] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadReferences = async () => {
      setLoadingReferences(true);
      setError("");

      try {
        const [
          shipmentResult,
          customerResult,
          transporterResult,
          locationResult,
        ] = await Promise.all([
          supabase
            .from("shipments")
            .select(
              "shipment_id, shipment_number, shipment_status_id, planned_departure_date, planned_arrival_date"
            )
            .order("shipment_number", { ascending: true })
            .limit(50),

          supabase
            .from("customers")
            .select("customer_id, customer_reference, is_active")
            .eq("is_active", true)
            .order("customer_reference", { ascending: true }),

          supabase
            .from("transporters")
            .select(
              "transporter_id, transporter_reference, is_active"
            )
            .eq("is_active", true)
            .order("transporter_reference", { ascending: true }),

          supabase
            .from("locations")
            .select(
              "location_id, location_code, location_name, location_type, is_active"
            )
            .eq("is_active", true)
            .order("location_name", { ascending: true }),
        ]);

        if (!isMounted) return;

        const firstError = [
          shipmentResult,
          customerResult,
          transporterResult,
          locationResult,
        ].find((result) => result?.error)?.error;

        if (firstError) {
          throw firstError;
        }

        setShipments(shipmentResult.data ?? []);
        setCustomers(customerResult.data ?? []);
        setTransporters(transporterResult.data ?? []);
        setLocations(locationResult.data ?? []);
      } catch (loadError) {
        if (isMounted) {
          console.error(
            "CargoDesk Create Delivery reference load failed:",
            loadError
          );
          setError(
            loadError?.message ||
              "Unable to load the reference data required to create a delivery."
          );
        }
      } finally {
        if (isMounted) {
          setLoadingReferences(false);
        }
      }
    };

    loadReferences();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!form.shipmentId) {
      setError("Shipment is required.");
      return;
    }

    if (
      form.plannedDeliveryDate &&
      form.estimatedDeliveryDate &&
      new Date(form.estimatedDeliveryDate) <
        new Date(form.plannedDeliveryDate)
    ) {
      setError(
        "Estimated delivery date cannot be before the planned delivery date."
      );
      return;
    }

    setSubmitting(true);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "create_delivery",
        {
          p_shipment_id: Number(form.shipmentId),
          p_customer_id: form.customerId
            ? Number(form.customerId)
            : null,
          p_transporter_id: form.transporterId
            ? Number(form.transporterId)
            : null,
          p_origin_location_id: form.originLocationId
            ? Number(form.originLocationId)
            : null,
          p_destination_location_id: form.destinationLocationId
            ? Number(form.destinationLocationId)
            : null,
          p_planned_delivery_date: form.plannedDeliveryDate
            ? new Date(form.plannedDeliveryDate).toISOString()
            : null,
          p_estimated_delivery_date: form.estimatedDeliveryDate
            ? new Date(form.estimatedDeliveryDate).toISOString()
            : null,
          p_vehicle_reference:
            form.vehicleReference.trim() || null,
          p_driver_name: form.driverName.trim() || null,
          p_driver_phone: form.driverPhone.trim() || null,
          p_delivery_instructions:
            form.deliveryInstructions.trim() || null,
          p_remarks: form.remarks.trim() || null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      if (
        !data?.success ||
        !data?.delivery_id ||
        !data?.delivery_reference ||
        data?.delivery_status_code !== "PLANNED"
      ) {
        throw new Error(
          data?.message ||
            "Delivery creation did not return the expected successful PLANNED result."
        );
      }

      setForm(emptyForm);

      if (typeof onCreated === "function") {
        onCreated(data);
      }
    } catch (submitError) {
      console.error(
        "CargoDesk Create Delivery submission failed:",
        submitError
      );

      setError(
        submitError?.message ||
          "Unable to create the delivery. Please verify the supplied information and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingReferences) {
    return (
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e5e9f0",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontSize: "14px", color: "#627d98" }}>
          Loading delivery reference data...
        </div>
      </section>
    );
  }

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e5e9f0",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "18px",
              color: "#173b6c",
            }}
          >
            Create Delivery
          </h2>

          <p
            style={{
              margin: "6px 0 0",
              color: "#627d98",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            Create a controlled delivery record. New deliveries are created
            in PLANNED status.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            style={{
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#334e68",
              padding: "8px 12px",
              borderRadius: "8px",
              cursor: submitting ? "not-allowed" : "pointer",
              fontSize: "13px",
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "14px",
          }}
        >
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="delivery-shipment">
              Shipment *
            </label>
            <select
              id="delivery-shipment"
              value={form.shipmentId}
              onChange={(event) =>
                updateField("shipmentId", event.target.value)
              }
              style={inputStyle}
              disabled={submitting}
              required
            >
              <option value="">Select shipment</option>
              {shipments.map((shipment) => (
                <option
                  key={shipment.shipment_id}
                  value={shipment.shipment_id}
                >
                  {shipment.shipment_number} — Status ID{" "}
                  {shipment.shipment_status_id}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="delivery-customer">
              Customer
            </label>
            <select
              id="delivery-customer"
              value={form.customerId}
              onChange={(event) =>
                updateField("customerId", event.target.value)
              }
              style={inputStyle}
              disabled={submitting}
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option
                  key={customer.customer_id}
                  value={customer.customer_id}
                >
                  {customer.customer_reference}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="delivery-transporter">
              Transporter
            </label>
            <select
              id="delivery-transporter"
              value={form.transporterId}
              onChange={(event) =>
                updateField("transporterId", event.target.value)
              }
              style={inputStyle}
              disabled={submitting}
            >
              <option value="">Select transporter</option>
              {transporters.map((transporter) => (
                <option
                  key={transporter.transporter_id}
                  value={transporter.transporter_id}
                >
                  {transporter.transporter_reference}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="delivery-vehicle">
              Vehicle reference
            </label>
            <input
              id="delivery-vehicle"
              type="text"
              value={form.vehicleReference}
              onChange={(event) =>
                updateField("vehicleReference", event.target.value)
              }
              style={inputStyle}
              disabled={submitting}
              maxLength={100}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="delivery-origin">
              Origin
            </label>
            <select
              id="delivery-origin"
              value={form.originLocationId}
              onChange={(event) =>
                updateField("originLocationId", event.target.value)
              }
              style={inputStyle}
              disabled={submitting}
            >
              <option value="">Select origin</option>
              {locations.map((location) => (
                <option
                  key={location.location_id}
                  value={location.location_id}
                >
                  {location.location_code} — {location.location_name}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="delivery-destination">
              Destination
            </label>
            <select
              id="delivery-destination"
              value={form.destinationLocationId}
              onChange={(event) =>
                updateField("destinationLocationId", event.target.value)
              }
              style={inputStyle}
              disabled={submitting}
            >
              <option value="">Select destination</option>
              {locations.map((location) => (
                <option
                  key={location.location_id}
                  value={location.location_id}
                >
                  {location.location_code} — {location.location_name}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="delivery-planned">
              Planned delivery date
            </label>
            <input
              id="delivery-planned"
              type="datetime-local"
              value={form.plannedDeliveryDate}
              onChange={(event) =>
                updateField("plannedDeliveryDate", event.target.value)
              }
              style={inputStyle}
              disabled={submitting}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="delivery-estimated">
              Estimated delivery date
            </label>
            <input
              id="delivery-estimated"
              type="datetime-local"
              value={form.estimatedDeliveryDate}
              onChange={(event) =>
                updateField("estimatedDeliveryDate", event.target.value)
              }
              style={inputStyle}
              disabled={submitting}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="delivery-driver">
              Driver name
            </label>
            <input
              id="delivery-driver"
              type="text"
              value={form.driverName}
              onChange={(event) =>
                updateField("driverName", event.target.value)
              }
              style={inputStyle}
              disabled={submitting}
              maxLength={150}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="delivery-driver-phone">
              Driver phone
            </label>
            <input
              id="delivery-driver-phone"
              type="text"
              value={form.driverPhone}
              onChange={(event) =>
                updateField("driverPhone", event.target.value)
              }
              style={inputStyle}
              disabled={submitting}
              maxLength={50}
            />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="delivery-instructions">
            Delivery instructions
          </label>
          <textarea
            id="delivery-instructions"
            value={form.deliveryInstructions}
            onChange={(event) =>
              updateField("deliveryInstructions", event.target.value)
            }
            style={{
              ...inputStyle,
              minHeight: "90px",
              resize: "vertical",
            }}
            disabled={submitting}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="delivery-remarks">
            Remarks
          </label>
          <textarea
            id="delivery-remarks"
            value={form.remarks}
            onChange={(event) =>
              updateField("remarks", event.target.value)
            }
            style={{
              ...inputStyle,
              minHeight: "90px",
              resize: "vertical",
            }}
            disabled={submitting}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "18px",
          }}
        >
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              style={{
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#334e68",
                padding: "10px 16px",
                borderRadius: "8px",
                cursor: submitting ? "not-allowed" : "pointer",
                fontSize: "13px",
              }}
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              border: "none",
              background: submitting ? "#9fb3c8" : "#173b6c",
              color: "#ffffff",
              padding: "10px 18px",
              borderRadius: "8px",
              cursor: submitting ? "not-allowed" : "pointer",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            {submitting ? "Creating..." : "Create Delivery"}
          </button>
        </div>
      </form>
    </section>
  );
}
