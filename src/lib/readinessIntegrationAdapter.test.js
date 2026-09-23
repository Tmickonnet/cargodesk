import test from "node:test";
import assert from "node:assert/strict";

import { createReadinessIntegrationInput } from "./readinessIntegrationAdapter.js";
import { interpretReadiness, READINESS_OUTCOMES } from "./readinessInterpreter.js";

test("R2: applicability is never inferred from shipment status", () => {
  const result = createReadinessIntegrationInput({
    shipment: { shipment_status_code: "DELIVERED" },
    rules: { approved: true, requiredEvidence: [] },
  });

  assert.equal(result.applicability.status, "UNKNOWN");
});

test("R6: non-final document lifecycle state is not treated as verified", () => {
  const result = createReadinessIntegrationInput({
    documents: [
      { document_id: 1, document_status_code: "DRAFT" },
      { document_id: 2, document_status_code: "UNDER_REVIEW" },
      { document_id: 3, document_status_code: "ISSUED" },
    ],
  });

  assert.equal(result.evidence[0].verified, false);
  assert.equal(result.evidence[1].verified, false);
  assert.equal(result.evidence[2].verified, true);
});

test("R6: unavailable document lifecycle status remains indeterminate", () => {
  const result = createReadinessIntegrationInput({
    documents: [{ document_id: 4, document_status_id: 1 }],
  });

  assert.equal(result.evidence[0].status, "UNKNOWN");
  assert.equal(result.evidence[0].verified, null);
});

test("shipment_documents shape maps a shipment-linked document without inventing shipment_id on documents", () => {
  const result = createReadinessIntegrationInput({
    shipment: { shipment_id: 1, shipment_number: "CDG-SHP-2026-0001" },
    documents: [{ document_id: 12, document_status_id: 1 }],
    rules: { approved: true, requiredEvidence: [{ id: 12 }] },
  });

  assert.equal(result.shipment.shipment_id, 1);
  assert.deepEqual(result.evidence[0], {
    id: 12,
    status: "UNKNOWN",
    verified: null,
    sourceType: "DOCUMENT",
  });
  assert.equal("shipment_id" in result.evidence[0], false);
});

test("unresolved lifecycle status propagates to REVIEW_REQUIRED when required", () => {
  const input = createReadinessIntegrationInput({
    shipment: { shipment_id: 1 },
    documents: [{ document_id: 12, document_status_id: 1 }],
    applicability: { status: "APPLICABLE" },
    rules: { approved: true, requiredEvidence: [{ id: 12 }] },
  });

  const result = interpretReadiness(input);

  assert.deepEqual(result, {
    outcome: READINESS_OUTCOMES.REVIEW_REQUIRED,
    reason: "EVIDENCE_VERIFICATION_INDETERMINATE",
    evidenceId: 12,
  });
});

test("R1: required evidence is supplied only by the approved rule input", () => {
  const result = createReadinessIntegrationInput({
    documents: [{ document_id: 1, document_status_code: "ISSUED" }],
    rules: {
      approved: true,
      requiredEvidence: [{ id: 1 }],
    },
  });

  assert.deepEqual(result.requiredEvidence, [{ id: 1, status: undefined }]);
});

test("R4: exception state is normalized without changing source meaning", () => {
  const result = createReadinessIntegrationInput({
    exceptions: [{ shipment_exception_id: 7, status: "RESOLVED" }],
  });

  assert.deepEqual(result.exceptions, [
    { id: 7, status: "RESOLVED", indeterminate: false },
  ]);
});

test("protected POD is not created by the adapter", () => {
  const result = createReadinessIntegrationInput({
    rules: { approved: true, requiredEvidence: [] },
  });

  assert.equal("protectedEvidence" in result, false);
});
