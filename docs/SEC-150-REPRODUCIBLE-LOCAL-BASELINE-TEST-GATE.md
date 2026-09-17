# SEC-150 — REPRODUCIBLE LOCAL BASELINE RECONSTRUCTION & RUNTIME TEST GATE

**Status:** GATED / NOT EXECUTED  
**Production authorization:** NO  
**Remote schema modification:** NO  
**Supabase branch:** NONE  
**Purpose:** Establish the only acceptable route from candidate readiness SQL to runtime evidence.

## 1. Gate condition

Runtime execution must begin only after a trustworthy local representation of the current CargoDesk foundation exists.

Required baseline:

- 90 `logistics` base tables;
- 90 primary keys;
- 226 foreign keys;
- 121 UNIQUE constraints;
- 8 CHECK constraints;
- 269 RLS policies;
- 90/90 tables with RLS enabled;
- 211 indexes;
- 9 functions;
- 9 SECURITY DEFINER functions;
- 0 readiness tables before candidate migration.

These values are the authoritative SEC-149A remote inventory and must be reconciled before any readiness runtime test is accepted.

## 2. Current repository limitation

The repository does not yet contain the complete historical migration chain that reconstructs the 90-table foundation.

Therefore:

**Do not run the SEC-147/149D readiness migrations against an incomplete local database.**

A local database with fewer or different foundation objects would produce invalid test evidence.

## 3. Required environment

Supabase documents that reproducible local development requires the Supabase CLI and a Docker-compatible container runtime. The local workflow uses `supabase init`, `supabase db pull`, `supabase start`, and `supabase db reset`; pgTAP is the supported database testing framework through `supabase test db`. 

Reference:
https://supabase.com/docs/guides/local-development/cli-workflows
https://supabase.com/docs/guides/local-development/cli/testing-and-linting

## 4. First runtime action

Once the controlled Windows/Docker environment is available:

1. Clone the exact `sec-146-readiness-implementation` branch.
2. Install/pin a supported Supabase CLI version.
3. Initialize the local Supabase configuration only if it does not already exist.
4. Obtain the remote schema baseline using the controlled `db pull` workflow, without pushing anything.
5. Review the generated baseline migration before accepting it.
6. Reconstruct the local database.
7. Verify the baseline counts exactly match SEC-149A.
8. Record the baseline result.
9. Only then apply the candidate readiness migration.
10. Run the structural, security, lifecycle, evidence, authorization, regression, and hardening tests.

## 5. Runtime acceptance gates

### Gate A — Foundation

PASS only if all SEC-149A baseline counts match.

### Gate B — Readiness structure

Expected:

**90 → 94 tables**

with exactly four new readiness tables.

No existing foundation table may be altered.

### Gate C — Security

Verify:

- all four readiness tables have RLS;
- no anonymous readiness access;
- no ordinary readiness DELETE policies;
- no readiness SECURITY DEFINER control functions;
- validator is SECURITY INVOKER;
- exact readiness triggers exist.

### Gate D — Evidence integrity

Negative tests must prove:

- cross-shipment evidence is rejected;
- wrong source shipment is rejected;
- missing source resolution is rejected;
- multiple source references remain impossible;
- shipment-document evidence uses `shipment_documents`.

### Gate E — Lifecycle

Negative tests must prove:

- DECIDED evaluation cannot be modified;
- SUPERSEDED evaluation cannot be modified;
- finalized child evidence cannot be modified/deleted;
- human decision cannot be modified/deleted;
- correction occurs through a new evaluation version.

### Gate F — Authorization

Negative tests must prove:

- evaluator cannot authorize their own evaluation where SoD applies;
- missing evaluator is rejected;
- invalid lifecycle state is rejected;
- anonymous authorization remains unavailable.

### Gate G — Regression

After readiness migration and tests:

- foundation remains 90 original tables;
- total becomes 94;
- existing table names remain intact;
- existing PK/FK/security counts change only where explicitly expected;
- existing test shipment remains untouched;
- no existing document/security control is weakened.

## 6. Production safety rule

The first successful local runtime result does **not** authorize production deployment.

After runtime PASS, a separate review must compare:

**candidate migration → local runtime evidence → remote schema → security impact → rollback/recovery plan → owner approval**

Only then can a production implementation proposal be prepared.

## 7. Current disposition

**SEC-150 cannot honestly be marked PASS yet.**

It is a controlled execution gate awaiting the missing reproducible local baseline.

No workaround should be substituted for runtime evidence.

## 8. Next action when Windows/Docker becomes available

The first command sequence should be prepared around:

`supabase init`  
`supabase db pull`  
review generated baseline  
`supabase start`  
`supabase db reset`  
baseline verification  
candidate readiness migration  
`supabase test db`

The linked remote project must never be reset. Supabase explicitly documents that `db reset --linked` destroys the linked remote database and should only be used with disposable development/staging projects.

**SEC-150 remains GATED — no production change authorized.**
