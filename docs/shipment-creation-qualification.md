# Shipment Creation Qualification

## Status

**PROPOSED → READ-ONLY INSPECTED → VERIFIED → PENDING OWNER APPROVAL**

This document qualifies the smallest safe controlled shipment-creation workflow for CargoDesk Global. It does not implement a database function, grant privileges, alter RLS/RBAC, create production data, or modify the frontend.

## Verified production foundation

- `logistics.shipments` exists and is protected by RLS.
- `SHIPMENT_CREATE` already exists and is assigned to DATA_ENTRY_OFFICER, LOGISTICS_ADMIN, and SYSTEM_ADMIN.
- Authenticated currently has SELECT but not direct INSERT/UPDATE privilege on `logistics.shipments`.
- Existing RLS INSERT policy requires `logistics.has_permission('SHIPMENT_CREATE')`.
- `shipment_number` has a unique database index.
- `shipment_id` is sequence-backed.
- `shipment_status_id` is required and has no database default.
- Active shipment status ID 1 is `DRAFT`.
- Existing active shipment types: EXPORT, IMPORT, DOMESTIC, TRANSIT, TRANSSHIPMENT.
- Existing active transport modes: ROAD, MARITIME, AIR, RAIL, PIPELINE, MULTIMODAL.
- Existing active Incoterms are populated.
- Existing active locations and countries are populated.
- No existing shipment/cargo/booking/leg/container audit records were found in the current audit log search.
- Existing production shipment `CDG-SHP-2026-0001` is intentionally preserved and must not be altered for testing.

## Recommended scope

The first controlled creation workflow should create **one core `shipments` row only**.

### User-supplied fields

The form may provide:

- shipment type
- customer
- supplier
- primary transport mode
- Incoterm
- origin location
- destination location
- origin country
- destination country
- planned departure date
- planned arrival date
- cargo ready date
- special instructions

Database-nullable fields should remain optional unless a documented business rule establishes otherwise.

### System-controlled fields

The system must control:

- shipment ID
- shipment number
- initial status = DRAFT
- created_at
- updated_at

The client must not select or submit an arbitrary initial shipment status.

## Shipment-number proposal

Proposed format:

`CDG-SHP-YYYY-NNNN`

Example:

`CDG-SHP-2026-0002`

Generation must be server-side and collision-safe. Do **not** use MAX(shipment_number)+1.

The exact concurrency-safe numbering mechanism must be implemented only after owner approval of this proposal.

## Controlled write architecture

Do not grant direct authenticated INSERT privilege merely to make the form work.

Preferred path:

Authenticated UI
→ SHIPMENT_CREATE authorization
→ narrowly scoped SECURITY DEFINER RPC
→ authenticated-user validation
→ permission validation
→ reference validation
→ collision-safe shipment-number generation
→ INSERT with DRAFT status
→ audit record
→ authoritative result returned
→ frontend refresh from persisted state

The function should follow the established CargoDesk security pattern: authenticated verification, explicit permission checking, controlled search_path, minimum scope, authoritative database mutation, and authoritative return data.

## Separation of related workflows

Do not make shipment creation a monolithic transaction.

Keep these as separate controlled workflows:

1. Core shipment creation
2. Cargo entry
3. Booking creation/editing
4. Shipment-leg management
5. Container assignment
6. Documentation
7. Delivery/operational lifecycle

This preserves the existing permission boundaries and avoids partially populated operational records being created unnecessarily.

## Audit requirement

Shipment creation should generate a controlled audit entry from the database-side workflow. The frontend must not write directly to `audit_log`.

The exact action_type/description payload should be confirmed against the existing audit vocabulary before implementation; no historical shipment-creation audit convention was found, so none is being invented here.

## Frontend proposal

After database implementation is approved and verified, the current read-only Shipments workspace can be extended with a controlled **Create Shipment** action.

The frontend must:

- resolve authorization before enabling the action;
- fail closed while authorization is loading;
- load existing reference data through authorized read paths;
- call only the approved shipment-creation RPC;
- display the authoritative returned shipment number/status;
- refresh the shipment list after success;
- never directly insert into `shipments`;
- never create synthetic IDs/statuses/timestamps.

## Explicit exclusions

This qualification does not authorize:

- direct table grants;
- RLS changes;
- RBAC changes;
- new permissions or roles;
- production shipment creation;
- modification of `CDG-SHP-2026-0001`;
- cargo/booking/leg/container creation in the same RPC;
- document/storage changes;
- unrelated indexes;
- unrelated schema changes;
- production deployment.

## Approval gate

Before implementation, owner approval is required for:

1. creation of the controlled shipment RPC;
2. server-side shipment-number generation;
3. database audit insertion for shipment creation;
4. frontend Create Shipment workflow;
5. associated migration and deployment.

No production mutation should be performed solely to prove the feature works.

## Next implementation step after approval

Prepare the exact migration/RPC contract and frontend implementation on a separate branch, then build and inspect it before any merge or production deployment.
