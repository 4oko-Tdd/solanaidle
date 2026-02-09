import { randomUUID } from "crypto";
import db from "../db/database.js";
import type { RunEvent, RunEventType } from "@solanaidle/shared";

export function insertEvent(
  runId: string,
  eventType: RunEventType,
  data: Record<string, unknown> = {}
): void {
  db.prepare(
    "INSERT INTO run_events (id, run_id, event_type, data) VALUES (?, ?, ?, ?)"
  ).run(randomUUID(), runId, eventType, JSON.stringify(data));
}

export function getRunEvents(runId: string): RunEvent[] {
  const rows = db
    .prepare("SELECT * FROM run_events WHERE run_id = ? ORDER BY created_at ASC")
    .all(runId) as any[];
  return rows.map((row) => ({
    id: row.id,
    runId: row.run_id,
    eventType: row.event_type as RunEventType,
    data: JSON.parse(row.data || "{}"),
    createdAt: row.created_at,
  }));
}
