import { supabase } from "./supabase";

const SHIPMENT_COLUMNS = [
  "shipment_id","shipment_number","customer_id","supplier_id","shipment_type_id",
  "shipment_status_id","primary_transport_mode_id","incoterm_id","origin_location_id",
  "destination_location_id","origin_country_id","destination_country_id",
  "planned_departure_date","planned_arrival_date","actual_departure_date",
  "actual_arrival_date","cargo_ready_date","special_instructions","created_at","updated_at"
].join(",");

const LEG_COLUMNS = [
  "shipment_leg_id","shipment_id","leg_sequence","transport_mode_id","carrier_party_id",
  "shipping_line_id","vessel_id","origin_location_id","destination_location_id",
  "departure_planned_at","departure_actual_at","arrival_planned_at","arrival_actual_at",
  "voyage_number","leg_status","notes","created_at","updated_at"
].join(",");

const EVENT_COLUMNS = [
  "tracking_event_id","shipment_id","shipment_leg_id","container_id","tracking_event_type_id",
  "event_reference","event_datetime","estimated_datetime","actual_datetime","location_id",
  "port_id","vessel_id","source_system","source_reference","status_text","remarks",
  "created_at","updated_at"
].join(",");

const MILESTONE_COLUMNS = [
  "shipment_milestone_id","shipment_id","milestone_code","milestone_name","sequence_number",
  "planned_date","estimated_date","actual_date","completed","completed_by","remarks",
  "created_at","updated_at"
].join(",");

export const normalizeShipmentRecord = (record) => ({ ...record });
export const normalizeShipmentLeg = (record) => ({ ...record });
export const normalizeTrackingEvent = (record) => ({ ...record });
export const normalizeShipmentMilestone = (record) => ({ ...record });

export const listShipments = async () => {
  const { data, error } = await supabase
    .from("shipments")
    .select(SHIPMENT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error };
  return { data: (data ?? []).map(normalizeShipmentRecord), error: null };
};

export const getShipmentTrackingData = async (shipmentId) => {
  if (!shipmentId) {
    return { shipment: null, legs: [], milestones: [], events: [], error: new Error("A shipment identifier is required.") };
  }

  const [shipmentResult, legsResult, milestonesResult, eventsResult] = await Promise.all([
    supabase.from("shipments").select(SHIPMENT_COLUMNS).eq("shipment_id", shipmentId).maybeSingle(),
    supabase.from("shipment_legs").select(LEG_COLUMNS).eq("shipment_id", shipmentId).order("leg_sequence", { ascending: true }),
    supabase.from("shipment_milestone").select(MILESTONE_COLUMNS).eq("shipment_id", shipmentId).order("sequence_number", { ascending: true }),
    supabase.from("tracking_event").select(EVENT_COLUMNS).eq("shipment_id", shipmentId)
      .order("event_datetime", { ascending: false, nullsFirst: false })
      .order("tracking_event_id", { ascending: false }),
  ]);

  return {
    shipment: shipmentResult.data ? normalizeShipmentRecord(shipmentResult.data) : null,
    legs: (legsResult.data ?? []).map(normalizeShipmentLeg),
    milestones: (milestonesResult.data ?? []).map(normalizeShipmentMilestone),
    events: (eventsResult.data ?? []).map(normalizeTrackingEvent),
    error: shipmentResult.error || legsResult.error || milestonesResult.error || eventsResult.error || null,
  };
};
