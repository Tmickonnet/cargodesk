-- SEC-149C CONTROL SPECIFICATION
-- Candidate-only, not executed in production.
-- This file records the three controls that must be implemented and tested
-- in the controlled local baseline before any production proposal.

# Cross-shipment evidence validation

The readiness evidence row must belong to the same shipment as its parent evaluation. The validator must:
1. resolve the evaluation shipment;
2. require evidence_reference.shipment_id to equal that shipment;
3. resolve exactly one source FK;
4. resolve the source shipment through the authoritative existing relationship;
5. reject missing or cross-shipment evidence;
6. remain SECURITY INVOKER;
7. run before INSERT or UPDATE of readiness evidence.

# Lifecycle immutability

Finalized or decided evaluations must not be ordinarily rewritten. Controlled enforcement must reject mutation of protected historical state. Corrections must create a new evaluation version and use supersedes_evaluation_id. No ordinary DELETE pathway is permitted.

# Human authorization separation of duties

Where independent authorization is required, a human decision must not be made by the same user who evaluated the readiness evaluation. The controlled implementation must reject evaluated_by = decided_by for such evaluations. Human decision reason remains mandatory.

# Security boundary

These controls must be implemented only in the controlled local baseline first. They must not alter the existing 90-table production foundation merely for convenience.
