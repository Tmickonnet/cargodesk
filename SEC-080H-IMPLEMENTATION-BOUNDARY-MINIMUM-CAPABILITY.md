# SEC-080H — Implementation Boundary & Minimum Capability Specification

Status: DOCUMENTATION-ONLY / PROPOSED CAPABILITY BOUNDARY

## Purpose

Define the smallest future capability required to interpret readiness safely from existing CargoDesk records, evidence, verification, exceptions, conflicts, and human authorization.

This document does not authorize implementation. It is a boundary specification for a later approved implementation decision.

## Current reconciled state

The current CargoDesk application already provides an authorization boundary:

Authenticated session → authorization hook → authorization adapter → Supabase authorization functions.

The application delegates role/permission decisions to the existing Supabase security functions and fails closed when authorization cannot be established.

The current application does not contain a readiness interpretation layer.

The database already contains operational, documentary, exception, delivery, shipment-leg, proof-of-delivery, user/role, and audit structures. Their existence and foreign-key relationships do not by themselves establish the business rules required to determine readiness.

## Minimum capability required

A future readiness capability must be able to:

1. Identify the specific readiness subject being evaluated.
2. Determine which requirements are applicable under an approved rule set.
3. Read relevant operational state without rewriting it.
4. Identify relevant documentary evidence and distinguish document lifecycle state from evidence verification state.
5. Detect material conflicts between relevant records/evidence.
6. Identify relevant exceptions and distinguish unresolved from resolved historical exceptions.
7. Determine whether required evidence is present.
8. Distinguish evidence verification from human authorization.
9. Return a fail-safe interpretation when a material condition is unknown or cannot be resolved by an approved rule.
10. Preserve the underlying historical records and evidence.
11. Record or reference the authorized human decision separately from system interpretation when authorization is required.
12. Provide enough explanation/context for a reviewer to understand why the outcome was reached.

## Required conceptual inputs

The future capability should consume existing authoritative data where possible:

- shipment and shipment-leg state;
- relevant milestone/event state;
- document and document-version lifecycle state;
- proof-of-delivery and supporting-document verification state;
- shipment exceptions and their status;
- authenticated user identity, role, and existing permissions;
- approved applicability and dependency rules;
- human authorization evidence where applicable.

No new source of truth should be introduced merely to duplicate existing operational state.

## Required conceptual outputs

The future capability should expose a bounded interpretation, using the vocabulary already defined by SEC-080H:

- NOT_APPLICABLE
- NOT_READY
- READY_FOR_REVIEW
- REVIEW_REQUIRED
- AUTHORIZED

An output must not imply a stronger state than the evidence and authorization boundary support.

In particular:

- VERIFIED evidence must not automatically mean READY.
- RESOLVED exception must not automatically mean READY.
- DELIVERED shipment status must not automatically mean READY.
- DRAFT document must not be promoted by interpretation alone.
- Unknown applicability or material unknown conditions must fail safely to REVIEW_REQUIRED.
- AUTHORIZED requires the required human authorization context; a UI action alone is not sufficient evidence.

## Separation of responsibilities

### Existing authorization layer

Remains responsible for:

- authentication/session context;
- role resolution;
- permission checks;
- fail-closed access decisions.

### Future readiness interpretation layer

Would be responsible for:

- applicability interpretation;
- dependency interpretation;
- evidence/state reconciliation;
- conflict classification;
- exception interpretation;
- readiness outcome calculation;
- reviewer-facing explanation/context.

### Human authorization boundary

Remains responsible for:

- deliberate confirmation where policy requires human authorization;
- authenticated actor identity;
- permitted scope;
- decision timestamp;
- decision subject;
- decision basis/context;
- durable audit evidence when the existing approved audit mechanism supports it.

The readiness layer must not silently replace the existing authorization layer or create a parallel RBAC system.

## Minimum decision model

The future capability should follow this conceptual sequence:

1. Identify subject.
2. Resolve applicability using approved rules.
3. Gather relevant existing state/evidence.
4. Evaluate required evidence.
5. Evaluate verification state.
6. Evaluate conflicts.
7. Evaluate exception state and impact.
8. Determine whether material conditions remain unknown.
9. Produce the bounded readiness interpretation.
10. If required, present a human authorization gate.
11. Record the authorized decision through an approved mechanism.

This is a logical boundary, not an instruction to implement these steps as a database function, trigger, table, or frontend workflow.

## Explicit non-requirements at this milestone

The minimum capability specification does NOT justify:

- a new readiness table;
- a readiness enum in Supabase;
- new database functions;
- new triggers;
- automatic shipment status promotion;
- automatic document status promotion;
- milestone auto-completion;
- new permissions;
- RLS/RBAC changes;
- new storage structures;
- new audit structures;
- correction of existing test data;
- replacement of existing document lifecycle;
- replacement of existing authorization/RBAC;
- AI-generated authorization decisions;
- external service integrations;
- production migration;
- production deployment.

Any of these would require a separate proposal supported by evidence and explicit approval.

## Reuse-first boundary

Before introducing new schema or infrastructure, a future implementation review must determine whether the capability can be expressed safely using:

- existing Supabase tables and relationships;
- existing document lifecycle and verification structures;
- existing exception structures;
- existing authorization functions;
- existing application authorization hook/adapter;
- existing audit capability, if and when its actual write path is verified.

Foreign keys must be treated as structural relationships, not assumed business dependency rules.

## Test-shipment protection

CDG-SHP-2026-0001 remains unchanged.

Its current deliberate inconsistencies are evidence for testing interpretation boundaries, not defects to be corrected as part of SEC-080H.

In particular:

- DELIVERED shipment status does not prove readiness;
- all current documents being DRAFT remains distinct from verified POD evidence;
- the resolved exception remains historical evidence;
- planned shipment legs remain distinct from shipment-level status;
- the absence of audit-log rows must not be silently interpreted as proof that an authorization occurred.

## Minimum future implementation decision

The next implementation decision should answer only these questions:

1. Can the required interpretation be implemented safely as a read/interpretation service over existing data?
2. What approved rules are still missing to make applicability and dependency decisions deterministic?
3. Where, if anywhere, must a human authorization decision be persisted?
4. Can the existing audit mechanism support that decision without structural change?
5. What is the smallest implementation surface that satisfies the eight SEC-080H scenarios without changing existing operational truth?

If any answer requires a schema, security, lifecycle, or production change, that change must be separately proposed and approved before implementation.

## Acceptance criteria

This specification is considered reconciled when:

- the missing readiness capability is precisely bounded;
- existing authorization responsibilities remain intact;
- existing operational/documentary truth remains authoritative;
- evidence verification and authorization remain separate;
- unknown conditions fail safely;
- the minimum outputs are bounded;
- reuse of existing mechanisms is preferred;
- prohibited scope expansion is explicit;
- no implementation is implied by this document;
- CDG-SHP-2026-0001 remains unchanged.

## Status transition

Current status:

RECONCILED → IMPLEMENTATION BOUNDARY IDENTIFIED

Not yet:

APPROVED → IMPLEMENTED → VERIFIED

This document is a safety gate for the next decision, not authorization to build the readiness layer.
