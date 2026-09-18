-- SEC-151Q: restore explicit Data API read grants for the existing read-only Shipments GUI.
-- Security model: authenticated SELECT only; existing RLS policies remain authoritative.
-- No anonymous access and no write privileges are introduced.

grant select on table
  logistics.bookings,
  logistics.shipment_legs,
  logistics.shipment_milestone,
  logistics.shipment_cargo,
  logistics.shipment_container,
  logistics.shipment_documents,
  logistics.tracking_event,
  logistics.shipment_exception,
  logistics.delivery,
  logistics.containers,
  logistics.documents
to authenticated;
