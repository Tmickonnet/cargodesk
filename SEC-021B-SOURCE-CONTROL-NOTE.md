# SEC-021B Source-Control Note

Status: OPEN — REVIEW ONLY

The `create-cargodesk-user` Edge Function is active in Supabase production but was not present on the `main` Git branch. This branch records the currently reviewed function source under version control using the corrected SEC-021B source.

Confirmed production contract alignment:
- `logistics.has_permission(text)` uses `requested_permission`.
- `logistics.roles` uses `active`.
- `logistics.parties` uses `is_active`.

No Supabase production deployment, schema change, RLS change, RBAC change, or data change is included here.
