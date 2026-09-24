# SEC-164 — Audit Architecture Specification

**Status:** PROPOSED / ARCHITECTURE-ONLY  
**Scope:** CargoDesk Global audit integrity and future audit-trail implementation  
**Implementation status:** No database, RLS, RBAC, function, trigger, storage, or production-data changes

## 1. Purpose

Define the minimum architectural contract that must be approved before CargoDesk relies on `logistics.audit_log` as a trusted historical audit trail.

This specification deliberately does not implement the audit mechanism.

## 2. Current verified position

The existing `logistics.audit_log` table, RLS, and `AUDIT_VIEW` permission provide a foundation for audit visibility. Live inspection established that:

- `audit_log` exists and is RLS-enabled.
- The table is owned by `postgres`.
- `audit_log` currently contains no audit records.
- The inspected operational tables do not have an established user-defined automatic audit-population trigger.
- No dedicated existing `logistics` audit/history/change function was identified.
- The current INSERT policy permits authenticated users satisfying `AUDIT_VIEW` to insert audit rows.

Therefore, the current table must **not** yet be treated as a complete, system-generated, tamper-resistant audit history.

## 3. Target audit principles

Future implementation should establish:

1. **Attribution** — every auditable event identifies the authenticated actor or an explicitly identified system process.
2. **Automatic generation** — core audit events should originate from controlled business/data mutation paths rather than relying solely on frontend logging.
3. **Integrity** — ordinary application users should not be able to freely fabricate, alter, or delete historical audit evidence.
4. **Traceability** — an event should identify the operation, affected object, timestamp, and relevant before/after state where appropriate.
5. **Data minimization** — sensitive or unnecessary values must not be copied indiscriminately into audit records.
6. **Transaction consistency** — audit behavior must be defined for successful and failed transactions.
7. **Controlled coverage** — audit scope should be explicit rather than attempting to capture every database event indiscriminately.
8. **No false authority** — an audit record records what the system observed; it does not itself establish regulatory, commercial, or legal authority.

## 4. Minimum event model

For each selected auditable operation, the eventual mechanism should define:

- actor/user or system identity;
- action/event type;
- affected table/entity;
- affected record identifier/reference;
- event timestamp;
- relevant old state;
- relevant new state;
- originating business operation where useful;
- description/context where necessary.

IP address and user agent should only be retained where justified and consistently available.

## 5. Sensitive-data boundary

Before implementation, the project must explicitly classify fields that should be:

- retained normally;
- retained in reduced form;
- redacted;
- excluded entirely.

Whole-row JSON capture must not be adopted merely because it is convenient.

## 6. Audit-generation boundary

The preferred future flow is:

**Authorized business operation**  
→ **controlled mutation path**  
→ **audit event generation**  
→ **audit_log**

Frontend-only audit logging is not sufficient as the authoritative mechanism because clients can be bypassed.

Database triggers, controlled database functions, or another backend-controlled mechanism may be considered after the mutation paths are inventoried. No mechanism is pre-approved by this document.

## 7. Immutability and access boundary

Before implementation, the project must determine and enforce:

- who may create audit records;
- whether direct INSERT is removed from ordinary users;
- whether UPDATE is prohibited;
- whether DELETE is prohibited;
- whether controlled retention/archival is required;
- which role(s) may view audit history.

The existing `AUDIT_VIEW` permission should remain a viewing/administrative concept unless a later approved design explicitly assigns another purpose.

## 8. Initial audit coverage candidates

Future coverage should prioritize security- and integrity-relevant operations rather than every read:

- shipment creation and material updates;
- booking creation/material updates;
- cargo/container changes;
- tracking and milestone changes;
- exception creation/resolution;
- delivery/POD changes;
- document creation, verification, amendment, expiration, cancellation and lifecycle transitions;
- user/role/permission administration;
- security-sensitive configuration changes.

Coverage must be confirmed against the actual mutation paths before implementation.

## 9. Explicit non-goals

This specification does not authorize:

- new audit tables;
- new triggers;
- SECURITY DEFINER functions;
- RLS policy changes;
- permission changes;
- document lifecycle changes;
- service-role access;
- privileged AI access;
- production-data modification;
- automatic compliance/regulatory conclusions;
- automatic document issuance.

## 10. Implementation gate

A future audit implementation may proceed only after:

**PROPOSED → OWNER APPROVED → MUTATION PATHS INSPECTED → DESIGN VERIFIED → IMPLEMENTED → TESTED → REVIEWED → DEPLOYED**

The implementation should be narrowly scoped and backward-compatible with the established CargoDesk architecture wherever practical.

## 11. Current decision

For the present milestone:

**DOCUMENT ONLY. DO NOT IMPLEMENT.**

The existing CargoDesk database and security foundation remain unchanged.
