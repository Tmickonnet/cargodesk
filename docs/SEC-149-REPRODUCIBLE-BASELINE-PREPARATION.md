# SEC-149 — Reproducible CargoDesk Schema Baseline Preparation

**Status:** IDENTIFIED / CONTROLLED PREPARATION ONLY  
**Production deployment:** NOT AUTHORIZED  
**Production database:** NOT MODIFIED

## Objective

Establish a trustworthy version-controlled representation of the existing CargoDesk Global 90-table logistics foundation before executing SEC-147 readiness migration tests.

## Current verified remote baseline

- 90 base tables
- 90 primary keys
- 226 foreign keys
- 121 UNIQUE constraints
- 8 CHECK constraints
- 269 RLS policies
- 90/90 tables with RLS enabled
- 211 indexes
- 9 logistics functions
- 9 SECURITY DEFINER functions
- 0 readiness tables

## Required controlled workflow

1. Initialize the repository for Supabase CLI only when the local environment is available.
2. Link only to the intended CargoDesk project.
3. Capture the existing remote schema as a baseline using the Supabase-supported schema-pull workflow.
4. Review the generated baseline before committing it.
5. Do not pull production data into seed.sql.
6. Reconstruct only representative non-sensitive test data when required.
7. Start a local Supabase stack with Docker-compatible runtime.
8. Reset the local database and verify the baseline reproduces the expected structure.
9. Apply the SEC-147 candidate readiness migration locally.
10. Run the pgTAP readiness test suite.
11. Verify that the foundation remains intact, four readiness tables are added, RLS is enabled on readiness tables, no anonymous readiness policy exists, no DELETE policy exists, evidence source constraints are valid, lifecycle constraints are valid, no unintended SECURITY DEFINER readiness function is introduced, and cross-shipment validation is tested before any production consideration.
12. Run Supabase security/performance advisors against the controlled environment where supported.
13. Review and correct findings before any deployment proposal.

## Safety restrictions

Never use:
- supabase db reset --linked
- destructive commands against production
- production data as a seed dataset
- service-role credentials in repository files
- secrets in migration/test files
- production db push during SEC-149
- a hosted development branch merely to avoid establishing the local baseline

## Important interpretation

The existing repository does not yet contain a complete representation of the verified 90-table foundation. Therefore the SEC-147 candidate migration must not be considered executable merely because the SQL file exists.

SEC-149 is complete only after the baseline has been captured, reviewed, reproduced locally, and verified.

## Gate

**SEC-149 → SEC-150 only after reproducible baseline verification.**

No production schema, data, RLS, RBAC, audit, or permissions change is authorized by this document.
