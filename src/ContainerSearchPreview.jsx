import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

const cardStyle = { background: "#fff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "16px" };

export default function ContainerSearchPreview({ rows, canView, initialContainerId = null }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [evidence, setEvidence] = useState({ rows: [], loading: false, error: "" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((item) => [
      item.container_number, item.container_status, item.shipmentLink?.shipment_id,
      item.shipmentLink?.booking_id, item.shipmentLink?.seal_number, item.vgm?.vgm_reference,
    ].some((value) => String(value ?? "").toLowerCase().includes(q)));
  }, [rows, query]);

  useEffect(() => {
    if (initialContainerId != null) {
      const match = rows.find((item) => Number(item.container_id) === Number(initialContainerId));
      if (match) setSelected(match);
    }
  }, [initialContainerId, rows]);

  useEffect(() => {
    let mounted = true;
    const loadEvidence = async () => {
      if (!selected?.container_id || !canView) return;
      setEvidence({ rows: [], loading: true, error: "" });
      try {
        const [vgmRecords, stuffingRecords, weighbridgeRecords] = await Promise.all([
          supabase.from("container_vgm").select("container_vgm_id").eq("container_id", selected.container_id),
          supabase.from("stuffing_record").select("stuffing_record_id").eq("container_id", selected.container_id),
          supabase.from("weighbridge_record").select("weighbridge_record_id").eq("container_id", selected.container_id),
        ]);
        const firstRecordError = [vgmRecords, stuffingRecords, weighbridgeRecords].find((x) => x.error)?.error;
        if (firstRecordError) throw new Error(firstRecordError.message);
        const [vgm, stuffing, weighbridge] = await Promise.all([
          supabase.from("vgm_documents").select("document_id, container_vgm_id, remarks").in("container_vgm_id", (vgmRecords.data ?? []).map((x) => x.container_vgm_id)),
          supabase.from("stuffing_documents").select("document_id, stuffing_record_id, remarks").in("stuffing_record_id", (stuffingRecords.data ?? []).map((x) => x.stuffing_record_id)),
          supabase.from("weighbridge_documents").select("document_id, weighbridge_record_id, remarks").in("weighbridge_record_id", (weighbridgeRecords.data ?? []).map((x) => x.weighbridge_record_id)),
        ]);
        const firstLinkError = [vgm, stuffing, weighbridge].find((x) => x.error)?.error;
        if (firstLinkError) throw new Error(firstLinkError.message);
        const links = [
          ...(vgm.data ?? []).map((x) => ({ ...x, evidence_type: "VGM" })),
          ...(stuffing.data ?? []).map((x) => ({ ...x, evidence_type: "Stuffing" })),
          ...(weighbridge.data ?? []).map((x) => ({ ...x, evidence_type: "Weighbridge" })),
        ];
        const ids = [...new Set(links.map((x) => x.document_id))];
        if (!ids.length) { if (mounted) setEvidence({ rows: [], loading: false, error: "" }); return; }
        const docs = await supabase.from("documents")
          .select("document_id, document_title, document_number, file_name, file_path, file_extension, mime_type, file_size_bytes, version_number, is_current_version, document_status_id, uploaded_at, expiry_date, description")
          .in("document_id", ids).order("uploaded_at", { ascending: false });
        if (docs.error) throw new Error(docs.error.message);
        const enriched = (docs.data ?? []).map((doc) => {
          const link = links.find((x) => x.document_id === doc.document_id);
          return { ...doc, evidence_type: link?.evidence_type ?? "Document", remarks: link?.remarks ?? null };
        });
        if (mounted) setEvidence({ rows: enriched, loading: false, error: "" });
      } catch (error) {
        if (mounted) setEvidence({ rows: [], loading: false, error: error.message || "Unable to load evidence." });
      }
    };
    loadEvidence();
    return () => { mounted = false; };
  }, [selected, canView]);

  const openPreview = async (doc) => {
    if (!doc?.file_path) return;
    const { data, error } = await supabase.storage.from("cargodesk-documents").createSignedUrl(doc.file_path, 300);
    if (error) {
      setEvidence((current) => ({ ...current, error: error.message || "Unable to open protected file." }));
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return <div style={{ marginTop: "18px" }}>
    <section style={cardStyle}>
      <div style={{ display: "flex", gap: "12px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div><h2 style={{ margin: 0, fontSize: "18px", color: "#173b6c" }}>Container search & evidence</h2><p style={{ margin: "6px 0 0", color: "#627d98", fontSize: "12px" }}>Search authorized container records and inspect their existing operational evidence.</p></div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search container, shipment, booking, seal..." style={{ minWidth: "280px", padding: "10px 12px", border: "1px solid #bcccdc", borderRadius: "8px" }} />
      </div>
      <div style={{ marginTop: "14px", display: "grid", gap: "8px" }}>
        {filtered.map((item) => <button key={item.container_id} onClick={() => setSelected(item)} style={{ textAlign: "left", border: "1px solid #e5e9f0", background: selected?.container_id === item.container_id ? "#f0f7ff" : "#fff", borderRadius: "8px", padding: "12px", cursor: "pointer" }}>
          <strong style={{ color: "#1f5f95" }}>{item.container_number}</strong><span style={{ marginLeft: "12px", color: "#627d98", fontSize: "12px" }}>Shipment {item.shipmentLink?.shipment_id ?? "—"} · Booking {item.shipmentLink?.booking_id ?? "—"} · Seal {item.shipmentLink?.seal_number || "—"}</span>
        </button>)}
        {!filtered.length && <div style={{ color: "#627d98", fontSize: "13px", padding: "12px 0" }}>No authorized container records match the search.</div>}
      </div>
    </section>
    {selected && <section style={{ ...cardStyle, marginTop: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}><div><h2 style={{ margin: 0, fontSize: "20px", color: "#173b6c" }}>{selected.container_number}</h2><p style={{ margin: "5px 0 0", color: "#627d98", fontSize: "12px" }}>Container ID {selected.container_id}</p></div><button onClick={() => setSelected(null)} style={{ border: "1px solid #bcccdc", background: "#fff", borderRadius: "7px", padding: "7px 12px" }}>Close</button></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "10px", marginTop: "14px" }}>
        {[["Status", selected.container_status],["Type ID", selected.container_type_id],["Shipping line ID", selected.owner_shipping_line_id],["Shipment", selected.shipmentLink?.shipment_id],["Booking", selected.shipmentLink?.booking_id],["Seal", selected.shipmentLink?.seal_number],["VGM", selected.vgm?.vgm_weight],["VGM status ID", selected.vgm?.verification_status_id],["Allocated quantity", selected.allocation?.quantity],["Allocated net", selected.allocation?.netWeight],["Allocated gross", selected.allocation?.grossWeight]].map(([label,value]) => <div key={label} style={{ border: "1px solid #eef2f7", borderRadius: "8px", padding: "10px" }}><div style={{ fontSize: "10px", color: "#627d98", textTransform: "uppercase" }}>{label}</div><div style={{ marginTop: "4px", fontSize: "13px", fontWeight: "600", color: "#243b53" }}>{value ?? "—"}</div></div>)}
      </div>
      <div style={{ marginTop: "18px" }}><h3 style={{ margin: "0 0 8px", fontSize: "15px", color: "#173b6c" }}>Evidence & documents</h3>
        {evidence.loading ? <div style={{ color: "#627d98", fontSize: "13px" }}>Loading protected evidence...</div> : evidence.error ? <div style={{ color: "#b83232", fontSize: "13px" }}>{evidence.error}</div> : !evidence.rows.length ? <div style={{ color: "#627d98", fontSize: "13px" }}>No document evidence is associated with this container through the existing VGM, stuffing or weighbridge relationships.</div> :
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "10px" }}>{evidence.rows.map((doc) => <div key={doc.document_id} style={{ border: "1px solid #e5e9f0", borderRadius: "9px", overflow: "hidden" }}>
            <div style={{ height: "120px", background: "#f5f7fa", display: "flex", alignItems: "center", justifyContent: "center" }}>{/^image\//i.test(doc.mime_type || "") ? "Image" : doc.mime_type === "application/pdf" ? "PDF document" : "Document"}</div>
            <div style={{ padding: "10px" }}><strong style={{ display: "block", fontSize: "13px", color: "#243b53" }}>{doc.document_title || doc.file_name}</strong><span style={{ display: "block", marginTop: "4px", fontSize: "11px", color: "#627d98" }}>{doc.evidence_type} · v{doc.version_number} · {doc.file_name}</span><button onClick={() => openPreview(doc)} style={{ marginTop: "9px", border: "1px solid #1f5f95", color: "#1f5f95", background: "#fff", borderRadius: "7px", padding: "6px 10px", cursor: "pointer" }}>Open secure preview</button></div>
          </div>)}</div>}
      </div>
    </section>}
  </div>;
}
