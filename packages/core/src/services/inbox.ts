import type { DbClient, Enums, Tables } from "@pxf/db";
import { logEvent } from "./events";

export type InboxItemWithDocument = Tables<"inbox_items"> & { document: Tables<"documents"> | null };

export async function createInboxItem(
  db: DbClient,
  input: { obra_id: string; channel?: Enums<"inbox_channel">; document_id?: string | null; raw_text?: string | null; created_by: string },
): Promise<Tables<"inbox_items">> {
  const { data, error } = await db
    .from("inbox_items")
    .insert({
      obra_id: input.obra_id,
      channel: input.channel ?? "upload",
      document_id: input.document_id ?? null,
      raw_text: input.raw_text ?? null,
      status: "received",
      created_by: input.created_by,
    })
    .select("*")
    .single();
  if (error) throw new Error(`inbox_items.insert failed: ${error.message}`);
  await logEvent(db, {
    obra_id: input.obra_id,
    actor_id: input.created_by,
    type: "inbox.received",
    payload: { inbox_item_id: data.id, channel: data.channel },
    source_document_id: input.document_id ?? null,
  });
  return data;
}

export async function listInboxItems(db: DbClient, obraId: string, opts: { includeClosed?: boolean } = {}): Promise<InboxItemWithDocument[]> {
  let q = db
    .from("inbox_items")
    .select("*, document:documents(*)")
    .eq("obra_id", obraId)
    .order("created_at", { ascending: false });
  if (!opts.includeClosed) q = q.in("status", ["received", "extracting", "proposed", "failed"]);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as InboxItemWithDocument[];
}

export async function getInboxItem(db: DbClient, id: string): Promise<InboxItemWithDocument | null> {
  const { data, error } = await db.from("inbox_items").select("*, document:documents(*)").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as InboxItemWithDocument) ?? null;
}

export async function setInboxStatus(
  db: DbClient,
  id: string,
  patch: { status: Enums<"inbox_status">; proposal?: unknown; confidence?: number | null; error?: string | null },
) {
  const { error } = await db
    .from("inbox_items")
    .update({
      status: patch.status,
      ...(patch.proposal !== undefined ? { proposal: patch.proposal as never } : {}),
      ...(patch.confidence !== undefined ? { confidence: patch.confidence } : {}),
      ...(patch.error !== undefined ? { error: patch.error } : {}),
    })
    .eq("id", id);
  if (error) throw new Error(`inbox_items.update failed: ${error.message}`);
}

export async function discardInboxItem(db: DbClient, obraId: string, id: string, userId: string) {
  await setInboxStatus(db, id, { status: "discarded" });
  await logEvent(db, { obra_id: obraId, actor_id: userId, type: "inbox.discarded", payload: { inbox_item_id: id } });
}

export async function countOpenInboxItems(db: DbClient, obraId: string): Promise<number> {
  const { count, error } = await db
    .from("inbox_items")
    .select("id", { count: "exact", head: true })
    .eq("obra_id", obraId)
    .in("status", ["received", "proposed", "failed"]);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
