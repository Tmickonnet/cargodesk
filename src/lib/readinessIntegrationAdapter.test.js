import test from "node:test";
import assert from "node:assert/strict";

import { createReadinessIntegrationInput } from "./readinessIntegrationAdapter.js";

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
