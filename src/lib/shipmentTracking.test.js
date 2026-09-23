import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeShipmentRecord,
  normalizeShipmentLeg,
  normalizeTrackingEvent,
  normalizeShipmentMilestone,
} from "./shipmentTracking.js";

test("shipment shaping preserves planned and actual values independently", () => {
  const source = {
    shipment_id: "s-1", shipment_number: "CDG-SHP-2026-0001", shipment_status_id: "delivered",
    planned_departure_date: "2026-08-01", actual_departure_date: null,
    planned_arrival_date: "2026-08-20", actual_arrival_date: null,
  };
  const shaped = normalizeShipmentRecord(source);
  assert.deepEqual(shaped, source);
  assert.equal(shaped.actual_departure_date, null);
  assert.equal(shaped.actual_arrival_date, null);
  assert.equal(shaped.shipment_status_id, "delivered");
});

test("leg shaping does not infer or rewrite source status", () => {
  const source = { shipment_leg_id: "leg-1", shipment_id: "s-1", leg_sequence: 1, leg_status: "PLANNED", departure_planned_at: "2026-08-01T08:00:00Z", departure_actual_at: null };
  assert.deepEqual(normalizeShipmentLeg(source), source);
});

test("tracking-event shaping preserves null actual and recorded values", () => {
  const source = { tracking_event_id: "event-1", shipment_id: "s-1", event_datetime: "2026-08-02T10:00:00Z", estimated_datetime: "2026-08-03T10:00:00Z", actual_datetime: null, status_text: "PLANNED", remarks: null };
  assert.deepEqual(normalizeTrackingEvent(source), source);
  assert.equal(normalizeTrackingEvent(source).actual_datetime, null);
});

test("milestone shaping preserves sequence, completion, and dates", () => {
  const source = { shipment_milestone_id: "m-1", shipment_id: "s-1", milestone_code: "DEPARTED", milestone_name: "Departed", sequence_number: 2, planned_date: "2026-08-02", estimated_date: null, actual_date: null, completed: false };
  assert.deepEqual(normalizeShipmentMilestone(source), source);
  assert.equal(normalizeShipmentMilestone(source).sequence_number, 2);
});

test("normalizers do not fabricate missing fields", () => {
  const source = { shipment_id: "s-1", shipment_number: "S-1" };
  assert.deepEqual(Object.keys(normalizeShipmentRecord(source)).sort(), Object.keys(source).sort());
});
