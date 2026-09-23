# SEC-080H Read-Only Readiness Integration Adapter — Design & Unit Verification

Status: IMPLEMENTED — UNIT VERIFICATION DEFINED; PRODUCTION INTEGRATION NOT AUTHORIZED

## Scope

This milestone implements the smallest application-layer adapter needed to translate already-authorized source records into the existing pure readiness interpreter contract.

It does not connect to Supabase and does not change operational state.

## R2 — Applicability

The adapter accepts an explicit applicability result from the caller.

It does not infer applicability from shipment status, leg status, delivery state, or any other operational field.

When applicability is not explicitly supplied, it emits UNKNOWN, allowing the interpreter to fail safely to REVIEW_REQUIRED.

## R6 — Document Lifecycle

The adapter maps document status supplied by the authorized caller into evidence state.

Only APPROVED and ISSUED are treated as verified document evidence.

DRAFT, SUBMITTED, UNDER_REVIEW, REJECTED, AMENDED, EXPIRED, CANCELLED, unknown, or absent status are not treated as verified.

The adapter does not change the authoritative document lifecycle.

## R1 — Required Evidence

The adapter does not invent a required-document catalogue.

Required evidence is accepted only from the approved rule input. This preserves the owner-approved boundary that evidence requirements are policy, not something inferred by application code.

## R4 — Exceptions

Existing exception records are normalized for the interpreter without changing their source status.

Unknown/indeterminate states remain indeterminate.

Resolved exceptions remain historical evidence and are not converted into readiness by the adapter.

## POD / Protected Evidence

The adapter does not query or create a POD access path and does not add protected evidence automatically.

POD remains outside the mandatory first-phase evidence set.

## Security and Integrity

No Supabase query, service-role path, RLS bypass, direct grant, SECURITY DEFINER function, new permission, audit write, status mutation, document transition, data correction, schema change, or production deployment was introduced.

## Unit Verification

Added focused tests for:
- R2 non-inference from shipment status;
- R6 non-final document states;
- R1 policy-supplied required evidence;
- R4 exception normalization;
- preservation of the protected POD boundary.

The readiness test command now includes both the original interpreter tests and the adapter tests.

## Verification Limitation

The adapter is intentionally a pure transformation layer. It does not itself establish that a caller is authorized to retrieve source data; the existing authorization boundary remains responsible for that.

It also expects the caller to provide the authoritative document status value. A future data-fetching layer must obtain that value through legitimate existing access paths and must not bypass RLS/RBAC.

## Gate Result

ADAPTER DESIGN AND UNIT VERIFICATION: IMPLEMENTED

The next step, if continued, is a controlled review of this adapter against the existing application authorization boundary and source-query shapes before any UI integration.

No merge or production deployment is authorized by this milestone.
