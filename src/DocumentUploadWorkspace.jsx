import React, { useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";

const CONTEXTS = [
  { context: "PACKING_LIST", typeCode: "PACKING_LIST", label: "Packing List", permission: "DOCUMENT_CREATE" },
  { context: "COMMERCIAL_INVOICE", typeCode: "COMMERCIAL_INVOICE", label: "Commercial Invoice", permission: "DOCUMENT_CREATE" },
  { context: "FORM_NXP", typeCode: "NXP", label: "Form NXP", permission: "DOCUMENT_CREATE" },
  { context: "CCI", typeCode: "CCI", label: "CCI", permission: "DOCUMENT_CREATE" },
  { context: "BILL_OF_LADING", typeCode: "BILL_OF_LADING", label: "Bill of Lading", permission: "DOCUMENT_CREATE" },
  { context: "PHYTO", typeCode: "PHYTO", label: "Phytosanitary Certificate", permission: "DOCUMENT_CREATE" },
  { context: "CERTIFICATE_OF_ORIGIN", typeCode: "CERT_ORIGIN", label: "Certificate of Origin", permission: "DOCUMENT_CREATE" },
  { context: "BOOKING", typeCode: "BOOKING", label: "Booking", permission: "BOOKING_CREATE" },
  { context: "WEIGHBRIDGE", typeCode: "WEIGHBRIDGE", label: "Weighbridge Record", permission: "OPERATIONS_EDIT" },
  { context: "STUFFING", typeCode: "STUFFING", label: "Stuffing Record", permission: "OPERATIONS_EDIT" },
  { context: "VGM", typeCode: "VGM", label: "Verified Gross Mass", permission: "OPERATIONS_EDIT" },
  { context: "POD", typeCode: "PROOF_OF_DELIVERY", label: "Proof of Delivery", permission: "DELIVERY_CREATE" },
];

const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function DocumentUploadWorkspace({
  authorizationLoading,
  hasPermission,
  onCreated,
}) {
  const fileInputRef = useRef(null);
  const [context, setContext] = useState(CONTEXTS[0].context);
  const [businessRecordId, setBusinessRecordId] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadResult, setUploadResult] = useState(null);

  const selectedContext = useMemo(
    () => CONTEXTS.find((item) => item.context === context) ?? CONTEXTS[0],
    [context]
  );

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] ?? null;
    setError("");
    setMessage("");
    setUploadResult(null);

    if (!nextFile) {
      setFile(null);
      return;
    }

    if (!ACCEPTED_MIME_TYPES.has(nextFile.type)) {
      setFile(null);
      event.target.value = "";
      setError("Unsupported file type. CargoDesk accepts PDF, JPEG, PNG, and WebP files.");
      return;
    }

    if (nextFile.size < 1 || nextFile.size > MAX_FILE_SIZE) {
      setFile(null);
      event.target.value = "";
      setError("File size must be greater than 0 bytes and no more than 20 MB.");
      return;
    }

    setFile(nextFile);
    if (!documentTitle.trim()) {
      setDocumentTitle(nextFile.name.replace(/\.[^.]+$/, ""));
    }
  };

  const resetForm = () => {
    setBusinessRecordId("");
    setDocumentTitle("");
    setFile(null);
    setMessage("");
    setError("");
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setUploadResult(null);

    const recordId = Number(businessRecordId);
    if (!Number.isInteger(recordId) || recordId <= 0) {
      setError("Enter a valid positive business record ID.");
      return;
    }

    if (!documentTitle.trim() || documentTitle.trim().length > 255) {
      setError("Enter a document title between 1 and 255 characters.");
      return;
    }

    if (!file) {
      setError("Select a PDF, JPEG, PNG, or WebP file.");
      return;
    }

    if (!ACCEPTED_MIME_TYPES.has(file.type) || file.size < 1 || file.size > MAX_FILE_SIZE) {
      setError("The selected file does not meet CargoDesk's allowed file type or size limits.");
      return;
    }

    const permitted = await hasPermission(selectedContext.permission);
    if (!permitted) {
      setError(`Your current role does not have ${selectedContext.permission} for this document context.`);
      return;
    }

    setSubmitting(true);

    try {
      const { data, error: versionError } = await supabase.rpc("create_document_version", {
        p_business_context: selectedContext.context,
        p_business_record_id: recordId,
        p_document_type_code: selectedContext.typeCode,
        p_original_filename: file.name,
        p_declared_mime_type: file.type,
        p_file_size_bytes: file.size,
        p_document_title: documentTitle.trim(),
      });

      if (versionError) {
        throw new Error(versionError.message || "Unable to create the controlled document version.");
      }

      const versionResult = Array.isArray(data) ? data[0] : data;
      if (!versionResult?.allowed || !versionResult?.upload_pending || !versionResult?.file_path) {
        throw new Error(versionResult?.code || "CargoDesk did not return an authorized upload path.");
      }

      const { error: uploadError } = await supabase.storage
        .from(versionResult.bucket_id || "cargodesk-documents")
        .upload(versionResult.file_path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        setUploadResult({
          documentId: versionResult.document_id,
          filePath: versionResult.file_path,
          uploadPending: true,
        });
        throw new Error(
          `Document metadata was created as DRAFT, but the physical file upload failed: ${uploadError.message || "storage upload failed"}`
        );
      }

      const { data: signedData, error: verifyError } = await supabase.storage
        .from(versionResult.bucket_id || "cargodesk-documents")
        .createSignedUrl(versionResult.file_path, 300);

      if (verifyError || !signedData?.signedUrl) {
        setUploadResult({
          documentId: versionResult.document_id,
          filePath: versionResult.file_path,
          uploadPending: false,
          verificationFailed: true,
        });
        throw new Error(
          "The physical file was uploaded, but CargoDesk could not verify private Storage access."
        );
      }

      const result = {
        ...versionResult,
        physicalUpload: "VERIFIED",
        previewUrlAvailable: true,
      };

      setUploadResult(result);
      setMessage(
        `Document ${versionResult.document_id} version ${versionResult.version_number} was created and the physical Storage upload was verified.`
      );
      onCreated?.(result);
    } catch (submitError) {
      console.error("CargoDesk controlled document upload failed:", submitError);
      setError(submitError.message || "Unable to complete the controlled document upload.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      style={{
        marginTop: "18px",
        background: "#ffffff",
        border: "1px solid #e5e9f0",
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <div style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.7px" }}>
          Controlled Upload
        </div>
        <h2 style={{ margin: "6px 0 0", fontSize: "18px", color: "#173b6c" }}>
          Add document version and physical file
        </h2>
        <p style={{ margin: "6px 0 0", color: "#627d98", fontSize: "12px", lineHeight: 1.6 }}>
          Uses the existing authorization and document-version RPC, then uploads only to the server-generated private Storage path. Existing records are not overwritten.
        </p>
      </div>

      {message && (
        <div style={{ background: "#e6f4ea", border: "1px solid #b7dfc6", borderRadius: "8px", padding: "11px 13px", color: "#1f7a5a", fontSize: "12px", lineHeight: 1.6, marginBottom: "14px" }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "8px", padding: "11px 13px", color: "#b83232", fontSize: "12px", lineHeight: 1.6, marginBottom: "14px" }}>
          {error}
        </div>
      )}

      {uploadResult?.uploadPending && (
        <div style={{ background: "#fffaf0", border: "1px solid #f6d99a", borderRadius: "8px", padding: "11px 13px", color: "#8a5a00", fontSize: "12px", lineHeight: 1.6, marginBottom: "14px" }}>
          Document metadata exists as DRAFT, but the physical Storage upload is still pending/failed. Do not treat this document as physically available.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
          <label style={{ fontSize: "12px", color: "#334e68", fontWeight: "600" }}>
            Business context
            <select
              value={context}
              onChange={(event) => {
                setContext(event.target.value);
                setMessage("");
                setError("");
                setUploadResult(null);
              }}
              disabled={submitting || authorizationLoading}
              style={{ display: "block", width: "100%", marginTop: "6px", padding: "9px 10px", border: "1px solid #bcccdc", borderRadius: "7px", background: "#ffffff", color: "#172033", fontSize: "12px" }}
            >
              {CONTEXTS.map((item) => (
                <option key={item.context} value={item.context}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: "12px", color: "#334e68", fontWeight: "600" }}>
            Business record ID
            <input
              type="number"
              min="1"
              value={businessRecordId}
              onChange={(event) => setBusinessRecordId(event.target.value)}
              disabled={submitting || authorizationLoading}
              placeholder="e.g. 1"
              style={{ display: "block", width: "100%", marginTop: "6px", padding: "9px 10px", border: "1px solid #bcccdc", borderRadius: "7px", boxSizing: "border-box", fontSize: "12px" }}
            />
          </label>

          <label style={{ fontSize: "12px", color: "#334e68", fontWeight: "600" }}>
            Document title
            <input
              type="text"
              maxLength={255}
              value={documentTitle}
              onChange={(event) => setDocumentTitle(event.target.value)}
              disabled={submitting || authorizationLoading}
              placeholder="Document title"
              style={{ display: "block", width: "100%", marginTop: "6px", padding: "9px 10px", border: "1px solid #bcccdc", borderRadius: "7px", boxSizing: "border-box", fontSize: "12px" }}
            />
          </label>

          <label style={{ fontSize: "12px", color: "#334e68", fontWeight: "600" }}>
            Physical file
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={submitting || authorizationLoading}
              style={{ display: "block", width: "100%", marginTop: "6px", fontSize: "12px" }}
            />
          </label>
        </div>

        <div style={{ marginTop: "10px", fontSize: "11px", color: "#627d98" }}>
          {file ? `${file.name} · ${file.type || "unknown type"} · ${formatBytes(file.size)}` : "Allowed: PDF, JPEG, PNG, WebP · maximum 20 MB."}
        </div>

        <div style={{ marginTop: "16px", display: "flex", gap: "9px", alignItems: "center" }}>
          <button
            type="submit"
            disabled={submitting || authorizationLoading}
            style={{ border: "none", borderRadius: "7px", padding: "10px 14px", background: submitting ? "#9fb3c8" : "#173b6c", color: "#ffffff", fontSize: "12px", fontWeight: "700", cursor: submitting ? "not-allowed" : "pointer" }}
          >
            {submitting ? "Creating and uploading..." : "Create & Upload"}
          </button>
          <button
            type="button"
            onClick={resetForm}
            disabled={submitting}
            style={{ border: "1px solid #bcccdc", borderRadius: "7px", padding: "9px 13px", background: "#ffffff", color: "#334e68", fontSize: "12px", fontWeight: "600", cursor: submitting ? "not-allowed" : "pointer" }}
          >
            Clear
          </button>
          <span style={{ fontSize: "11px", color: "#627d98" }}>
            Required permission: {selectedContext.permission}
          </span>
        </div>
      </form>
    </section>
  );
}
