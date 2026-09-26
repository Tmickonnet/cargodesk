# Product Classification Hierarchy Integrity Decision

**Status:** QUALIFIED — IMPLEMENTATION REFINEMENT

## Decision

Classification hierarchy relationships must remain within the same classification edition and jurisdiction.

The physical model will enforce this by using a composite parent-context relationship rather than allowing a parent classification record from an unrelated edition/jurisdiction.

## Reason

A classification hierarchy is contextual. A child code in one edition/jurisdiction must not accidentally reference a parent code belonging to another edition/jurisdiction.

A simple self-referencing foreign key verifies existence only; it does not verify classification context.

## Implementation shape

The implementation should retain:

- `classification_edition_id`
- `classification_jurisdiction_id`
- `parent_classification_record_id`

and add the necessary composite uniqueness/FK support so the parent relationship is constrained to the same edition and jurisdiction.

The self-parent prohibition remains.

## Scope

This is a structural integrity refinement only.

It does not authorize:

- production migration;
- existing-data changes;
- classification backfill;
- RBAC changes;
- application deployment;
- cargo line 2 modification.

Next gate remains:

**QUALIFIED → SECURITY/RLS PACKAGE → FINAL REVIEW → OWNER APPROVAL → IMPLEMENTED → VERIFIED**
