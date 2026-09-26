import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { useAuthorization } from "./auth/useAuthorization";

const emptyClassificationForm = { cargoId: "", productId: "", systemId: "", editionId: "", jurisdictionId: "", classificationRecordId: "", sourceCode: "HUMAN_ENTERED" };

const emptyForm = {
  commodityId: "",
  cargoDescription: "",
  hsCode: "",
  packagingTypeId: "",
  quantity: "",
  quantityUomId: "",
  netWeight: "",
  grossWeight: "",
  weightUomId: "",
  volume: "",
  volumeUomId: "",
  marksAndNumbers: "",
  lotNumber: "",
  productionDate: "",
  expiryDate: "",
};

function ShipmentCargoWorkspace({ shipments = [] }) {
  const [selectedShipmentId, setSelectedShipmentId] = useState("");
  const { hasPermission } = useAuthorization(true);
  const [canEdit, setCanEdit] = useState(false);
  const [masterDataView, setMasterDataView] = useState(false);
  const [classificationVerify, setClassificationVerify] = useState(false);
  const [references, setReferences] = useState({ commodities: [], packagingTypes: [], uoms: [] });
  const [cargoRows, setCargoRows] = useState([]);
  const [classificationRows, setClassificationRows] = useState([]);
  const [classificationReferences, setClassificationReferences] = useState({ products: [], systems: [], jurisdictions: [], editions: [], records: [] });
  const [classificationForm, setClassificationForm] = useState(emptyClassificationForm);
  const [classificationSubmitting, setClassificationSubmitting] = useState(false);
  const [classificationReviewingId, setClassificationReviewingId] = useState(null);
  const [classificationVerifyingId, setClassificationVerifyingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [referencesLoading, setReferencesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!selectedShipmentId && shipments.length) {
      setSelectedShipmentId(String(shipments[0].shipment_id));
    }
  }, [shipments, selectedShipmentId]);

  useEffect(() => {
    let mounted = true;
    const loadReferences = async () => {
      setReferencesLoading(true);
      const [masterView, cargoEdit, classificationVerify] = await Promise.all([
        hasPermission("MASTER_DATA_VIEW"),
        hasPermission("CARGO_EDIT"),
        hasPermission("SHIPMENT_CLASSIFICATION_VERIFY"),
      ]);
      if (!mounted) return;
      setMasterDataView(masterView === true);
      setCanEdit(cargoEdit === true);
      setClassificationVerify(classificationVerify === true);
      const commodityResult = masterView
        ? await supabase.from("commodities").select("commodity_id, commodity_code, commodity_name, hs_code, default_uom_id").eq("is_active", true).order("commodity_name")
        : { data: [], error: null };
      const results = await Promise.all([
        Promise.resolve(commodityResult),
        supabase.from("packaging_types").select("packaging_type_id, type_code, type_name").eq("is_active", true).order("type_name"),
        supabase.from("unit_of_measures").select("uom_id, uom_code, uom_name").eq("is_active", true).order("uom_code"),
      ]);
      if (!mounted) return;
      const firstError = results.find((item) => item?.error)?.error;
      if (firstError) setError(firstError.message || "Unable to load cargo reference data.");
      else setReferences({
        commodities: results[0]?.data ?? [],
        packagingTypes: results[1]?.data ?? [],
        uoms: results[2]?.data ?? [],
      });
      setReferencesLoading(false);
    };
    loadReferences();
    return () => { mounted = false; };
  }, [hasPermission]);

  const loadClassification = async (cargoIds) => {
    if (!cargoIds.length) { setClassificationRows([]); return; }
    const result = await supabase.from("shipment_cargo_classification").select("shipment_cargo_classification_id,shipment_cargo_id,product_id,classification_record_id,classification_code_snapshot,classification_description_snapshot,classification_system_code_snapshot,classification_edition_code_snapshot,jurisdiction_code_snapshot,status_code,source_code,verified_by,verified_at").in("shipment_cargo_id", cargoIds).order("shipment_cargo_classification_id", { ascending: false });
    if (!result.error) setClassificationRows(result.data || []);
  };

  const loadCargo = async (shipmentId) => {
    if (!shipmentId) {
      setCargoRows([]);
      return;
    }
    setLoading(true);
    setError("");
    const result = await supabase
      .from("shipment_cargo")
      .select("shipment_cargo_id, shipment_id, commodity_id, cargo_description, hs_code, packaging_type_id, quantity, quantity_uom_id, net_weight, gross_weight, weight_uom_id, volume, volume_uom_id, marks_and_numbers, lot_number, production_date, expiry_date, created_at, updated_at")
      .eq("shipment_id", Number(shipmentId))
      .order("shipment_cargo_id", { ascending: false });
    if (result.error) setError(result.error.message || "Unable to load shipment cargo.");
    else { setCargoRows(result.data ?? []); await loadClassification((result.data ?? []).map((row) => row.shipment_cargo_id)); }
    setLoading(false);
  };

  useEffect(() => {
    if (masterDataView) {
      Promise.all([
        supabase.from("product").select("product_id,product_code,product_name").eq("is_active", true).order("product_name"),
        supabase.from("classification_system").select("classification_system_id,system_code,system_name").eq("is_active", true).order("system_name"),
        supabase.from("classification_jurisdiction").select("classification_jurisdiction_id,jurisdiction_code,jurisdiction_name").eq("is_active", true).order("jurisdiction_name"),
        supabase.from("classification_edition").select("classification_edition_id,classification_system_id,edition_code,edition_name,status_code").eq("status_code", "ACTIVE").order("edition_code"),
        supabase.from("classification_record").select("classification_record_id,classification_edition_id,classification_jurisdiction_id,classification_code,official_description,status_code").eq("status_code", "ACTIVE").order("classification_code")
      ]).then(([products, systems, jurisdictions, editions, records]) => {
        const firstError = [products, systems, jurisdictions, editions, records].find((x) => x.error)?.error;
        if (firstError) setError(firstError.message || "Unable to load classification reference data.");
        else setClassificationReferences({ products: products.data || [], systems: systems.data || [], jurisdictions: jurisdictions.data || [], editions: editions.data || [], records: records.data || [] });
      });
    }
    loadCargo(selectedShipmentId);
    setForm(emptyForm);
    setClassificationForm(emptyClassificationForm);
    setMessage("");
  }, [selectedShipmentId, masterDataView]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const selectedShipment = useMemo(
    () => shipments.find((item) => String(item.shipment_id) === String(selectedShipmentId)),
    [shipments, selectedShipmentId]
  );

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selectedShipmentId) {
      setError("Select a shipment first.");
      return;
    }
    if (!form.commodityId) {
      setError("Commodity is required.");
      return;
    }

    setSubmitting(true);
    const { data, error: rpcError } = await supabase.rpc("create_shipment_cargo", {
      p_shipment_id: Number(selectedShipmentId),
      p_commodity_id: Number(form.commodityId),
      p_cargo_description: form.cargoDescription.trim() || null,
      p_hs_code: form.hsCode.trim() || null,
      p_packaging_type_id: form.packagingTypeId ? Number(form.packagingTypeId) : null,
      p_quantity: form.quantity === "" ? null : Number(form.quantity),
      p_quantity_uom_id: form.quantityUomId ? Number(form.quantityUomId) : null,
      p_net_weight: form.netWeight === "" ? null : Number(form.netWeight),
      p_gross_weight: form.grossWeight === "" ? null : Number(form.grossWeight),
      p_weight_uom_id: form.weightUomId ? Number(form.weightUomId) : null,
      p_volume: form.volume === "" ? null : Number(form.volume),
      p_volume_uom_id: form.volumeUomId ? Number(form.volumeUomId) : null,
      p_marks_and_numbers: form.marksAndNumbers.trim() || null,
      p_lot_number: form.lotNumber.trim() || null,
      p_production_date: form.productionDate || null,
      p_expiry_date: form.expiryDate || null,
    });

    if (rpcError) {
      setError(rpcError.message || "Unable to create cargo line.");
      setSubmitting(false);
      return;
    }

    if (!data?.success || !data?.shipment_cargo_id || Number(data.shipment_id) !== Number(selectedShipmentId)) {
      setError("Cargo creation returned an invalid result. No local cargo state was assumed.");
      setSubmitting(false);
      return;
    }

    setForm(emptyForm);
    setMessage(`Cargo line ${data.shipment_cargo_id} created successfully for ${selectedShipment?.shipment_number || "shipment"}.`);
    setSubmitting(false);
    await loadCargo(selectedShipmentId);
  };

  const submitClassificationForReview = async (id) => {
    setClassificationReviewingId(id);
    setError("");
    setMessage("");
    const { data, error: rpcError } = await supabase.rpc("submit_shipment_cargo_classification_for_review", {
      p_shipment_cargo_classification_id: Number(id),
      p_reason: null,
    });
    if (rpcError) setError(rpcError.message || "Unable to submit classification for review.");
    else if (!data?.success || data?.status_code !== "UNDER_REVIEW") setError("Classification review submission returned an invalid result.");
    else { setMessage("Classification proposal submitted for review."); await loadCargo(selectedShipmentId); }
    setClassificationReviewingId(null);
  };

  const verifyClassification = async (id) => {
    setClassificationVerifyingId(id);
    setError("");
    setMessage("");
    const { data, error: rpcError } = await supabase.rpc("verify_shipment_cargo_classification", {
      p_shipment_cargo_classification_id: Number(id),
      p_reason: null,
    });
    if (rpcError) setError(rpcError.message || "Unable to verify classification.");
    else if (!data?.success || data?.status_code !== "VERIFIED") setError("Classification verification returned an invalid result.");
    else { setMessage("Classification verified successfully."); await loadCargo(selectedShipmentId); }
    setClassificationVerifyingId(null);
  };

  const inputStyle = { width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e0", borderRadius: "7px", padding: "9px 10px", fontSize: "12px", color: "#172033", background: "#ffffff" };
  const labelStyle = { display: "block", marginBottom: "5px", fontSize: "11px", fontWeight: "600", color: "#334e68" };
  const fieldStyle = { marginBottom: "13px" };
  const select = (label, field, options, key, labelFn) => (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      <select value={form[field]} onChange={(e) => update(field, e.target.value)} style={inputStyle} disabled={submitting}>
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((item) => <option key={item[key]} value={item[key]}>{labelFn(item)}</option>)}
      </select>
    </div>
  );

  return (
    <section style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", marginTop: "20px" }}>
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.7px" }}>Controlled workflow</div>
        <h2 style={{ margin: "5px 0 5px", fontSize: "19px", color: "#173b6c" }}>Shipment Cargo</h2>
        <p style={{ margin: 0, color: "#627d98", fontSize: "12px", lineHeight: 1.6 }}>Add cargo lines to an existing shipment through the controlled CARGO_EDIT workflow.</p>
      </div>

      {error && <div style={{ marginBottom: "14px", color: "#b83232", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "7px", padding: "9px 11px", fontSize: "12px" }}>{error}</div>}
      {message && <div style={{ marginBottom: "14px", color: "#1f7a5a", background: "#f0fff4", border: "1px solid #c6f6d5", borderRadius: "7px", padding: "9px 11px", fontSize: "12px" }}>{message}</div>}

      <div style={fieldStyle}>
        <label style={labelStyle}>Shipment</label>
        <select value={selectedShipmentId} onChange={(e) => setSelectedShipmentId(e.target.value)} style={inputStyle}>
          <option value="">Select shipment</option>
          {shipments.map((item) => <option key={item.shipment_id} value={item.shipment_id}>{item.shipment_number} — {item.status?.status_name || item.status?.status_code || "Status unavailable"}</option>)}
        </select>
      </div>

      {selectedShipmentId && (
        <>
          <div style={{ marginBottom: "18px", color: "#627d98", fontSize: "12px" }}>
            Existing cargo lines: <strong>{loading ? "Loading..." : cargoRows.length}</strong>
          </div>

          {canEdit && masterDataView && references.commodities.length > 0 && (
            <form onSubmit={submit}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "0 16px" }}>
                {select("Commodity", "commodityId", references.commodities, "commodity_id", (item) => item.commodity_name || item.commodity_code)}
                {select("Packaging Type", "packagingTypeId", references.packagingTypes, "packaging_type_id", (item) => item.type_name || item.type_code)}
                <div style={fieldStyle}><label style={labelStyle}>Cargo Description</label><input value={form.cargoDescription} onChange={(e) => update("cargoDescription", e.target.value)} maxLength={4000} style={inputStyle} disabled={submitting} /></div>
                <div style={fieldStyle}><label style={labelStyle}>HS Code</label><input value={form.hsCode} onChange={(e) => update("hsCode", e.target.value)} style={inputStyle} disabled={submitting} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Quantity</label><input type="number" min="0" step="any" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} style={inputStyle} disabled={submitting} /></div>
                {select("Quantity UOM", "quantityUomId", references.uoms, "uom_id", (item) => item.uom_code + " — " + item.uom_name)}
                <div style={fieldStyle}><label style={labelStyle}>Net Weight</label><input type="number" min="0" step="any" value={form.netWeight} onChange={(e) => update("netWeight", e.target.value)} style={inputStyle} disabled={submitting} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Gross Weight</label><input type="number" min="0" step="any" value={form.grossWeight} onChange={(e) => update("grossWeight", e.target.value)} style={inputStyle} disabled={submitting} /></div>
                {select("Weight UOM", "weightUomId", references.uoms, "uom_id", (item) => item.uom_code + " — " + item.uom_name)}
                <div style={fieldStyle}><label style={labelStyle}>Volume</label><input type="number" min="0" step="any" value={form.volume} onChange={(e) => update("volume", e.target.value)} style={inputStyle} disabled={submitting} /></div>
                {select("Volume UOM", "volumeUomId", references.uoms, "uom_id", (item) => item.uom_code + " — " + item.uom_name)}
                <div style={fieldStyle}><label style={labelStyle}>Lot Number</label><input value={form.lotNumber} onChange={(e) => update("lotNumber", e.target.value)} style={inputStyle} disabled={submitting} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Production Date</label><input type="date" value={form.productionDate} onChange={(e) => update("productionDate", e.target.value)} style={inputStyle} disabled={submitting} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Expiry Date</label><input type="date" value={form.expiryDate} onChange={(e) => update("expiryDate", e.target.value)} style={inputStyle} disabled={submitting} /></div>
              </div>
              <div style={fieldStyle}><label style={labelStyle}>Marks & Numbers</label><textarea rows={3} maxLength={4000} value={form.marksAndNumbers} onChange={(e) => update("marksAndNumbers", e.target.value)} style={{ ...inputStyle, resize: "vertical" }} disabled={submitting} /></div>
              <button type="submit" disabled={submitting || referencesLoading} style={{ border: "none", borderRadius: "7px", padding: "10px 14px", background: "#173b6c", color: "#ffffff", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
                {submitting ? "Adding Cargo..." : "Add Cargo Line"}
              </button>
            </form>
          )}

          {canEdit && masterDataView && cargoRows.length > 0 && (
            <div style={{ marginTop: "22px", padding: "16px", border: "1px solid #e5e9f0", borderRadius: "10px", background: "#f8fafc" }}>
              <h3 style={{ margin: "0 0 6px", fontSize: "15px", color: "#173b6c" }}>Classification Proposal</h3>
              <p style={{ margin: "0 0 14px", fontSize: "11px", color: "#627d98" }}>Create a proposed product classification for an existing cargo line. Verification is a separate controlled step.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: "0 16px" }}>
                <div style={fieldStyle}><label style={labelStyle}>Cargo Line</label><select value={classificationForm.cargoId || ""} onChange={(e) => setClassificationForm((x) => ({...x,cargoId:e.target.value}))} style={inputStyle}><option value="">Select cargo line</option>{cargoRows.map((x) => <option key={x.shipment_cargo_id} value={x.shipment_cargo_id}>Line {x.shipment_cargo_id} — {x.cargo_description || "Cargo"}</option>)}</select></div>
                <div style={fieldStyle}><label style={labelStyle}>Product / Sub-commodity</label><select value={classificationForm.productId} onChange={(e) => setClassificationForm((x) => ({...x,productId:e.target.value}))} style={inputStyle}><option value="">Select product</option>{classificationReferences.products.map((x) => <option key={x.product_id} value={x.product_id}>{x.product_name} ({x.product_code})</option>)}</select></div>
                <div style={fieldStyle}><label style={labelStyle}>Classification System</label><select value={classificationForm.systemId || ""} onChange={(e) => setClassificationForm((x) => ({...x,systemId:e.target.value,editionId:"",jurisdictionId:"",classificationRecordId:""}))} style={inputStyle}><option value="">Select system</option>{classificationReferences.systems.map((x) => <option key={x.classification_system_id} value={x.classification_system_id}>{x.system_name} ({x.system_code})</option>)}</select></div>
                <div style={fieldStyle}><label style={labelStyle}>Edition</label><select value={classificationForm.editionId || ""} onChange={(e) => setClassificationForm((x) => ({...x,editionId:e.target.value,classificationRecordId:""}))} style={inputStyle}><option value="">Select edition</option>{classificationReferences.editions.filter((x) => String(x.classification_system_id) === String(classificationForm.systemId)).map((x) => <option key={x.classification_edition_id} value={x.classification_edition_id}>{x.edition_code} — {x.edition_name}</option>)}</select></div>
                <div style={fieldStyle}><label style={labelStyle}>Jurisdiction</label><select value={classificationForm.jurisdictionId || ""} onChange={(e) => setClassificationForm((x) => ({...x,jurisdictionId:e.target.value,classificationRecordId:""}))} style={inputStyle}><option value="">Select jurisdiction</option>{classificationReferences.jurisdictions.map((x) => <option key={x.classification_jurisdiction_id} value={x.classification_jurisdiction_id}>{x.jurisdiction_name} ({x.jurisdiction_code})</option>)}</select></div>
                <div style={fieldStyle}><label style={labelStyle}>Classification Record</label><select value={classificationForm.classificationRecordId} onChange={(e) => setClassificationForm((x) => ({...x,classificationRecordId:e.target.value}))} style={inputStyle}><option value="">Select classification</option>{classificationReferences.records.filter((x) => String(x.classification_edition_id) === String(classificationForm.editionId) && String(x.classification_jurisdiction_id) === String(classificationForm.jurisdictionId)).map((x) => <option key={x.classification_record_id} value={x.classification_record_id}>{x.classification_code} — {x.official_description}</option>)}</select></div>
              </div>
              <button type="button" disabled={classificationSubmitting || !classificationForm.cargoId || !classificationForm.productId || !classificationForm.classificationRecordId} onClick={async () => {
                setClassificationSubmitting(true); setError(""); setMessage("");
                const {data,error:rpcError}=await supabase.rpc("create_shipment_cargo_classification",{p_shipment_cargo_id:Number(classificationForm.cargoId),p_product_id:Number(classificationForm.productId),p_classification_record_id:Number(classificationForm.classificationRecordId),p_source_code:classificationForm.sourceCode});
                if (rpcError) setError(rpcError.message || "Unable to create classification proposal.");
                else if (!data?.success || data?.status_code !== "SUGGESTED") setError("Classification creation returned an invalid result.");
                else { setMessage("Classification proposal created successfully."); setClassificationForm(emptyClassificationForm); await loadCargo(selectedShipmentId); }
                setClassificationSubmitting(false);
              }} style={{ border:"none",borderRadius:"7px",padding:"10px 14px",background:"#173b6c",color:"#fff",fontSize:"12px",fontWeight:"700" }}>{classificationSubmitting ? "Creating Proposal..." : "Create Classification Proposal"}</button>
              {classificationReferences.products.length === 0 || classificationReferences.records.length === 0 ? <div style={{ marginTop:"10px",fontSize:"11px",color:"#627d98" }}>No active classification reference records are currently available.</div> : null}
            </div>
          )}

          {classificationRows.length > 0 && (
            <div style={{ marginTop: "22px", overflowX: "auto" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "15px", color: "#173b6c" }}>Classification Proposals</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
                <thead><tr style={{ borderBottom: "1px solid #d9e2ec" }}>{["Cargo Line","Product","Classification","System","Edition","Jurisdiction","Status","Source","Actions"].map((heading) => <th key={heading} style={{ padding: "8px", textAlign: "left", fontSize: "10px", color: "#627d98", textTransform: "uppercase" }}>{heading}</th>)}</tr></thead>
                <tbody>{classificationRows.map((item) => <tr key={item.shipment_cargo_classification_id} style={{ borderBottom: "1px solid #eef2f7" }}>
                  <td style={{ padding: "9px 8px", fontSize: "11px", color: "#627d98" }}>{item.shipment_cargo_id}</td>
                  <td style={{ padding: "9px 8px", fontSize: "11px", color: "#334e68" }}>{item.product_id}</td>
                  <td style={{ padding: "9px 8px", fontSize: "11px", color: "#334e68" }}>{item.classification_code_snapshot} — {item.classification_description_snapshot}</td>
                  <td style={{ padding: "9px 8px", fontSize: "11px", color: "#627d98" }}>{item.classification_system_code_snapshot || "—"}</td>
                  <td style={{ padding: "9px 8px", fontSize: "11px", color: "#627d98" }}>{item.classification_edition_code_snapshot || "—"}</td>
                  <td style={{ padding: "9px 8px", fontSize: "11px", color: "#627d98" }}>{item.jurisdiction_code_snapshot || "—"}</td>
                  <td style={{ padding: "9px 8px", fontSize: "11px", fontWeight: "700", color: item.status_code === "SUGGESTED" ? "#8a5a00" : "#334e68" }}>{item.status_code}</td>
                  <td style={{ padding: "9px 8px", fontSize: "11px", color: "#627d98", whiteSpace: "nowrap" }}>
                    {item.status_code === "SUGGESTED" && canEdit && (
                      <button type="button" onClick={() => submitClassificationForReview(item.shipment_cargo_classification_id)} disabled={classificationReviewingId === item.shipment_cargo_classification_id} style={{ marginRight: "6px", border: "1px solid #cbd5e0", borderRadius: "6px", padding: "6px 8px", background: "#fff", color: "#334e68", fontSize: "10px", fontWeight: "700" }}>
                        {classificationReviewingId === item.shipment_cargo_classification_id ? "Submitting..." : "Submit Review"}
                      </button>
                    )}
                    {item.status_code === "UNDER_REVIEW" && classificationVerify && (
                      <button type="button" onClick={() => verifyClassification(item.shipment_cargo_classification_id)} disabled={classificationVerifyingId === item.shipment_cargo_classification_id} style={{ border: "none", borderRadius: "6px", padding: "6px 8px", background: "#173b6c", color: "#fff", fontSize: "10px", fontWeight: "700" }}>
                        {classificationVerifyingId === item.shipment_cargo_classification_id ? "Verifying..." : "Verify"}
                      </button>
                    )}
                    {item.status_code === "VERIFIED" && <span style={{ fontSize: "10px", fontWeight: "700" }}>Verified</span>}
                  </td>
                </tr>)}</tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: "22px", overflowX: "auto" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: "15px", color: "#173b6c" }}>Cargo lines</h3>
            {cargoRows.length === 0 ? (
              <div style={{ color: "#627d98", fontSize: "12px" }}>No cargo lines are recorded for this shipment.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "850px" }}>
                <thead><tr style={{ borderBottom: "1px solid #d9e2ec" }}>{["ID", "Commodity", "HS Code", "Quantity", "Net", "Gross", "Volume", "Lot"].map((heading) => <th key={heading} style={{ padding: "8px", textAlign: "left", fontSize: "10px", color: "#627d98", textTransform: "uppercase" }}>{heading}</th>)}</tr></thead>
                <tbody>{cargoRows.map((item) => <tr key={item.shipment_cargo_id} style={{ borderBottom: "1px solid #eef2f7" }}>
                  <td style={{ padding: "9px 8px", fontSize: "11px", color: "#627d98" }}>{item.shipment_cargo_id}</td>
                  <td style={{ padding: "9px 8px", fontSize: "11px", color: "#334e68" }}>{item.commodity_id}</td>
                  <td style={{ padding: "9px 8px", fontSize: "11px", color: "#627d98" }}>{item.hs_code || "—"}</td>
                  <td style={{ padding: "9px 8px", fontSize: "11px", color: "#627d98" }}>{item.quantity ?? "—"}{item.quantity_uom_id ? " / " + item.quantity_uom_id : ""}</td>
                  <td style={{ padding: "9px 8px", fontSize: "11px", color: "#627d98" }}>{item.net_weight ?? "—"}{item.weight_uom_id ? " / " + item.weight_uom_id : ""}</td>
                  <td style={{ padding: "9px 8px", fontSize: "11px", color: "#627d98" }}>{item.gross_weight ?? "—"}{item.weight_uom_id ? " / " + item.weight_uom_id : ""}</td>
                  <td style={{ padding: "9px 8px", fontSize: "11px", color: "#627d98" }}>{item.volume ?? "—"}{item.volume_uom_id ? " / " + item.volume_uom_id : ""}</td>
                  <td style={{ padding: "9px 8px", fontSize: "11px", color: "#627d98" }}>{item.lot_number || "—"}</td>
                </tr>)}</tbody>
              </table>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default ShipmentCargoWorkspace;
