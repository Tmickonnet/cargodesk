# SEC-080H — Protected Evidence & Authorization Dependency Decision

Status: VERIFIED / IMPLEMENTATION GATE

## Purpose

This document records the narrow dependency verification performed before any readiness interpreter code is introduced.

## Verified findings

### 1. Proof-of-delivery records

The live database contains one proof-of-delivery record and one proof-of-delivery-document relationship.

However, the database ACL inspection shows that the roles:

- anon
- authenticated
- service_role

do not have direct table SELECT privileges on:

- logistics.proof_of_delivery
- logistics.proof_of_delivery_documents

Both tables are RLS-enabled.

Therefore, a readiness interpreter must not bypass these controls or introduce direct client access merely to consume POD evidence.

### 2. Audit records

The live audit_log contains zero rows.

The same ACL inspection shows no direct SELECT/INSERT/UPDATE privilege for anon, authenticated, or service_role on logistics.audit_log.

Therefore, the current database does not provide evidence that a durable readiness-authorization record can be written or subsequently read through an existing ordinary role/table path.

This does not justify changing audit permissions or schema at this gate.

### 3. Existing protected-access mechanism

The private schema contains the existing SECURITY DEFINER helper:

private.cargodesk_storage_document_access(
  p_bucket_id text,
  p_object_name text,
  p_required_operation text
)

It is executable by authenticated users and is already part of the established private document-storage security model.

This helper concerns storage-document access. It does not establish a general-purpose read path for proof_of_delivery records or audit_log records and must not be repurposed without separate review.

### 4. Existing document authorization functions

The live database confirms existing authenticated-callable SECURITY DEFINER document functions, including document upload/version and lifecycle authorization functions.

These remain part of the established document lifecycle and authorization architecture.

They do not constitute a readiness-authorization mechanism.

## Decision

The readiness interpreter can safely proceed only as a read-oriented capability over data that its existing authorized access path can legitimately expose.

For POD evidence:

- do not grant direct authenticated SELECT;
- do not weaken RLS;
- do not create a generic bypass function;
- do not repurpose the storage helper;
- retain POD as a protected evidence dependency until an approved read path is identified.

For durable readiness authorization:

- do not write to audit_log;
- do not alter audit_log grants;
- do not create a new authorization/audit table;
- do not claim AUTHORIZED merely from application permission;
- treat durable authorization evidence as unavailable until an approved existing or separately authorized mechanism is established.

## Impact on S01–S08

S01: READY_FOR_REVIEW may remain conceptually available when approved evidence rules are satisfied; AUTHORIZED remains dependent on an approved authorization-recording mechanism where required.

S02: REVIEW_REQUIRED remains supported by the existing operational-state records and approved conflict rules.

S03: DRAFT document status remains authoritative; supporting evidence cannot promote it.

S04: REVIEW_REQUIRED remains available where exception impact is unresolved.

S05: resolved exceptions remain historical context and do not automatically establish readiness.

S06: NOT_READY remains available where an applicable required evidence condition is definitively unmet.

S07: REVIEW_REQUIRED remains the fail-safe for unknown applicability.

S08: explicit human authorization cannot be represented as durable AUTHORIZED evidence through the currently verified audit path.

## Implementation boundary after this verification

No structural database change is justified.

The minimum safe implementation remains:

- application/service-level;
- read-oriented;
- non-mutating;
- subject to existing authorization and RLS;
- incapable of bypassing protected POD or audit data;
- incapable of inventing domain policy.

## Next controlled gate

The next gate is NOT a schema change.

It is owner-level policy resolution of the remaining authorization requirement:

1. determine whether S08 requires durable authorization evidence for the first implementation;
2. if yes, identify an already-approved existing mechanism or separately approve the smallest mechanism required;
3. determine the approved read path for POD evidence;
4. only then finalize implementation scope.

Until those decisions are made, no readiness implementation code should be merged or deployed.
