# SEC-021B Review Note

Status: OPEN / REVIEW ONLY

Scope: Correct two confirmed schema-contract mismatches in `supabase/functions/create-cargodesk-user/index.ts`.

Changes:
1. `has_permission` RPC argument corrected from `permission_name` to `requested_permission`.
2. `roles` lookup corrected from `is_active` to `active`, with the corresponding `role.active` check.

Security boundary intentionally unchanged:
- `verify_jwt = false` remains unchanged because the function uses `withSupabase({ auth: "user" })` for in-function authentication/authorization.
- No Supabase schema, RLS, RBAC, storage, production data, or production deployment changes were made.
- Runtime verification against Supabase production has not been performed.

Review gate: inspect the diff and CI/source checks before any merge or production deployment.
