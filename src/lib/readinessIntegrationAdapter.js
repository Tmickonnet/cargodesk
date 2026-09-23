/**
 * SEC-080H read-only readiness integration adapter.
 *
 * Converts already-authorized CargoDesk source records into the input
 * contract expected by the pure readiness interpreter.
 *
 * This adapter intentionally:
 * - performs no Supabase calls;
 * - performs no persistence or mutation;
 * - does not infer readiness from shipment status;
 * - does not invent required evidence policy;
 * - treats non-final document lifecycle states as unverified evidence;
 * - fails safely when document lifecycle cannot be determined.
 */

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const list = (value) => (Array.isArray(value) ? value : []);

const FINAL_DOCUMENT_STATUSES = new Set(["APPROVED", "ISSUED"]);

export const createReadinessIntegrationInput = ({
  shipment = null,
  shipmentLegs = [],
  documents = [],
  exceptions = [],
  applicability = null,
  rules = {},
} = {}) => {
  const applicabilityResult = isObject(applicability)
    ? applicability
    : { status: "UNKNOWN" };

  const evidence = list(documents).map((document) => {
    const statusCode = document?.document_status_code ?? document?.status ?? null;
    const hasStatusCode = typeof statusCode === "string" && statusCode.trim() !== "";

    return {
      id: document?.document_id ?? document?.id,
      status: hasStatusCode ? statusCode : "UNKNOWN",
      verified: hasStatusCode ? FINAL_DOCUMENT_STATUSES.has(statusCode) : null,
      sourceType: "DOCUMENT",
    };
  });

  const requiredEvidence = list(rules?.requiredEvidence).map((requirement) => ({
    id: requirement?.id,
    status: requirement?.status,
  }));

  const conflicts = list(rules?.conflicts);

  const normalizedExceptions = list(exceptions).map((exception) => ({
    id: exception?.shipment_exception_id ?? exception?.id,
    status: exception?.status ?? "UNKNOWN",
    indeterminate:
      exception?.status === "UNKNOWN" || exception?.status === "INDETERMINATE",
  }));

  return {
    shipment: isObject(shipment) ? { ...shipment } : null,
    shipmentLegs: list(shipmentLegs).map((leg) => ({ ...leg })),
    applicability: applicabilityResult,
    requiredEvidence,
    evidence,
    conflicts,
    exceptions: normalizedExceptions,
    rules: isObject(rules) ? { ...rules } : {},
  };
};

export default createReadinessIntegrationInput;
