BEGIN;

-- QUALIFICATION DRAFT ONLY.
-- This migration is intentionally non-executable for production.
-- It documents the intended controlled RPC boundary without creating it.

-- Proposed function:
-- logistics.create_shipment_cargo_classification(
--   p_shipment_cargo_id bigint,
--   p_product_id bigint,
--   p_classification_record_id bigint,
--   p_source_code varchar DEFAULT 'HUMAN_ENTERED'
-- )
--
-- Required controls:
-- * authenticated identity
-- * CARGO_EDIT permission
-- * active shipment cargo/product/classification references
-- * classification edition/jurisdiction context validation
-- * controlled source-code validation
-- * duplicate/pending proposal protection
-- * immutable snapshot fields
-- * status = SUGGESTED only
-- * atomic SHIPMENT_CARGO_CLASSIFICATION_CREATED audit
-- * SECURITY DEFINER with search_path = logistics, pg_catalog
-- * EXECUTE authenticated only; PUBLIC/anon revoked
--
-- Production implementation requires explicit approval.

ROLLBACK;
