import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import DocumentApprovalActions from "./DocumentApprovalActions";

const SUBMITTED_STATUS_ID = 2;

export default function DocumentReviewActions({ rows, authorizationLoading, hasPermission, onTransitioned }) {
  const [selected, setSelected] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [canReview, setCanReview] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const resolvePermission = async () => {
      if (authorizationLoading) {
        if (isMounted) setCanReview(false);
        return;
      }
      const permitted = await hasPermission("DOCUMENT_VERIFY");
      if (isMounted) setCanReview(Boolean(permitted));
    };
    resolvePermission();
    return () => { isMounted = false; };
  }, [authorizationLoading, hasPermission]);

  const openReview = (item) => {
    setSelected(item);
    setMessage("");
    setError("");
  };

  const close = () => {
    if (!transitioning) {
      setSelected(null);
      setMessage("");
      setError("");
    }
  };

  const handleStartReview = async () => {
    setError("");
    setMessage("");

    if (!selected || !Number.isInteger(Number(selected.document_id)) || Number(selected.document_id) <= 0) {
      setError("Invalid document identifier.");
      return;
    }

    if (Number(selected.document_status_id) !== SUBMITTED_STATUS_ID) {
      setError("Only SUBMITTED documents can be moved into review.");
      return;
    }

    setTransitioning(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("request_document_transition", {
        p_document_id: Number(selected.document_id),
        p_transition_code: "START_REVIEW",
        p_reason: null,
      });

      if (rpcError) {
        setError(rpcError.message || "Unable to start document review.");
        return;
      }

      if (!data?.allowed || data?.new_status_code !== "UNDER_REVIEW") {
        setError("The document review transition was not confirmed by the controlled workflow.");
        return;
      }

      setMessage("Document review started successfully.");
      const transitionedId = Number(selected.document_id);
      setSelected(null);

      if (onTransitioned) onTransitioned(transitionedId, data);
    } catch (transitionError) {
      setError(transitionError?.message || "Unable to start document review.");
    } finally {
      setTransitioning(false);
    }
  };

  if (!rows?.length) return null;

  return (
    <>
      <DocumentApprovalActions
        rows={rows}
        authorizationLoading={authorizationLoading}
        hasPermission={hasPermission}
        onTransitioned={onTransitioned}
      />

      {message ? (
        <div style={{marginBottom:"12px",padding:"10px 12px",background:"#f0fff4",border:"1px solid #c6f6d5",borderRadius:"8px",color:"#276749",fontSize:"12px"}}>
          {message}
        </div>
      ) : null}

      {error && !selected ? (
        <div style={{marginBottom:"12px",padding:"10px 12px",background:"#fff5f5",border:"1px solid #fed7d7",borderRadius:"8px",color:"#b83232",fontSize:"12px"}}>
          {error}
        </div>
      ) : null}

      <section style={{marginTop:"16px",padding:"14px",background:"#f8fafc",border:"1px solid #e5e9f0",borderRadius:"10px"}}>
        <div style={{fontSize:"11px",fontWeight:"700",color:"#627d98",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"8px"}}>Controlled review action</div>
        <div style={{fontSize:"12px",color:"#627d98",lineHeight:1.6}}>
          Start Review is available only for SUBMITTED documents and only when the existing DOCUMENT_VERIFY permission is granted. The database transition function remains authoritative.
        </div>
        <div style={{marginTop:"10px",display:"flex",flexWrap:"wrap",gap:"8px"}}>
          {rows.filter((item) => Number(item.document_status_id) === SUBMITTED_STATUS_ID).map((item) =>
            canReview ? (
              <button key={item.document_id} type="button" onClick={() => openReview(item)} disabled={transitioning}
                style={{border:"1px solid #1f5f95",background:"#ffffff",color:"#1f5f95",borderRadius:"7px",padding:"7px 10px",cursor:transitioning ? "not-allowed" : "pointer",fontSize:"12px",fontWeight:"600"}}>
                Start Review {item.document_number || "Document " + item.document_id}
              </button>
            ) : null
          )}
          {!canReview ? <span style={{fontSize:"12px",color:"#627d98"}}>Review action is not available for the current authorization context.</span> : null}
        </div>
      </section>

      {selected ? (
        <div style={{marginTop:"14px",padding:"14px",background:"#ffffff",border:"1px solid #d9e2ec",borderRadius:"10px"}}>
          <div style={{fontSize:"13px",fontWeight:"700",color:"#173b6c"}}>Start review for {selected.document_number || "Document " + selected.document_id}?</div>
          <div style={{marginTop:"6px",fontSize:"12px",color:"#627d98",lineHeight:1.6}}>
            This invokes the existing controlled SUBMITTED → UNDER_REVIEW transition. No direct document update or audit insert is performed by the application.
          </div>
          {error ? <div style={{marginTop:"10px",padding:"9px 10px",background:"#fff5f5",border:"1px solid #fed7d7",borderRadius:"7px",color:"#b83232",fontSize:"12px"}}>{error}</div> : null}
          <div style={{marginTop:"12px",display:"flex",gap:"8px"}}>
            <button type="button" onClick={handleStartReview} disabled={transitioning}
              style={{border:"1px solid #1f5f95",background:"#1f5f95",color:"#ffffff",borderRadius:"7px",padding:"8px 12px",cursor:transitioning ? "not-allowed" : "pointer",fontSize:"12px",fontWeight:"700"}}>
              {transitioning ? "Starting Review..." : "Confirm Start Review"}
            </button>
            <button type="button" onClick={close} disabled={transitioning}
              style={{border:"1px solid #cbd5e0",background:"#ffffff",color:"#486581",borderRadius:"7px",padding:"8px 12px",cursor:transitioning ? "not-allowed" : "pointer",fontSize:"12px",fontWeight:"600"}}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
