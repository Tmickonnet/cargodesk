import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

const exceptionSelect =
  "shipment_exception_id, shipment_id, container_id, shipment_leg_id, exception_reference, exception_type, severity, reported_at, resolved_at, description, corrective_action, status, resolved_by, remarks, updated_at";

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : "—");

export default function ExceptionsWorkspace({
  session,
  role,
  authorizationLoading,
  hasPermission,
}) {

  const [canView, setCanView] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    const resolvePermissions = async () => {
      if (!session || authorizationLoading || !role) {
        if (mounted) {
          setCanView(false);
          setCanManage(false);
        }
        return;
      }

      const [view, manage] = await Promise.all([
        hasPermission("EXCEPTION_VIEW"),
        hasPermission("EXCEPTION_MANAGE"),
      ]);

      if (!mounted) return;
      setCanView(view);
      setCanManage(manage);
    };

    resolvePermissions();

    return () => {
      mounted = false;
    };
  }, [session, authorizationLoading, role, hasPermission]);

  useEffect(() => {
    let mounted = true;

    const loadExceptions = async () => {
      if (!session || authorizationLoading || !role || !canView) return;

      setLoading(true);
      setError("");
      setSuccessMessage("");

      try {
        const result = await supabase
          .from("shipment_exception")
          .select(exceptionSelect)
          .order("updated_at", { ascending: false, nullsFirst: false })
          .limit(50);

        if (!mounted) return;

        if (result.error) {
          setRows([]);
          setError(result.error.message || "Unable to load exception activity.");
          return;
        }

        setRows(result.data ?? []);
      } catch (loadError) {
        if (!mounted) return;
        setRows([]);
        setError(loadError.message || "Unable to load exception activity.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadExceptions();

    return () => {
      mounted = false;
    };
  }, [session, authorizationLoading, role, canView]);

  const openResolution = (exception) => {
    setSelected(exception);
    setCorrectiveAction(exception.corrective_action || "");
    setRemarks(exception.remarks || "");
    setSubmitError("");
    setSuccessMessage("");
  };

  const closeResolution = () => {
    if (submitting) return;
    setSelected(null);
    setCorrectiveAction("");
    setRemarks("");
    setSubmitError("");
  };

  const handleResolve = async (event) => {
    event.preventDefault();

    if (!selected || !canManage || submitting) return;

    const exceptionId = Number(selected.shipment_exception_id);
    const cleanCorrectiveAction = correctiveAction.trim();
    const cleanRemarks = remarks.trim();

    if (!Number.isInteger(exceptionId) || exceptionId <= 0) {
      setSubmitError("A valid exception identifier is required.");
      return;
    }

    if (!cleanCorrectiveAction) {
      setSubmitError("Corrective action is required.");
      return;
    }

    if (cleanCorrectiveAction.length > 4000) {
      setSubmitError("Corrective action must not exceed 4000 characters.");
      return;
    }

    if (cleanRemarks.length > 4000) {
      setSubmitError("Remarks must not exceed 4000 characters.");
      return;
    }

    if (selected.status !== "OPEN") {
      setSubmitError("Only OPEN exceptions can be resolved.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setSuccessMessage("");

    try {
      const { data, error: rpcError } = await supabase.rpc("resolve_exception", {
        p_exception_id: exceptionId,
        p_corrective_action: cleanCorrectiveAction,
        p_remarks: cleanRemarks || null,
      });

      if (rpcError) {
        setSubmitError(rpcError.message || "Exception resolution was rejected.");
        return;
      }

      if (!data?.success) {
        setSubmitError("Exception resolution did not return a successful result.");
        return;
      }

      setRows((current) =>
        current.map((row) =>
          Number(row.shipment_exception_id) === exceptionId
            ? {
                ...row,
                status: "RESOLVED",
                resolved_at: new Date().toISOString(),
                corrective_action: cleanCorrectiveAction,
                remarks: cleanRemarks || null,
              }
            : row
        )
      );
      setSuccessMessage(`Exception ${data.exception_reference || selected.exception_reference} resolved successfully.`);
      closeResolution();
    } catch (rpcFailure) {
      setSubmitError(rpcFailure.message || "Exception resolution was rejected.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authorizationLoading || !role) {
    return (
      <section style={cardStyle}>
        <div style={mutedStyle}>Checking exception authorization...</div>
      </section>
    );
  }

  if (!canView) {
    return (
      <section style={errorCardStyle}>
        <strong style={{ color: "#b83232" }}>Exceptions workspace unavailable.</strong>
        <div style={{ marginTop: "7px", color: "#627d98", fontSize: "13px" }}>
          This account does not have the EXCEPTION_VIEW permission.
        </div>
      </section>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <div style={eyebrowStyle}>Operations</div>
        <h1 style={headingStyle}>Exceptions</h1>
        <p style={descriptionStyle}>
          Review shipment exceptions and resolve authorized OPEN exceptions through the controlled database workflow.
        </p>
      </div>

      {successMessage ? (
        <div style={successCardStyle}>{successMessage}</div>
      ) : null}

      {error ? (
        <div style={errorCardStyle}>
          Unable to load exception activity: {error}
        </div>
      ) : null}

      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
          <h2 style={subheadingStyle}>Exception activity</h2>
          <span style={badgeStyle}>{rows.length} loaded</span>
        </div>

        {loading ? (
          <div style={mutedStyle}>Loading exception activity...</div>
        ) : rows.length === 0 ? (
          <div style={mutedStyle}>No exception records are available through the authorized read path.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1100px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #d9e2ec" }}>
                  {["Reference", "Type", "Severity", "Status", "Shipment", "Reported", "Updated", "Action"].map((heading) => (
                    <th key={heading} style={tableHeadStyle}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const isOpen = item.status === "OPEN";
                  return (
                    <tr key={item.shipment_exception_id} style={{ borderBottom: "1px solid #eef2f7" }}>
                      <td style={tableCellStrongStyle}>{item.exception_reference || "—"}</td>
                      <td style={tableCellStyle}>{item.exception_type || "—"}</td>
                      <td style={tableCellStyle}>{item.severity || "—"}</td>
                      <td style={tableCellStyle}>{item.status || "—"}</td>
                      <td style={tableCellStyle}>{item.shipment_id ?? "—"}</td>
                      <td style={tableCellStyle}>{formatDateTime(item.reported_at)}</td>
                      <td style={tableCellStyle}>{formatDateTime(item.updated_at)}</td>
                      <td style={tableCellStyle}>
                        {canManage && isOpen ? (
                          <button type="button" onClick={() => openResolution(item)} style={actionButtonStyle}>
                            Resolve
                          </button>
                        ) : (
                          <span style={{ color: "#829ab1" }}>{isOpen ? "Not authorized" : "No action"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected ? (
        <section style={{ ...cardStyle, marginTop: "18px" }}>
          <div style={{ marginBottom: "14px" }}>
            <div style={eyebrowStyle}>Controlled action</div>
            <h2 style={subheadingStyle}>Resolve {selected.exception_reference || "exception"}</h2>
            <div style={{ marginTop: "6px", color: "#627d98", fontSize: "13px" }}>
              Current status: <strong>{selected.status}</strong>
            </div>
          </div>

          <form onSubmit={handleResolve}>
            <label style={labelStyle} htmlFor="corrective-action">Corrective action</label>
            <textarea
              id="corrective-action"
              value={correctiveAction}
              onChange={(event) => setCorrectiveAction(event.target.value)}
              maxLength={4000}
              rows={5}
              disabled={submitting || !canManage}
              style={textareaStyle}
              placeholder="Describe the corrective action taken."
            />
            <div style={counterStyle}>{correctiveAction.length}/4000</div>

            <label style={labelStyle} htmlFor="exception-remarks">Remarks (optional)</label>
            <textarea
              id="exception-remarks"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              maxLength={4000}
              rows={4}
              disabled={submitting || !canManage}
              style={textareaStyle}
              placeholder="Add optional remarks."
            />
            <div style={counterStyle}>{remarks.length}/4000</div>

            {submitError ? <div style={errorCardStyle}>{submitError}</div> : null}

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button type="submit" disabled={submitting || !canManage} style={primaryButtonStyle}>
                {submitting ? "Resolving..." : "Resolve exception"}
              </button>
              <button type="button" onClick={closeResolution} disabled={submitting} style={secondaryButtonStyle}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e5e9f0",
  borderRadius: "12px",
  padding: "20px",
  boxShadow: "0 2px 8px rgba(16,42,67,0.04)",
};

const errorCardStyle = {
  ...cardStyle,
  border: "1px solid #fed7d7",
  background: "#fff5f5",
  color: "#b83232",
  fontSize: "13px",
  lineHeight: 1.6,
};

const successCardStyle = {
  ...cardStyle,
  marginBottom: "18px",
  border: "1px solid #c6f6d5",
  background: "#f0fff4",
  color: "#276749",
  fontSize: "13px",
};

const eyebrowStyle = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#627d98",
  marginBottom: "7px",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
};

const headingStyle = {
  margin: 0,
  fontSize: "28px",
  color: "#173b6c",
};

const subheadingStyle = {
  margin: 0,
  fontSize: "18px",
  color: "#173b6c",
};

const descriptionStyle = {
  margin: "8px 0 0",
  color: "#627d98",
  fontSize: "14px",
  lineHeight: 1.6,
};

const mutedStyle = {
  color: "#627d98",
  fontSize: "13px",
};

const badgeStyle = {
  padding: "5px 9px",
  borderRadius: "999px",
  background: "#f5f7fb",
  color: "#627d98",
  fontSize: "11px",
  fontWeight: "600",
};

const tableHeadStyle = {
  padding: "9px 8px",
  textAlign: "left",
  fontSize: "11px",
  color: "#627d98",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const tableCellStyle = {
  padding: "10px 8px",
  fontSize: "12px",
  color: "#627d98",
};

const tableCellStrongStyle = {
  ...tableCellStyle,
  fontWeight: "700",
  color: "#1f5f95",
};

const actionButtonStyle = {
  border: "1px solid #1f5f95",
  borderRadius: "7px",
  background: "#ffffff",
  color: "#1f5f95",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
};

const primaryButtonStyle = {
  border: "1px solid #1f5f95",
  borderRadius: "7px",
  background: "#1f5f95",
  color: "#ffffff",
  padding: "9px 14px",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
};

const secondaryButtonStyle = {
  border: "1px solid #bcccdc",
  borderRadius: "7px",
  background: "#ffffff",
  color: "#334e68",
  padding: "9px 14px",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
};

const labelStyle = {
  display: "block",
  margin: "14px 0 7px",
  fontSize: "12px",
  fontWeight: "600",
  color: "#334e68",
};

const textareaStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #bcccdc",
  borderRadius: "7px",
  padding: "10px 11px",
  fontSize: "13px",
  lineHeight: 1.5,
  color: "#334e68",
  resize: "vertical",
  fontFamily: "inherit",
};

const counterStyle = {
  marginTop: "4px",
  textAlign: "right",
  fontSize: "11px",
  color: "#829ab1",
};
