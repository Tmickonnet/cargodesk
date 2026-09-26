import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { useAuthorization } from "./auth/useAuthorization";

function ProductClassificationWorkspace() {
  const { hasPermission } = useAuthorization(true);
  const [canView, setCanView] = useState(false);
  const [products, setProducts] = useState([]);
  const [systems, setSystems] = useState([]);
  const [jurisdictions, setJurisdictions] = useState([]);
  const [editions, setEditions] = useState([]);
  const [records, setRecords] = useState([]);
  const [productMappings, setProductMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      const permitted = await hasPermission("MASTER_DATA_VIEW");
      if (!mounted) return;
      setCanView(permitted === true);
      if (permitted !== true) {
        setLoading(false);
        return;
      }

      const results = await Promise.all([
        supabase.from("product").select("product_id,product_code,product_name,parent_product_id,is_active,effective_from,effective_to").order("product_name"),
        supabase.from("classification_system").select("classification_system_id,system_code,system_name,is_active").order("system_name"),
        supabase.from("classification_jurisdiction").select("classification_jurisdiction_id,jurisdiction_code,jurisdiction_name,country_id,is_active").order("jurisdiction_name"),
        supabase.from("classification_edition").select("classification_edition_id,classification_system_id,edition_code,edition_name,effective_from,effective_to,status_code,source_reference").order("effective_from",{ascending:false}),
        supabase.from("classification_record").select("classification_record_id,classification_edition_id,classification_jurisdiction_id,parent_classification_record_id,classification_code,official_description,status_code").order("classification_code"),
        supabase.from("product_classification").select("product_classification_id,product_id,classification_record_id,effective_from,effective_to,status_code,source_reference").order("product_classification_id")
      ]);
      if (!mounted) return;
      const failure = results.find((item) => item.error)?.error;
      if (failure) setError(failure.message || "Unable to load classification reference data.");
      else {
        setProducts(results[0].data || []);
        setSystems(results[1].data || []);
        setJurisdictions(results[2].data || []);
        setEditions(results[3].data || []);
        setRecords(results[4].data || []);
        setProductMappings(results[5].data || []);
      }
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [hasPermission]);

  if (!canView && !loading) return null;

  const card = { border: "1px solid #e5e9f0", borderRadius: "10px", padding: "14px", background: "#fff" };
  const label = { fontSize: "10px", color: "#627d98", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.5px" };
  const value = { fontSize: "20px", fontWeight: "700", color: "#173b6c", marginTop: "4px" };

  return (
    <section style={{ marginTop: "20px", background: "#f8fafc", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px" }}>
      <div style={{ marginBottom: "16px" }}>
        <div style={label}>Reference workspace</div>
        <h2 style={{ margin: "5px 0", fontSize: "19px", color: "#173b6c" }}>Products & Classification</h2>
        <p style={{ margin: 0, fontSize: "12px", color: "#627d98", lineHeight: 1.6 }}>
          Read-only view of the controlled product and classification reference foundation.
        </p>
      </div>
      {error && <div style={{ marginBottom: "14px", color: "#b83232", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "7px", padding: "9px 11px", fontSize: "12px" }}>{error}</div>}
      {loading ? <div style={{ color: "#627d98", fontSize: "12px" }}>Loading reference data...</div> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "10px", marginBottom: "18px" }}>
            <div style={card}><div style={label}>Products</div><div style={value}>{products.length}</div></div>
            <div style={card}><div style={label}>Systems</div><div style={value}>{systems.length}</div></div>
            <div style={card}><div style={label}>Jurisdictions</div><div style={value}>{jurisdictions.length}</div></div>
            <div style={card}><div style={label}>Editions</div><div style={value}>{editions.length}</div></div>
            <div style={card}><div style={label}>Classification Records</div><div style={value}>{records.length}</div></div>
            <div style={card}><div style={label}>Product Mappings</div><div style={value}>{productMappings.length}</div></div>
          </div>
          <div style={{ color: "#627d98", fontSize: "12px" }}>
            No reference records have been created yet. This workspace intentionally provides read-only visibility until authoritative master-data administration is separately approved.
          </div>
        </>
      )}
    </section>
  );
}

export default ProductClassificationWorkspace;
