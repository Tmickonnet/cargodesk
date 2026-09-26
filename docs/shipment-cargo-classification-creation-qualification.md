# Shipment Cargo Classification Creation — Qualification

## Status
PROPOSED → QUALIFICATION

This document qualifies the controlled creation boundary for shipment-specific product classification. It does not authorize production implementation or data mutation.

## Objective
Allow an authorized user to create a shipment-cargo classification proposal while preserving separation between:
- cargo editing,
- classification proposal/assignment,
- formal classification verification.

## Proposed workflow
1. User selects an existing shipment cargo line.
2. User selects an existing Product reference.
3. User selects an existing Classification Record.
4. Server validates all references and their relationship.
5. Server snapshots the classification context into `shipment_cargo_classification`.
6. New record starts as `SUGGESTED` (or another explicitly approved non-verified state).
7. Audit record records the creation.
8. A separately authorized verifier may later move the record to `VERIFIED` through the existing verification RPC.

## Proposed RPC
`logistics.create_shipment_cargo_classification(p_shipment_cargo_id bigint, p_product_id bigint, p_classification_record_id bigint, p_source_code varchar DEFAULT 'HUMAN_ENTERED')`

The implementation should:
- require authenticated Supabase identity;
- resolve the application user with `logistics.current_user_id()`;
- require `CARGO_EDIT` for proposal creation;
- validate the shipment cargo exists;
- validate the Product exists and is active;
- validate the Classification Record exists and is active;
- validate that the selected classification record has a valid edition and jurisdiction context;
- optionally validate an active Product → Classification mapping where one exists, without making master mappings mandatory for human-entered proposals;
- prevent an invalid duplicate active/pending classification proposal for the same cargo/product/context;
- copy classification code, official description, system code, edition code and jurisdiction code into the immutable shipment snapshot fields;
- set status to `SUGGESTED`;
- set the supplied source code only to an allowed controlled value;
- write an atomic audit record;
- return authoritative JSONB;
- use a controlled search_path;
- revoke PUBLIC/anon execution;
- grant execution only to authenticated.

## Important separation
The creation RPC must never set `VERIFIED`, `verified_by`, or `verified_at`.

The existing `verify_shipment_cargo_classification` RPC remains the sole controlled verification path.

## Security boundary
No direct authenticated INSERT privilege should be granted on `shipment_cargo_classification`.

No `MASTER_DATA_CREATE` or `MASTER_DATA_EDIT` role mapping is proposed.

## Existing cargo compatibility
The existing `shipment_cargo.commodity_id` and `shipment_cargo.hs_code` remain unchanged. This qualification does not migrate, overwrite, or delete legacy values.

## Production data
No Product, Classification Record, or Shipment Classification data should be seeded by this qualification.

Cargo line 2 remains unchanged.

## Audit
Creation should use the existing audit_log structure and action type:
`SHIPMENT_CARGO_CLASSIFICATION_CREATED`.

## Approval gate
Before production implementation:
- review RPC SQL;
- review duplicate/idempotency behavior;
- review status transition semantics;
- review audit payload;
- review RLS/RBAC implications;
- explicitly approve the new SECURITY DEFINER function;
- then implement, migrate, test and verify.

## Recommendation
Use `CARGO_EDIT` for proposing a classification because the action is part of controlled cargo data entry. Keep `SHIPMENT_CLASSIFICATION_VERIFY` separate for formal verification. This preserves separation of duties without unnecessarily expanding the role model.
