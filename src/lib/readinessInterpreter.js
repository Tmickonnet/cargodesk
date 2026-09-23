/**
 * SEC-080H read-only readiness interpreter.
 *
 * This module intentionally contains no Supabase calls and no persistence.
 * The caller supplies already-authorized source data and only approved rules.
 *
 * First implementation scope:
 * - NOT_APPLICABLE
 * - NOT_READY
 * - READY_FOR_REVIEW
 * - REVIEW_REQUIRED
 *
 * AUTHORIZED is intentionally excluded by owner decision.
 */

export const READINESS_OUTCOMES = Object.freeze({
  NOT_APPLICABLE: "NOT_APPLICABLE",
  NOT_READY: "NOT_READY",
  READY_FOR_REVIEW: "READY_FOR_REVIEW",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
});

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeList = (value) => (Array.isArray(value) ? value : []);

const hasIndeterminateCondition = (conditions) =>
  normalizeList(conditions).some(
    (condition) =>
      isObject(condition) &&
      (condition.status === "UNKNOWN" ||
        condition.status === "INDETERMINATE" ||
        condition.indeterminate === true)
  );

/**
 * Interpret readiness from caller-supplied, already-authorized evidence.
 *
 * The interpreter does not decide whether a document/evidence item is
 * required. That policy must be supplied by the approved rule set.
 */
export const interpretReadiness = (input = {}) => {
  if (!isObject(input)) {
    return {
      outcome: READINESS_OUTCOMES.REVIEW_REQUIRED,
      reason: "INVALID_INPUT",
    };
  }

  const {
    applicability = { status: "UNKNOWN" },
    requiredEvidence = [],
    evidence = [],
    conflicts = [],
    exceptions = [],
    rules = {},
    protectedEvidence = [],
  } = input;

  if (applicability?.status === "NOT_APPLICABLE") {
    return {
      outcome: READINESS_OUTCOMES.NOT_APPLICABLE,
      reason: "APPLICABILITY_ESTABLISHED",
    };
  }

  if (
    !isObject(applicability) ||
    !["APPLICABLE", "NOT_APPLICABLE"].includes(applicability.status)
  ) {
    return {
      outcome: READINESS_OUTCOMES.REVIEW_REQUIRED,
      reason: "APPLICABILITY_INDETERMINATE",
    };
  }

  if (!isObject(rules)) {
    return {
      outcome: READINESS_OUTCOMES.REVIEW_REQUIRED,
      reason: "RULE_SET_INDETERMINATE",
    };
  }

  if (hasIndeterminateCondition(conflicts)) {
    return {
      outcome: READINESS_OUTCOMES.REVIEW_REQUIRED,
      reason: "CONFLICT_INDETERMINATE",
    };
  }

  if (normalizeList(conflicts).some((conflict) => conflict?.status === "OPEN")) {
    if (rules.conflictPolicy !== "RESOLVED_BY_APPROVED_RULE") {
      return {
        outcome: READINESS_OUTCOMES.REVIEW_REQUIRED,
        reason: "CONFLICT_REQUIRES_REVIEW",
      };
    }
  }

  if (hasIndeterminateCondition(exceptions)) {
    return {
      outcome: READINESS_OUTCOMES.REVIEW_REQUIRED,
      reason: "EXCEPTION_IMPACT_INDETERMINATE",
    };
  }

  if (
    normalizeList(exceptions).some(
      (exception) =>
        exception?.status !== "RESOLVED" &&
        exception?.status !== "CLOSED" &&
        exception?.status !== "NOT_APPLICABLE"
    )
  ) {
    if (rules.exceptionPolicy !== "NON_BLOCKING_APPROVED") {
      return {
        outcome: READINESS_OUTCOMES.REVIEW_REQUIRED,
        reason: "EXCEPTION_REQUIRES_REVIEW",
      };
    }
  }

  const required = normalizeList(requiredEvidence);

  if (hasIndeterminateCondition(required)) {
    return {
      outcome: READINESS_OUTCOMES.REVIEW_REQUIRED,
      reason: "REQUIRED_EVIDENCE_RULE_INDETERMINATE",
    };
  }

  const protectedRequiredIds = new Set(
    normalizeList(protectedEvidence)
      .filter((item) => item?.required === true)
      .map((item) => item.id)
      .filter(Boolean)
  );

  const evidenceById = new Map(
    normalizeList(evidence)
      .filter((item) => item?.id)
      .map((item) => [item.id, item])
  );

  for (const requirement of required) {
    if (!requirement?.id) {
      return {
        outcome: READINESS_OUTCOMES.REVIEW_REQUIRED,
        reason: "REQUIRED_EVIDENCE_IDENTIFIER_INDETERMINATE",
      };
    }

    if (protectedRequiredIds.has(requirement.id)) {
      return {
        outcome: READINESS_OUTCOMES.REVIEW_REQUIRED,
        reason: "PROTECTED_REQUIRED_EVIDENCE_UNAVAILABLE",
      };
    }

    const item = evidenceById.get(requirement.id);

    if (!item) {
      if (requirement.status === "WAIVED") {
        if (rules.waiverPolicy !== "APPROVED") {
          return {
            outcome: READINESS_OUTCOMES.REVIEW_REQUIRED,
            reason: "WAIVER_POLICY_UNDEFINED",
          };
        }
        continue;
      }

      return {
        outcome: READINESS_OUTCOMES.NOT_READY,
        reason: "REQUIRED_EVIDENCE_MISSING",
        evidenceId: requirement.id,
      };
    }

    if (
      item.status === "UNKNOWN" ||
      item.status === "INDETERMINATE" ||
      item.verified === null ||
      item.verified === undefined
    ) {
      return {
        outcome: READINESS_OUTCOMES.REVIEW_REQUIRED,
        reason: "EVIDENCE_VERIFICATION_INDETERMINATE",
        evidenceId: requirement.id,
      };
    }

    if (item.verified !== true) {
      return {
        outcome: READINESS_OUTCOMES.NOT_READY,
        reason: "REQUIRED_EVIDENCE_NOT_VERIFIED",
        evidenceId: requirement.id,
      };
    }
  }

  return {
    outcome: READINESS_OUTCOMES.READY_FOR_REVIEW,
    reason: "APPROVED_RULES_SATISFIED",
  };
};

export default interpretReadiness;
