# SEC-080H Shipment Tracking — Read-Only Source & UI Contract

Status: **VERIFIED — SOURCE BOUNDARY AND UI CONTRACT DEFINED**

## Purpose

Define the smallest controlled frontend milestone that turns the existing CargoDesk shipment/tracking foundation into a useful read-only Shipment Tracking workspace without changing the database, authorization model, or operational records.

## Verified source boundary

The live logistics schema currently contains the required source entities:

- `shipments`
- `shipment_legs`
- `tracking_event`
- `shipment_milestone`

All are existing logistics tables and are RLS-enabled.

The verified `shipments` structure includes shipment identity, status, transport mode, origin/destination, planned dates, actual dates, and instructions.

The verified `shipment_legs` structure includes leg sequence, transport/carrier references, origin/destination, planned/actual departure and arrival, voyage number, and leg status.

The verified `tracking_event` structure includes shipment/leg/container references, event type, event/estimated/actual datetimes, location/port/vessel references, source information, status text, and remarks.

The verified `shipment_milestone` structure includes milestone code/name, sequence, planned/estimated/actual dates, completion state, completion actor, and remarks.

The authenticated application boundary previously verified for CargoDesk permits legitimate read access to shipment, leg, tracking-event, and shipment-milestone data through the existing security model. No new grant, policy, function, SECURITY DEFINER routine, or bypass is required by this milestone.

## Relationship contract

- `shipments.shipment_id` is the shipment subject.
- `shipment_legs.shipment_id` identifies legs belonging to the shipment.
- `tracking_event.shipment_id` identifies events belonging to the shipment.
- `tracking_event.shipment_leg_id` optionally associates an event with a shipment leg.
- `shipment_milestone.shipment_id` identifies milestones belonging to the shipment.

No relationship is inferred from unrelated fields.

## UI contract

### Shipment list

The Shipment Tracking workspace shall initially provide:

- shipment number
- current shipment status
- primary transport mode
- origin
- destination
- planned departure
- planned arrival

The list is read-only and limited to records returned through the authenticated user's existing authorization boundary.

### Shipment detail

When a shipment is selected, display:

1. shipment identity and current status;
2. route and transport information;
3. planned versus actual shipment dates;
4. ordered shipment legs;
5. milestone timeline;
6. tracking-event timeline.

### Data interpretation rules

- Null actual dates remain null and are displayed as unavailable/not recorded.
- Planned, estimated, and actual values must not be substituted for one another.
- Existing status values are displayed as recorded.
- No shipment status is recalculated by the frontend.
- No milestone is marked complete by the frontend.
- No tracking event is created, edited, deleted, or reordered in the database.
- Existing inconsistencies are displayed as evidence, not silently corrected.

## Authorization boundary

The existing `SHIPMENT_VIEW` permission remains the gate for the Shipment module.

The new workspace must not create a second authorization system.

A user without the existing permission must not receive the Shipment Tracking workspace through the UI.

Database/RLS remains authoritative even if a UI permission check is bypassed.

## Explicit exclusions

This milestone does not include:

- shipment creation/editing;
- tracking-event creation/editing;
- milestone updates;
- document lifecycle changes;
- POD access;
- readiness interpretation;
- automatic status promotion;
- new permissions;
- RLS changes;
- SECURITY DEFINER additions;
- audit schema changes;
- database migrations;
- production data correction;
- deployment.

## Test-shipment protection

`CDG-SHP-2026-0001` remains unchanged. Its deliberately inconsistent states are test evidence and must not be normalized by the UI.

## Implementation gate

The next implementation may introduce only the read-only frontend query/presentation layer and its unit-level data-shaping tests.

No database or security change is authorized by this contract.
