import test from "node:test";
import assert from "node:assert/strict";

import {
  interpretReadiness,
  READINESS_OUTCOMES,
} from "./readinessInterpreter.js";

const applicable = { status: "APPLICABLE" };
const verifiedEvidence = [{ id: "DOC-1", verified: true }];

const base = {
  applicability: applicable,
  requiredEvidence: [{ id: "DOC-1" }],
  evidence: verifiedEvidence,
  conflicts: [],
  exceptions: [],
  rules: { approved: true },
};

test("S01: complete evidence returns READY_FOR_REVIEW", () => {
  assert.equal(
    interpretReadiness(base).outcome,
    READINESS_OUTCOMES.READY_FOR_REVIEW
  );
});

test("S02: unresolved conflict returns REVIEW_REQUIRED", () => {
  const result = interpretReadiness({
    ...base,
    conflicts: [{ id: "C-1", status: "OPEN" }],
  });

  assert.equal(result.outcome, READINESS_OUTCOMED.REVIEW_REQUIRED);
});

test("S03: draft/unsupported evidence does not promote readiness", () => {
  const result = interpretReadiness({
    ...base,
    evidence: [{ id: "DOC-1", status: "DRAFT", verified: false }],
  });

  assert.equal(result.outcome, READINESS_OUTCOMES.NOT_READY);
});

test("S04: indeterminate exception impact returns REVIEW_REQUIRED", () => {
  const result = interpretReadiness({
    ...base,
    exceptions: [{ id: "EX-1", status: "UNKNOWN", indeterminate: true }],
  });

  assert.equal(result.outcome, READINESS_OUTCOMES.REVIEW_REQUIRED);
});

test("S05: resolved exception does not independently block readiness", () => {
  const result = interpretReadiness({
    ...base,
    exceptions: [{ id: "EX-1", status: "RESOLVED" }],
  });

  assert.equal(result.outcome, READINESS_OUTCOMES.READY_FOR_REVIEW);
});

test("S06: missing required evidence returns NOT_READY", () => {
  const result = interpretReadiness({
    ...base,
    evidence: [],
  });

  assert.equal(result.outcome, READINESS_OUTCOMES.NOT_READY);
});

test("S07: unknown applicability returns REVIEW_REQUIRED", () => {
  const result = interpretReadiness({
    ...base,
    applicability: { status: "UNKNOWN" },
  });

  assert.equal(result.outcome, READINESS_OUTCOMES.REVIEW_REQUIRED);
});

test("S08: first implementation never returns AUTHORIZED", () => {
  const result = interpretReadiness({
    ...base,
    humanAuthorization: { approved: true },
  });

  assert.equal(result.outcome, READINESS_OUTCOMES.READY_FOR_REVIEW);
  assert.notEqual(result.outcome, "AUTHORIZED");
});

test("protected required evidence is fail-safe", () => {
  const result = interpretReadiness({
    ...base,
    protectedEvidence: [{ id: "DOC-1", required: true }],
  });

  assert.equal(result.outcome, READINESS_OUTCOMES.REVIEW_REQUIRED);
});

test("invalid input is fail-safe", () => {
  const result = interpretReadiness(null);

  assert.equal(result.outcome, READINESS_OUTCOMES.REVIEW_REQUIRED);
});

test("missing approved rule set is fail-safe", () => {
  const result = interpretReadiness({
    ...base,
    rules: {},
  });

  assert.equal(result.outcome, READINESS_OUTCOMES.REVIEW_REQUIRED);
});
