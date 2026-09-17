# SEC-149A — Authoritative Remote Schema Inventory Snapshot

**Source:** CargoDesk Global Supabase project  
**Schema:** logistics  
**Purpose:** Read-only baseline evidence for controlled local reproduction  
**Status:** Inventory only — NOT a migration and NOT deployable

## Verified counts

| Object | Count |
|---|---:|
| Base tables | 90 |
| Primary keys | 90 |
| Foreign keys | 226 |
| UNIQUE constraints | 121 |
| CHECK constraints | 8 |
| RLS policies | 269 |
| Tables with RLS enabled | 90/90 |
| Indexes | 211 |
| Functions | 9 |
| SECURITY DEFINER functions | 9 |
| Readiness tables | 0 |

## Readiness safety conclusion

The remote production foundation remains unchanged and contains no readiness tables.

The SEC-147 candidate migration therefore remains blocked from production and from execution against an unverified local baseline.

The next required baseline action is to use the Supabase CLI supported db pull workflow to capture the existing remote schema into a version-controlled migration, then review the generated SQL before local reset/testing. Supabase documents this workflow for existing projects and explicitly recommends reviewing generated migrations before committing them.

## Production safety

No DDL, DML, RLS, RBAC, permission, audit, or readiness change was performed by this inventory.

## Next gate

Capture and review the remote schema baseline in a controlled local environment, then reproduce the 90-table foundation before SEC-147 execution.
