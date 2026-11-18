import type { DbClient } from "@pxf/db";
import { logEvent } from "./events";
import { setInboxStatus } from "./inbox";

/** A row the user confirmed in the preview. Shape mirrors the extractor's ImportRow. */
export interface ConfirmedImportRow {
  supplier: string | null;
  category: string | null;
  description: string;
  qty: number | null;
  unit: string | null;
  total_centavos: number | null;
  contracted: boolean;
  cnpj: string | null;
  contact: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

export interface ImportResult {
  suppliersCreated: number;
  suppliersReused: number;
  linesCreated: number;
  totalCentavos: number;
}

function key(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(ltda|me|eireli|s\/a|sa|epp)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Writes confirmed rows as suppliers and budget lines. Suppliers are matched by normalized name
 * against the obra's existing suppliers; new ones get the row's contact data.
 * Everything is attributed to the source document and logged.
 */
export async function commitSpreadsheetImport(
  db: DbClient,
  params: { obraId: string; userId: string; inboxItemId: string; documentId: string | null; rows: ConfirmedImportRow[]; defaultCategory?: string },
): Promise<ImportResult> {
  const { obraId, userId, inboxItemId, documentId } = params;
  const defaultCategory = params.defaultCategory?.trim() || "Outros";

  const { data: existing, error: sErr } = await db.from("suppliers").select("id, name").eq("obra_id", obraId);
  if (sErr) throw new Error(sErr.message);
  const byKey = new Map<string, string>();
  for (const s of existing ?? []) byKey.set(key(s.name), s.id);

  let suppliersCreated = 0;
  let suppliersReused = 0;
  const seenInFile = new Set<string>();

  for (const r of params.rows) {
    if (!r.supplier) continue;
    const k = key(r.supplier);
    if (!k) continue;
    if (byKey.has(k)) {
      if (!seenInFile.has(k)) suppliersReused++;
      seenInFile.add(k);
      continue;
    }
    const { data, error } = await db
      .from("suppliers")
      .insert({
        obra_id: obraId,
        name: r.supplier.trim(),
        category: r.category?.trim() || null,
        cnpj: r.cnpj || null,
        contact_name: r.contact || null,
        phone: r.phone || null,
        whatsapp_number: r.phone || null,
        email: r.email || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(`suppliers.insert failed: ${error.message}`);
    byKey.set(k, data.id);
    seenInFile.add(k);
    suppliersCreated++;
  }

  const lines = params.rows.map((r, i) => ({
    obra_id: obraId,
    supplier_id: r.supplier ? (byKey.get(key(r.supplier)) ?? null) : null,
    category: r.category?.trim() || defaultCategory,
    description: r.description.trim(),
    qty: r.qty,
    unit: r.unit,
    budgeted_centavos: r.total_centavos ?? 0,
    contracted_centavos: r.contracted ? (r.total_centavos ?? 0) : null,
    source_document_id: documentId,
    sort_order: i + 1,
  }));

  let linesCreated = 0;
  for (let i = 0; i < lines.length; i += 200) {
    const chunk = lines.slice(i, i + 200);
    const { error } = await db.from("budget_lines").insert(chunk);
    if (error) throw new Error(`budget_lines.insert failed: ${error.message}`);
    linesCreated += chunk.length;
  }

  const totalCentavos = lines.reduce((a, l) => a + l.budgeted_centavos, 0);
  await setInboxStatus(db, inboxItemId, { status: "confirmed" });
  await logEvent(db, {
    obra_id: obraId,
    actor_id: userId,
    type: "budget.imported",
    payload: { inbox_item_id: inboxItemId, suppliersCreated, suppliersReused, linesCreated, totalCentavos },
    source_document_id: documentId,
  });
  return { suppliersCreated, suppliersReused, linesCreated, totalCentavos };
}

export async function logAiCall(
  db: DbClient,
  call: {
    obra_id: string | null;
    inbox_item_id?: string | null;
    purpose: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_write_tokens: number;
    cost_usd_micros: number;
    duration_ms: number;
    ok: boolean;
  },
) {
  const { error } = await db.from("ai_calls").insert({ ...call, inbox_item_id: call.inbox_item_id ?? null });
  if (error) throw new Error(`ai_calls.insert failed: ${error.message}`);
}
