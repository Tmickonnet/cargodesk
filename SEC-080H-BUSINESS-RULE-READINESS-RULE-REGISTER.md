# SEC-080H — Business Rule / Readiness Rule Register

Status: DOCUMENTATION-ONLY / RULE-DEPENDENCY GATE

## Purpose

This register identifies the minimum deterministic business/readiness rules needed to interpret scenarios S01–S08 without inventing operational policy.

It separates:
- rules already established by the SEC-080H interpretation contract;
- candidate rules that may be needed but require owner approval;
- genuinely undefined domain policy.

This register authorizes no implementation, schema change, migration, status promotion, authorization persistence, or deployment.

## Rule status vocabulary

- **ESTABLISHED BY SEC-080H CONTRACT** — interpretation/safety rule already established by the current SEC-080H documentation set.
- **PROPOSED — APPROVAL REQUIRED** — candidate operational rule recorded for review; not an approved business rule.
- **UNDEFINED — APPROVAL REQUIRED** — the project evidence does not currently establish the rule.

## Register

| Rule ID | Scenario(s) | Requirement / applicability question | Required evidence | Verification condition | Conflict handling | Exception handling | Human authorization | Expected outcome | Current evidence/status | Implementation impact | Approval needed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| RR-001 | S01, S07 | Is the readiness requirement applicable to this shipment/operational circumstance? | Existing shipment, mode/leg, document/evidence context plus approved applicability rule | Applicability must be explicitly determinable | Unknown applicability → REVIEW_REQUIRED | Do not use exception resolution to infer applicability | No automatic authorization | Known applicable/not-applicable state | Safety rule established; domain applicability criteria undefined | Read-time rule evaluation only | Owner approval of concrete applicability criteria |
| RR-002 | S01, S06 | What evidence is mandatory when a requirement is applicable? | Existing document/evidence records and their lifecycle/verification state | Required evidence must satisfy the approved evidence condition | Missing or conflicting evidence is not silently accepted | Only an explicitly approved exception may alter a requirement | Authorization remains separate | Missing applicable required evidence → NOT_READY | Interpretation established; concrete required-evidence catalogue undefined | Read-only evidence evaluation | Owner approval of required-evidence catalogue |
| RR-003 | S01, S03 | Does a document's lifecycle status satisfy a readiness requirement? | Document status/version plus supporting evidence | Document must satisfy the approved lifecycle requirement | DRAFT must not be silently treated as ISSUED/APPROVED | Supporting evidence does not itself promote document lifecycle | Human authorization remains separate | DRAFT + verified support → REVIEW_REQUIRED unless an approved rule independently establishes readiness | Contract establishes lifecycle/evidence separation; requirement-specific status mapping undefined | Read-time evaluation; no lifecycle mutation | Owner approval of requirement-specific document status rules |
| RR-004 | S02 | Which operational/documentary conflicts are material? | Relevant shipment, leg, milestone, document, evidence and exception records | Conflict classification follows approved conflict definition | No approved precedence → REVIEW_REQUIRED | Exception state cannot silently resolve a conflict | Human reviewer may be required | Material unresolved conflict → REVIEW_REQUIRED | Conflict fail-safe established; material-conflict catalogue undefined | Read-time conflict classification | Owner approval of material-conflict definitions |
| RR-005 | S02 | Is there an approved precedence rule for conflicting authoritative evidence? | Conflicting authoritative records/evidence | Only an explicitly approved precedence rule may resolve conflict | Without precedence → REVIEW_REQUIRED; preserve underlying records | Exceptions do not create precedence | Human authorization may be required where rule specifies | Determined by approved precedence; otherwise REVIEW_REQUIRED | No general precedence rule verified | Read-time comparison only | Owner approval of precedence rules |
| RR-006 | S04, S05 | What exception types/severities/statuses block readiness? | shipment_exception and related evidence/history | Impact must be explicitly classified | Unknown impact → REVIEW_REQUIRED | RESOLVED does not by itself mean readiness | Human review/authorization if required | Unresolved unknown-impact exception → REVIEW_REQUIRED; resolved exception requires continued evaluation | Fail-safe and resolved-exception interpretation established; blocking taxonomy undefined | Read-only exception evaluation | Owner approval of exception impact taxonomy |
| RR-007 | S05 | Does resolving an exception restore readiness automatically? | Exception status/history plus remaining requirements | All other applicable requirements must still pass | Historical resolution is preserved | Resolution alone never rewrites history or establishes readiness | Separate authorization remains applicable | Continue evaluation; no automatic READY | ESTABLISHED BY SEC-080H CONTRACT | No structural change | No additional approval for interpretation principle |
| RR-008 | S06, S07 | When may missing evidence be treated as not applicable? | Applicability evidence plus approved exception/waiver rule if any | A specific approved rule must establish non-applicability | Uncertain applicability → REVIEW_REQUIRED | Only approved exception/waiver can alter requirement | Human authorization where mandated | Unknown applicability is never silently NOT_APPLICABLE | Safety rule established; waiver/non-applicability policy undefined | Read-time evaluation | Owner approval of waiver/non-applicability rules |
| RR-009 | S01, S08 | What conditions distinguish READY_FOR_REVIEW from AUTHORIZED? | Complete readiness interpretation plus human authorization evidence | All mandatory readiness conditions pass and required authorization is explicitly recorded | Any unresolved material condition prevents authorization | Exceptions must satisfy their approved impact rule | Explicit human authorization required where mandated | READY_FOR_REVIEW before gate; AUTHORIZED only after required authorization | Separation established; durable authorization evidence capability remains unresolved | Read-only interpretation first; persistence separately designed | Owner approval of authorization points and recording mechanism |
| RR-010 | S08 | What constitutes durable human authorization evidence? | Authenticated user, decision/action, subject, timestamp, basis and audit evidence | Evidence must be attributable and reviewable | Missing durable record → cannot claim durable AUTHORIZED state | Existing audit capability must be verified before relying on it | Mandatory at defined authorization gate | AUTHORIZED only when required authorization evidence exists | Contract requires separation; current durable-record capability not yet verified | No new audit structure justified yet | Owner approval after audit-write capability verification |
| RR-011 | S01–S08 | May readiness interpretation mutate operational state? | None; interpretation consumes existing state | Interpretation must be side-effect free | Conflicts are reported/classified, not rewritten | Exceptions/statuses remain historical truth | Authorization is separate from interpretation | No automatic shipment/document/milestone/exception promotion | ESTABLISHED BY SEC-080H CONTRACT | Read-only implementation boundary | No additional approval for safety boundary |
| RR-012 | S01–S08 | What happens when a material readiness condition cannot be determined safely? | Available records/evidence and rule applicability | Condition remains indeterminate | Fail safe to REVIEW_REQUIRED | Do not infer from unrelated status/evidence | Human review/authorization may resolve if policy permits | REVIEW_REQUIRED | ESTABLISHED BY SEC-080H CONTRACT | Deterministic fallback only | No additional approval for safety boundary |

## Domain-policy gaps requiring explicit owner decision

The current evidence does **not** establish, and this register therefore does not invent:

1. A complete required-document/evidence catalogue by shipment mode, movement type, cargo type, milestone, or operational circumstance.
2. Exact applicability criteria for each readiness requirement.
3. A universal precedence hierarchy among conflicting operational, documentary, and verification records.
4. A complete taxonomy defining which exception types/severities/statuses are blocking, non-blocking, or review-only.
5. Exact waiver/non-applicability rules for missing evidence.
6. The precise points at which human authorization is mandatory.
7. The durable storage/audit mechanism for a readiness authorization decision.

These are **approval dependencies**, not implementation defects.

## Scenario coverage

### S01 — Normal evidence-supported completion
Interpretation contract supports READY_FOR_REVIEW, with AUTHORIZED only after required human authorization. Concrete evidence requirements remain approval-dependent.

### S02 — Conflicting operational state
REVIEW_REQUIRED unless an explicitly approved precedence rule resolves the conflict. Underlying records remain unchanged.

### S03 — Draft document + verified supporting evidence
Supporting verification does not promote the document. REVIEW_REQUIRED unless an approved independent rule establishes readiness.

### S04 — Unresolved exception
Unknown or unclassified exception impact results in REVIEW_REQUIRED. No exception status change.

### S05 — Resolved exception
Resolution is historical context, not automatic readiness. Continue evaluating all remaining requirements.

### S06 — Missing required evidence
If applicability and requirement are established, missing required evidence results in NOT_READY unless an approved exception/waiver rule applies.

### S07 — Unknown applicability
Unknown applicability results in REVIEW_REQUIRED. No silent NOT_APPLICABLE classification.

### S08 — Explicit human authorization
AUTHORIZATION is distinct from permission to access the application. Durable authorization evidence remains a separate unresolved design dependency until the existing audit-write capability is verified.

## Change-control boundary

This register does not authorize:
- database tables, columns, enums, functions, triggers, or migrations;
- new permissions, RLS, RBAC, or SECURITY DEFINER changes;
- shipment/document/milestone/exception status promotion;
- audit-schema creation or modification;
- correction of CDG-SHP-2026-0001;
- production deployment;
- external integrations;
- AI-based authorization or policy inference.

## Current decision

SEC-080H has now exposed the smallest remaining policy dependencies without converting assumptions into business rules.

Status:

RECONCILED → IMPLEMENTATION BOUNDARY IDENTIFIED → RULE DEPENDENCY IDENTIFIED → POLICY GAPS REGISTERED

Not yet:

APPROVED → IMPLEMENTED → VERIFIED

## Next safe gate

The next gate is **owner review/approval of the concrete domain rules identified above**. Only after the necessary rules are approved should a separate implementation decision determine whether the existing read-only application architecture can express them without structural change.

The existing authorization boundary, document lifecycle, RLS/RBAC, audit structure, and test shipment remain protected.
