import type { DbClient } from "@pxf/db";

export interface EventInput {
  obra_id: string;
  type: string;
  payload?: Record<string, unknown>;
  actor_id?: string | null;
  source_document_id?: string | null;
}

/** Appends to the event log. Events are append-only by database trigger. */
export async function logEvent(db: DbClient, event: EventInput): Promise<void> {
  const { error } = await db.from("events").insert({
    obra_id: event.obra_id,
    type: event.type,
    payload: (event.payload ?? {}) as never,
    actor_id: event.actor_id ?? null,
    source_document_id: event.source_document_id ?? null,
  });
  if (error) throw new Error(`events.insert failed: ${error.message}`);
}

export async function listEvents(db: DbClient, obraId: string, limit = 100) {
  const { data, error } = await db
    .from("events")
    .select("*")
    .eq("obra_id", obraId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}
