# SEC-166 — Bounded Audit-Integrity Pilot Design

**Status:** PROPOSED / APPROVAL GATE  
**Scope:** Design only. No implementation authorized by this document.

## 1. Objective

Define the smallest practical audit-integrity pilot that can prove the future CargoDesk audit architecture without introducing a broad audit subsystem.

## 2. Pilot operation

The proposed pilot target is an existing **document lifecycle transition** because:

- the operation already uses a controlled SECURITY DEFINER business function;
- authorization is already enforced through the established document lifecycle architecture;
- the operation is security-sensitive;
- document transitions are already represented in the existing audit model;
- the pilot can therefore validate integrity without inventing a new business workflow.

No new document lifecycle behavior is proposed.

## 3. Pilot questions

The pilot should answer only these questions:

1. Can the authenticated actor be attributed reliably?
2. Is the audit event generated from the controlled business operation rather than from the browser?
3. Does the audit record correspond to the actual successful transition?
4. Does a failed/rolled-back operation avoid leaving a false successful audit record?
5. Can an ordinary authenticated user with operational permissions fabricate or alter an audit record through the normal client path?
6. Does the mechanism preserve existing RLS/RBAC behavior?
7. Does the mechanism avoid exposing unnecessary sensitive document data?

## 4. Proposed evidence

The pilot should use a controlled non-production/test record or an explicitly designated safe test condition.

Evidence should include:

- pre-operation document state;
- authenticated actor identity;
- authorized transition request;
- resulting document state;
- resulting audit event;
- timestamp relationship;
- relevant old/new values;
- direct audit-log write attempt using a normal authenticated path, if safely testable;
- failed-operation behavior, if safely testable;
- post-test verification that no unintended production data remains changed.

The existing intentional CargoDesk test-shipment inconsistencies must not be “corrected” as part of this work.

## 5. Integrity requirements

A successful pilot must demonstrate that the authoritative audit event is tied to the controlled business operation.

The pilot must not depend on:

- frontend-generated audit rows;
- service-role browser credentials;
- privileged client credentials;
- weakening RLS;
- bypassing existing document authorization;
- a second audit table;
- an unrelated parallel audit subsystem.

## 6. Candidate mechanism

The exact implementation mechanism remains **unapproved**.

The preferred evaluation order is:

1. reuse the existing controlled document operation if its current audit behavior already satisfies the required integrity properties;
2. if a gap remains, make the smallest controlled backend/database adjustment necessary;
3. avoid a universal trigger or broad audit rewrite unless evidence demonstrates that the narrower approach is insufficient.

This preserves the existing architecture and minimizes regression risk.

## 7. Success criteria

The pilot can be considered successful only if all of the following are verified:

- authenticated actor is correctly attributable;
- successful transition produces the expected audit evidence;
- unsuccessful/rolled-back operation does not create a false successful event;
- ordinary client access cannot freely fabricate the authoritative event;
- existing document lifecycle authorization remains intact;
- no RLS/RBAC regression is observed;
- no unintended production data is modified;
- audit evidence is sufficient without indiscriminate sensitive-data duplication.

## 8. Explicit non-goals

This pilot does not authorize:

- universal audit coverage;
- auditing every table;
- new audit tables;
- broad RLS redesign;
- changing the document lifecycle;
- new permissions;
- service-role access;
- AI privileged access;
- automatic regulatory/commercial conclusions;
- production-data cleanup;
- deployment without explicit approval and verification.

## 9. Approval gate

Before implementation:

**PROPOSED → OWNER APPROVAL → EXACT MECHANISM REVIEW → SAFE TEST PLAN → IMPLEMENTED → TESTED → REVIEWED → DEPLOYED**

If inspection shows that the existing document audit behavior already satisfies the pilot criteria, implementation should stop and the result should instead be recorded as **VERIFIED — NO CHANGE REQUIRED**.

## 10. Current decision

**DESIGN ONLY.**

No database, RLS, RBAC, function, trigger, storage, application, or production-data change is authorized by SEC-166.
