# SEC-019 Authorization Integration Checklist

Status: IMPLEMENTED on `security/sec-019-authorization-adapter`.

## Scope

- Frontend authorization delegates to existing Supabase security functions.
- Navigation is permission-aware and fails closed.
- Authorization state reloads when an authenticated session becomes available.
- Sensitive database authorization remains enforced by existing RLS/RBAC.

## Permission mapping

| UI module | Required permission |
|---|---|
| Dashboard | `OPERATIONS_VIEW` |
| Shipments | `SHIPMENT_VIEW` |
| Documentation | `DOCUMENT_VIEW` |
| Containers | `CARGO_VIEW` |
| Warehouse | `OPERATIONS_VIEW` |
| Shipping | `BOOKING_VIEW` |
| Delivery | `DELIVERY_VIEW` |
| Reports | `OPERATIONS_VIEW` |
| Audit Log | `AUDIT_VIEW` |
| Settings | `SYSTEM_CONFIG` |

These codes were verified against the existing active CargoDesk permissions. No permission records were changed.

## Safety controls

- No production database schema changes.
- No table deletions, renames, or relationship changes.
- No RLS/RBAC policy changes.
- No secrets or privileged credentials added.
- `main` remains unchanged.
- No merge or production deployment performed by this change.
