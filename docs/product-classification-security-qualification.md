# CargoDesk Product & Classification Security Qualification

**Status:** PROPOSED — SECURITY DESIGN  
**Production changes:** NONE

## 1. Security baseline

The existing CargoDesk authorization architecture uses RLS, application permissions, controlled RPCs for sensitive writes, and an established audit model.

The current Supabase security advisor reports 12 authenticated-executable SECURITY DEFINER functions. This is an existing reviewed warning, not evidence that the proposed classification model should add another privileged function automatically.

## 2. Reference-data access

The following proposed reference entities should be treated as master/reference data:

- product
- classification_system
- classification_jurisdiction
- classification_edition
- classification_record

Operational users should receive only the minimum read access required by the shipment workflow.

Master-data mutation must remain restricted.

## 3. Transactional classification access

shipment_cargo_classification is transactional data.

The preferred design is:

- authenticated operational users can read only according to existing shipment/cargo authorization;
- creation is controlled by the appropriate cargo permission;
- verification is separately authorized if existing permissions cannot safely express verification;
- every verification produces an audit event;
- direct unrestricted UPDATE is not recommended.

## 4. SECURITY DEFINER decision

Do not introduce a SECURITY DEFINER RPC simply because existing controlled workflows use RPCs.

A new privileged function is justified only if atomic authorization, audit recording, or RLS boundary requirements cannot be implemented safely with SECURITY INVOKER plus existing policies.

If a SECURITY DEFINER function is eventually approved:

- require auth.uid();
- use a fixed search_path;
- revoke PUBLIC/anon execution;
- grant only to authenticated where necessary;
- validate permissions inside the function;
- avoid dynamic SQL;
- review with Supabase security advisors.

## 5. RLS policy design

Every new table must have RLS enabled before application exposure.

Reference data:
- authenticated SELECT only where needed;
- write access restricted to approved master-data roles.

Product classification mappings:
- controlled master-data write;
- read according to operational need.

Shipment cargo classification:
- SELECT aligned to shipment/cargo visibility;
- INSERT aligned to approved cargo-edit authority;
- UPDATE restricted to controlled lifecycle operations;
- DELETE should not be an ordinary operational action.

UPDATE policies, if used, must include both USING and WITH CHECK.

## 6. Historical integrity

A VERIFIED shipment classification should not be destructively edited.

Correction should create an auditable replacement/supersession event rather than silently changing historical meaning.

## 7. Permissions

Candidate permissions require explicit review before implementation.

Possible actions:
- PRODUCT_VIEW
- PRODUCT_MANAGE
- CLASSIFICATION_VIEW
- CLASSIFICATION_MANAGE
- SHIPMENT_CLASSIFICATION_CREATE
- SHIPMENT_CLASSIFICATION_VERIFY

Existing permissions should be reused where they accurately represent the action. New permissions should not be created merely for naming convenience.

## 8. Production safety

This qualification makes no production changes and does not authorize:

- table creation;
- grants;
- RLS policies;
- permissions;
- functions;
- data migration;
- cargo correction;
- application deployment.

## 9. Approval gate

The physical migration, security policies, permissions and any RPCs must be approved together before implementation.

**PROPOSED → SECURITY QUALIFIED → OWNER APPROVAL → IMPLEMENTED → VERIFIED**
