# SEC-165 — Controlled Mutation-Path Inventory

**Status:** PROPOSED / INSPECTION CHECKPOINT  
**Purpose:** Identify existing write paths that must be understood before any audit-integrity implementation or broader write-enabled UI is introduced.

## 1. Scope

This inventory is deliberately bounded to the current CargoDesk architecture. It does not authorize changes.

The immediate objective is to establish where authenticated users can currently create or update operational records, which permission gates protect those paths, and which paths already generate audit records.

## 2. Verified live function surface

The current `logistics` schema contains these functions:

- `authorize_document_upload`
- `create_document_version`
- `current_user_id`
- `current_user_role`
- `has_permission`
- `request_document_amendment`
- `request_document_cancellation`
- `request_document_expiration`
- `request_document_transition`

All currently inspected functions are SECURITY DEFINER and owned by `postgres`. Their existing controlled search paths and authorization checks must be preserved unless a separately approved security review determines otherwise.

The document functions already generate audit records for several document lifecycle operations.

## 3. Verified direct authenticated write families

Live RLS policy inspection confirms authenticated INSERT/UPDATE paths exist for operational families including:

| Family | Representative tables | Permission gate |
|---|---|---|
| Shipment | shipments, shipment_legs | SHIPMENT_CREATE / SHIPMENT_EDIT |
| Cargo/container | shipment_cargo, containers, shipment_container, container_cargo_allocation | CARGO_EDIT |
| Booking | bookings, booking_amendments, booking_documents | BOOKING_CREATE / BOOKING_EDIT / DOCUMENT_* |
| Tracking | tracking_event, shipment_milestone | TRACKING_CREATE |
| Exceptions | shipment_exception | EXCEPTION_MANAGE |
| Delivery | delivery, delivery_container, proof_of_delivery | DELIVERY_CREATE / DELIVERY_EDIT |
| Warehouse/operations | stuffing_record, weighbridge_record, container_vgm | OPERATIONS_EDIT |
| Documents | document business tables and document-link tables | DOCUMENT_CREATE / DOCUMENT_EDIT |
| Users/roles | users, roles, role_permissions | USER_MANAGE / ROLE_MANAGE / PERMISSION_MANAGE |
| Master/configuration | master-data and status/reference tables | MASTER_DATA_* / SYSTEM_CONFIG |

The complete live policy set is larger than this summary; the table above identifies the principal mutation families relevant to the next design decision.

## 4. Audit-generation finding

The inspection establishes an important distinction:

### Already covered by controlled audit generation

The existing document lifecycle functions explicitly write to `audit_log` for controlled operations such as:

- document amendment requests;
- document cancellation;
- document expiration;
- document status transitions.

### Not yet established as automatically audited

Direct authenticated table writes for the broader operational families do not currently have an established general-purpose automatic audit mechanism.

The earlier trigger inspection also found no user-defined triggers on the inspected core operational tables.

Therefore, the project currently has **partial, operation-specific audit generation**, not a universal audit trail.

## 5. Security/integrity implication

The future audit design should not simply add a trigger to every table without first deciding:

- which mutations are authoritative business operations;
- which changes require before/after state;
- which sensitive fields must be excluded or minimized;
- whether direct table writes should remain available for particular operations;
- where controlled business functions are preferable;
- how transaction rollback affects audit records;
- how ordinary users are prevented from fabricating historical audit entries.

The existing document functions demonstrate that controlled audit generation is already possible without introducing a second audit subsystem.

## 6. Recommended next implementation boundary

No audit mechanism should be implemented yet.

The next design gate should be a **small controlled audit pilot** around one already-existing, security-sensitive business operation, selected only after owner approval and exact mutation-path review.

The pilot must prove:

1. actor attribution;
2. event correctness;
3. before/after capture;
4. transaction consistency;
5. protection against ordinary direct audit fabrication;
6. compatibility with existing RLS/RBAC;
7. no regression to existing document lifecycle behavior.

Only after that evidence is satisfactory should coverage expand.

## 7. Explicit non-goals

This checkpoint does not authorize:

- audit triggers;
- audit policy changes;
- new functions;
- new permissions;
- schema changes;
- direct audit-log restrictions;
- production-data modifications;
- write-enabled frontend work;
- service-role access;
- AI privileged access.

## 8. Current decision

**INSPECT → RECONCILE → DOCUMENT → SUSPEND**

The CargoDesk foundation remains unchanged.

The nearest justified implementation milestone is therefore **not another broad workspace**. It is a tightly bounded audit-integrity pilot, but only after the pilot's exact operation and mechanism have been explicitly approved.
