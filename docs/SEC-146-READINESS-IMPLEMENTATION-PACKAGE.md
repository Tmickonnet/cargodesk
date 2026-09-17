# SEC-146 — CargoDesk Readiness Implementation Package

## Status

- Design: COMPLETE
- Implementation package: STAGED FOR CONTROLLED TESTING
- Production deployment: NOT AUTHORIZED
- Production schema: UNCHANGED
- Existing 90-table foundation: PRESERVED

## Scope

This package implements only the approved shipment-readiness capability:

1. logistics.readiness_evaluation
2. logistics.readiness_rule_result
3. logistics.readiness_evidence_reference
4. logistics.readiness_human_decision

No existing CargoDesk operational table is modified.

## Security boundary

- Existing CargoDesk RBAC helpers remain authoritative.
- Proposed readiness permissions are separate: READINESS_VIEW, READINESS_EXECUTE, READINESS_FINALIZE, READINESS_AUTHORIZE.
- No anonymous readiness access.
- No GRANT ALL.
- No ordinary DELETE pathway.
- Readiness validation is SECURITY INVOKER.
- Human authorization remains separate from system evaluation.
- Existing logistics.audit_log remains the sole audit layer.

## Evidence integrity

readiness_evidence_reference uses explicit nullable source foreign keys. Exactly one source is permitted.

Supported sources:

- shipment_id
- shipment_cargo_id
- shipment_container_id
- container_vgm_id
- weighbridge_record_id
- stuffing_record_id
- tracking_event_id
- shipment_milestone_id
- shipment_exception_id
- shipment_leg_id
- shipment_document_id
- delivery_id
- proof_of_delivery_id

Shipment-document evidence must reference shipment_documents.shipment_document_id, preserving shipment association through shipment_documents.

Cross-shipment validation must reject evidence that does not resolve to the evaluation shipment.

## Lifecycle

CREATED -> EVALUATING -> EVALUATED -> REVIEW_REQUIRED/HUMAN_APPROVAL -> DECIDED -> SUPERSEDED

Finalized/decided evaluations are not rewritten as ordinary corrections. Corrections create a new evaluation version and supersede the previous version.

## System versus human decision

READY is a system result only. It does not constitute human authorization.

Where separation of duties applies, evaluated_by must differ from decided_by.

## Required tests

- Structure and constraints
- RLS and permission boundaries
- Positive and negative evidence tests
- Cross-shipment rejection
- Lifecycle protection
- Human authorization and separation of duties
- Audit integration
- Regression confirmation that the original 90-table foundation remains intact

## Production gate

The migration must not be applied to production until:

1. An isolated development/test environment exists.
2. The complete migration executes successfully there.
3. pgTAP/database security tests pass.
4. Regression verification passes.
5. Security review is complete.
6. CargoDesk owner explicitly authorizes production deployment.

This document intentionally contains no production credentials, secrets, service-role keys, or destructive commands.
