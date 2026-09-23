# SEC-080H — Readiness & Evidence Interpretation Contract

Status: IMPLEMENTED as a documentation-only control contract on `sec-080h-readiness-contract`.

## Purpose

Define the minimum interpretation rules CargoDesk must establish before readiness evaluation or automated readiness/state promotion is implemented.

This document does **not** create database objects, change RLS/RBAC, alter production data, or authorize deployment.

## Verified architectural basis

- CargoDesk's established logistics database foundation remains the authoritative data structure.
- Existing authentication, RBAC, permissions, RLS, document lifecycle, audit, exception, shipment, milestone, tracking, delivery, and evidence structures are reused.
- The main branch remains the protected implementation baseline.
- `main` is currently at `17ed7418caecf95c9b8579465ff7c81ac5155d66` (SEC-044 controlled document expire/cancel authorization).
- Existing exception record `EXC-CDG-2026-0001` is a resolved documentation discrepancy; its existence does not establish a general readiness rule.
- The SEC-080G timeline conflict remains `REVIEW_REQUIRED`; it must not be silently corrected or treated as resolved.
- SEC-182 remains a candidate-only controlled exception-creation workflow and is not approved for production execution or readiness integration.
- The read-only Shipments GUI work remains isolated from `main`; its live browser/authentication/runtime verification was previously blocked by the Vercel 403 condition.

## Core interpretation rule

CargoDesk must distinguish:

1. recorded operational state;
2. operational observation/event;
3. supporting evidence;
4. verified evidence;
5. detected conflict;
6. exception and its impact;
7. authorized human decision.

These categories must not be collapsed into a single automated status.

## Rule 1 — Applicability

A requirement or evidence item is applicable only when an explicit business/process condition makes it relevant to the subject being evaluated.

Applicability may be:

- REQUIRED;
- NOT_APPLICABLE;
- CONDITIONAL;
- REVIEW_REQUIRED.

Absence of an applicable requirement must not be treated as a failure.

A table relationship alone does not establish applicability.

## Rule 2 — Dependencies

A downstream state must not be inferred solely from the existence of a downstream record.

Dependencies must identify the minimum preceding conditions that materially support the state.

Example:

`recorded event -> milestone -> evidence -> verification -> authorized decision`

This is a conceptual dependency chain, not a database implementation requirement.

Milestone completion does not itself constitute authorization.

## Rule 3 — Evidence precedence

Where multiple sources describe the same operational fact, CargoDesk must identify their evidentiary role before resolving the conflict.

At minimum distinguish:

- system-recorded state;
- operational event;
- documentary evidence;
- verified documentary evidence;
- authorized human decision.

Where no approved precedence rule exists, the result is:

`REVIEW_REQUIRED`

CargoDesk must not invent precedence from timestamp order, table order, UI order, or whichever record was written last.

## Rule 4 — Evidence verification

Evidence verification answers whether the evidence itself has passed the applicable verification process.

It does **not** automatically prove that the shipment or milestone is ready.

Therefore:

`DOCUMENT_VERIFIED != READINESS_CONFIRMED`

and:

`EVIDENCE_PRESENT != EVIDENCE_APPLICABLE`

## Rule 5 — Conflict handling

Conflicting records must be preserved.

Conflict handling must:

1. retain the underlying records/evidence;
2. identify the conflict;
3. classify its operational significance;
4. determine whether an existing approved rule resolves it;
5. otherwise return `REVIEW_REQUIRED`;
6. record any authorized resolution separately.

The system must not silently rewrite historical evidence merely to make records consistent.

## Rule 6 — Exception impact

An exception is not automatically:

- a blocker; or
- ignorable.

Its impact must be explicitly classified according to an approved governance rule.

Until such a rule exists, the safe interpretation is:

`UNKNOWN_IMPACT -> REVIEW_REQUIRED`

A resolved exception is not automatically evidence that the same exception class is harmless in every shipment.

## Rule 7 — Human authorization

Tracking, evidence verification, milestone completion, and exception resolution are not interchangeable with authorization.

Where a business state requires authorized human confirmation, the system must retain:

- the authenticated CargoDesk user;
- the authorized action/decision;
- the relevant subject;
- the decision timestamp;
- the supporting basis;
- the audit record.

Automated evaluation may recommend or flag a state, but it must not silently manufacture human authorization.

## Rule 8 — Test shipment protection

The deliberate inconsistencies in `CDG-SHP-2026-0001` remain test evidence.

They must not be changed merely to make the readiness contract pass.

The test shipment is useful precisely because it exercises:

- contradictory operational state;
- document/evidence differences;
- milestone sequencing;
- exception handling;
- delivery/POD distinction;
- unresolved timeline interpretation.

## Rule 9 — Timeline discrepancy

The previously identified timeline discrepancy remains `REVIEW_REQUIRED` until its interpretation is explicitly established.

No historical record should be rewritten as part of SEC-080H.

The immediate objective is to determine how the readiness contract should classify such a discrepancy, not to perform historical cleanup.

## Rule 10 — Fail-safe outcome

If any material readiness condition cannot be determined from an approved rule and available evidence, the evaluation must not silently return READY.

The safe contract outcome is:

`REVIEW_REQUIRED`

This prevents incomplete governance from becoming false operational certainty.

## Minimum readiness vocabulary

The following conceptual outcomes are sufficient for the first controlled phase:

- NOT_APPLICABLE
- NOT_READY
- READY_FOR_REVIEW
- REVIEW_REQUIRED
- AUTHORIZED

These are conceptual outcomes only. No database enum, lookup table, column, trigger, or application implementation is authorized by this document.

## Safety boundary

SEC-080H does **not** authorize:

- new readiness tables;
- readiness triggers;
- readiness functions;
- automatic shipment-status promotion;
- automatic milestone promotion;
- new permissions;
- RLS/RBAC changes;
- production migration;
- production data correction;
- external integrations;
- AI-based operational decisions;
- merge of SEC-182;
- merge of SEC-151G/SEC-151Q;
- production deployment.

## Acceptance criteria for SEC-080H

SEC-080H can be considered verified only when all of the following are demonstrably true:

- applicability has an explicit interpretation rule;
- dependencies have an explicit interpretation rule;
- evidence roles are distinguished;
- evidence precedence is not invented when absent;
- conflicts remain preserved;
- unresolved conflicts produce `REVIEW_REQUIRED`;
- exception impact is not assumed;
- human authorization is distinct from tracking and verification;
- the test shipment inconsistencies remain preserved;
- the known timeline discrepancy remains appropriately classified;
- no database or production change is required merely to adopt this contract.

## Next gate

After this contract is reviewed against the existing schema and test evidence, the next decision is **not automatically implementation**.

The next gate is:

`SEC-080H VERIFIED -> determine whether any existing application/service/database mechanism can express the contract safely -> implement only the minimum missing mechanism`

If the existing application layer can satisfy a rule without schema change, prefer that over structural database expansion.
