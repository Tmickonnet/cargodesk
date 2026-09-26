import React, { useState } from "react";
import { supabase } from "./lib/supabase";

const DRAFT_STATUS_ID = 1;

export default function DocumentSubmitActions({
  rows,
  authorizationLoading,
  hasPermission,
  onTransitioned,
}) {
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canManage = !authorizationLoading && hasPermission("DOCUMENT_EDIT");

  const openSubmit = (item) => {
    setSelected(item);
    setMessage("");
    setError("");
  };

  const close = () => {
    if (!submitting) {
      setSelected(null);
      setMessage("");
      setError("");
    }
  };

  const handleSubmit = async () => {
    setError("");
    setMessage("");

    if (!selected || !Number.isInteger(Number(selected.document_id)) || Number(selected.document_id) <= 0) {
      setError("Invalid document identifier.");
      return;
    }

    if (Number(selected.document_status_id) !== DRAFT_STATUS_ID) {
      setError("Only DRAFT documents can be submitted.");
      return;
    }

    setSubmitting(true);

    try {
      const { data, error: rpcError } = await supabase.rpc("request_document_transition", {
        p_document_id: Number(selected.document_id),
        p_transition_code: "SUBMIT",
        p_reason: null,
      });

      if (rpcError) {
        setError(rpcError.message || "Unable to submit the document.");
        return;
      }

      if (!data?.allowed || data?.new_status_code !== "SUBMITTED") {
        setError("The document transition was not confirmed by the controlled workflow.");
        return;
      }

      setMessage("Document submitted successfully.");
      setSelected(null);

      if (onTransitioned) {
        onTransitioned(Number(selected.document_id), data);
      }
    } catch (submitError) {
      setError(submitError?.message || "Unable to submit the document.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!rows?.length) {
    return null;
  }

  return (
    <>
      {message ? (
        <div style={{ marginBottom: "12px", padding: "10px 12px", background: "#f0fff4", border: "1px solid #c6f6d5", borderRadius: "8px", color: "#276749", fontSize: "12px" }}>
          {message}
        </div>
      ) : null}
      {error && !selected ? (
        <div style={{ marginBottom: "12px", padding: "10px 12px", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "8px", color: "#b83232", fontSize: "12px" }}>
          {error}
        </div>
      ) : null}

      <section style={{ marginTop: "16px", padding: "14px", background: "#f8fafc", border: "1px solid #e5e9f0", borderRadius: "10px" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
          Controlled action
        </div>
        <div style={{ fontSize: "12px", color: "#627d98", lineHeight: 1.6 }}>
          Submit is available only for DRAFT documents and only when the existing DOCUMENT_EDIT permission is granted. The database transition function remains authoritative.
        </div>
        <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {rows.filter((item) => Number(item.document_status_id) === DRAFT_STATUS_ID).map((item) => (
            canManage ? (
              <button
                key={item.document_id}
                type="button"
                onClick={() => openSubmit(item)}
                disabled={submitting}
                style={{ border: "1px solid #1f5f95", background: "#ffffff", color: "#1f5f95", borderRadius: "7px", padding: "7px 10px", cursor: submitting ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: "600" }}
              >
                Submit {item.document_number || ("Document " + item.document_id)}
              </button>
            ) : null
          ))}
          {!canManage ? (
            <span style={{ fontSize: "12px", color: "#627d98" }}>Submit action is not available for the current authorization context.</span>
          ) : null}
        </div>
      </section>

      {selected ? (
        <div style={{ marginTop: "14px", padding: "14px", background: "#ffffff", border: "1px solid #d9e2ec", borderRadius: "10px" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#173b6c" }}>
            Submit {selected.document_number || ("Document " + selected.document_id)}?
          </div>
          <div style={{ marginTop: "6px", fontSize: "12px", color: "#627d98", lineHeight: 1.6 }}>
            This invokes the existing controlled DRAFT → SUBMITTED transition. No direct document update or audit insert is performed by the application.
          </div>
          {error ? (
            <div style={{ marginTop: "10px", padding: "9px 10px", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "7px", color: "#b83232", fontSize: "12px" }}>
              {error}
            </div>
          ) : null}
          <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
            <button type="button" onClick={handleSubmit} disabled={submitting} style={{ border: "1px solid #1f5f95", background: "#1f5f95", color: "#ffffff", borderRadius: "7px", padding: "8px 12px", cursor: submitting ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: "700" }}>
              {submitting ? "Submitting..." : "Confirm Submit"}
            </button>
            <button type="button" onClick={close} disabled={submitting} style={{ border: "1px solid #cbd5e0", background: "#ffffff", color: "#486581", borderRadius: "7px", padding: "8px 12px", cursor: submitting ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: "600" }}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
