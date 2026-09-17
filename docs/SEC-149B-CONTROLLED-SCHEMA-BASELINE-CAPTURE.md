# SEC-149B — Controlled Schema Baseline Capture Decision

**Status:** BLOCKED — REQUIRED LOCAL TOOLCHAIN NOT PRESENT IN REPOSITORY
**Production deployment:** NOT AUTHORIZED
**Production database:** NOT MODIFIED

## Verification

The repository branch `sec-146-readiness-implementation` currently contains the application and readiness candidate migration/tests, but it does not contain `supabase/config.toml`, and `package.json` does not contain the Supabase CLI as a development dependency.

The live project has independently been re-verified at 90 tables, 90 primary keys, 226 foreign keys, 121 UNIQUE constraints, 8 CHECK constraints, 269 RLS policies, 90/90 RLS-enabled tables, 211 indexes, 9 functions, 9 SECURITY DEFINER functions, and 0 readiness tables.

## Decision

Do not fabricate a baseline migration from metadata, and do not execute production DDL merely to create a local test environment.

The authoritative baseline must be captured using the Supabase CLI `db pull` workflow in a controlled local environment. Supabase documents that workflow for existing projects: initialize the repository, link the intended project, pull the remote schema into a migration, review it, then use local reset/testing to verify reproducibility.

## Why execution stops here

The current ChatGPT-connected environment can inspect and safely document the remote schema, but it does not provide the user's local Docker-compatible Supabase runtime needed to run the complete `supabase db pull` → local `db reset` → pgTAP workflow faithfully.

Therefore SEC-149B is recorded as a controlled dependency, not falsely marked complete.

## Safety gate

Do not:
- create a hosted Supabase branch merely to avoid this dependency;
- push the SEC-147 candidate migration to production;
- run `db reset --linked`;
- manufacture a synthetic 90-table migration from partial metadata;
- claim pgTAP tests pass without execution.

## Next action

When the local CLI/Docker environment is available, perform the supported schema capture, review the generated remote-schema migration, then reproduce the 90-table baseline locally. Only after that should SEC-150 begin.
