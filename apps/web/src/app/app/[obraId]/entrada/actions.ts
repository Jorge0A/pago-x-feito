"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  commitSpreadsheetImport,
  createInboxItem,
  discardInboxItem,
  downloadDocument,
  getInboxItem,
  isSpreadsheet,
  logAiCall,
  logEvent,
  registerDocument,
  setInboxStatus,
  type ConfirmedImportRow,
} from "@pxf/core";
import { createServiceClient } from "@pxf/db";
import {
  analyzeSpreadsheet,
  IMPORT_FIELDS,
  suggestMappingWithAI,
  type ColumnMapping,
  type ImportField,
  type SpreadsheetAnalysis,
} from "@pxf/extractors";
import { createClient } from "@/lib/supabase/server";
import { publicEnv, serverEnv } from "@/lib/env";
import { runAction, str, type ActionResult } from "@/lib/action-result";

export interface SpreadsheetProposal {
  type: "spreadsheet";
  analysis: SpreadsheetAnalysis;
  selectedSheet: string;
}

async function userAndDb() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sessão expirada.");
  return { supabase, user: data.user };
}

async function analyzeAndStore(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemId: string,
  storagePath: string,
  overrides?: Record<string, { headerRowIndex?: number; mapping?: ColumnMapping }>,
  selectedSheet?: string,
) {
  await setInboxStatus(supabase, itemId, { status: "extracting" });
  try {
    const buf = await downloadDocument(supabase, storagePath);
    const analysis = analyzeSpreadsheet(buf, { overrides });
    const sheet = selectedSheet && analysis.sheets.some((s) => s.sheetName === selectedSheet)
      ? selectedSheet
      : analysis.sheets[analysis.bestSheetIndex]?.sheetName ?? "";
    const chosen = analysis.sheets.find((s) => s.sheetName === sheet);
    const proposal: SpreadsheetProposal = { type: "spreadsheet", analysis, selectedSheet: sheet };
    await setInboxStatus(supabase, itemId, { status: "proposed", proposal, confidence: chosen?.confidence ?? 0, error: null });
  } catch (e) {
    await setInboxStatus(supabase, itemId, { status: "failed", error: e instanceof Error ? e.message : "Falha ao ler a planilha" });
    throw e;
  }
}

/** Called by the upload button after the file is in storage. Creates the document and inbox item. */
export async function registerUploadAction(
  obraId: string,
  file: { storagePath: string; name: string; mime: string | null; size: number },
): Promise<{ ok: true; itemId: string; spreadsheet: boolean } | { ok: false; error: string }> {
  try {
    const { supabase, user } = await userAndDb();
    const doc = await registerDocument(supabase, {
      obra_id: obraId,
      storage_path: file.storagePath,
      original_name: file.name,
      mime_type: file.mime,
      size_bytes: file.size,
      uploaded_by: user.id,
    });
    const item = await createInboxItem(supabase, { obra_id: obraId, channel: "upload", document_id: doc.id, created_by: user.id });
    const spreadsheet = isSpreadsheet(file.mime, file.name);
    if (spreadsheet) {
      try {
        await analyzeAndStore(supabase, item.id, file.storagePath);
      } catch (e) {
        console.error(e);
      }
    }
    revalidatePath(`/app/${obraId}`, "layout");
    return { ok: true, itemId: item.id, spreadsheet };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao registrar o arquivo" };
  }
}

export async function discardAction(obraId: string, itemId: string): Promise<void> {
  const { supabase, user } = await userAndDb();
  await discardInboxItem(supabase, obraId, itemId, user.id);
  revalidatePath(`/app/${obraId}`, "layout");
  redirect(`/app/${obraId}/entrada`);
}

/** Re-runs the analysis with the mapping and header row the user chose in the preview. */
export async function remapAction(obraId: string, itemId: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await userAndDb();
    const item = await getInboxItem(supabase, itemId);
    if (!item?.document) return { ok: false, error: "Item não encontrado" };
    const sheet = str(fd, "sheet") ?? "";
    const headerRowIndex = Math.max(0, Number(str(fd, "header_row") ?? "1") - 1);
    const mapping: ColumnMapping = {};
    for (const [k, v] of fd.entries()) {
      if (!k.startsWith("map-") || typeof v !== "string" || !v) continue;
      const col = Number(k.slice(4));
      if ((IMPORT_FIELDS as readonly string[]).includes(v) && mapping[v as ImportField] === undefined) mapping[v as ImportField] = col;
    }
    await analyzeAndStore(supabase, itemId, item.document.storage_path, { [sheet]: { headerRowIndex, mapping } }, sheet);
    revalidatePath(`/app/${obraId}/entrada/${itemId}`);
    return { ok: true, message: "Mapeamento atualizado" };
  });
}

export async function selectSheetAction(obraId: string, itemId: string, sheet: string): Promise<void> {
  const { supabase } = await userAndDb();
  const item = await getInboxItem(supabase, itemId);
  if (!item?.document) return;
  await analyzeAndStore(supabase, itemId, item.document.storage_path, undefined, sheet);
  revalidatePath(`/app/${obraId}/entrada/${itemId}`);
}

/** Asks the fast model for a mapping when the heuristic is unsure. Usage is logged to ai_calls. */
export async function aiMappingAction(obraId: string, itemId: string, _prev: ActionResult | null): Promise<ActionResult> {
  return runAction(async () => {
    const { supabase } = await userAndDb();
    const item = await getInboxItem(supabase, itemId);
    const proposal = item?.proposal as SpreadsheetProposal | null;
    if (!item?.document || !proposal || proposal.type !== "spreadsheet") return { ok: false, error: "Nada para mapear" };
    const sheet = proposal.analysis.sheets.find((s) => s.sheetName === proposal.selectedSheet);
    if (!sheet) return { ok: false, error: "Aba não encontrada" };
    if (!serverEnv().anthropicApiKey) return { ok: false, error: "Chave da Anthropic não configurada" };
    const service = createServiceClient(publicEnv.supabaseUrl, serverEnv().supabaseServiceRoleKey);
    const { mapping, notes } = await suggestMappingWithAI(sheet.headers, sheet.sampleRows, {
      sink: (u) => logAiCall(service, { obra_id: obraId, inbox_item_id: itemId, ...u }),
    });
    if (Object.keys(mapping).length === 0) return { ok: false, error: notes || "A IA não encontrou colunas conhecidas" };
    await analyzeAndStore(supabase, itemId, item.document.storage_path, { [sheet.sheetName]: { headerRowIndex: sheet.headerRowIndex, mapping } }, sheet.sheetName);
    revalidatePath(`/app/${obraId}/entrada/${itemId}`);
    return { ok: true, message: "Mapeamento sugerido pela IA aplicado" };
  });
}

/** Writes the rows the user ticked. Reads the proposal from the database, never from the client. */
export async function confirmImportAction(obraId: string, itemId: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let done = false;
  const result = await runAction(async () => {
    const { supabase, user } = await userAndDb();
    const item = await getInboxItem(supabase, itemId);
    const proposal = item?.proposal as SpreadsheetProposal | null;
    if (!item || !proposal || proposal.type !== "spreadsheet") return { ok: false, error: "Proposta não encontrada" };
    if (item.status !== "proposed") return { ok: false, error: "Este item já foi processado" };
    const sheet = proposal.analysis.sheets.find((s) => s.sheetName === proposal.selectedSheet);
    if (!sheet) return { ok: false, error: "Aba não encontrada" };
    const selected = new Set(fd.getAll("rows").map(String));
    const contracted = str(fd, "contracted") === "on";
    const defaultCategory = str(fd, "default_category") ?? "";
    const rows: ConfirmedImportRow[] = sheet.rows
      .filter((_, i) => selected.has(String(i)))
      .map((r) => ({
        supplier: r.supplier,
        category: r.category,
        description: r.description,
        qty: r.qty,
        unit: r.unit,
        total_centavos: r.total_centavos,
        contracted,
        cnpj: r.cnpj,
        contact: r.contact,
        phone: r.phone,
        email: r.email,
        notes: r.notes,
      }));
    if (rows.length === 0) return { ok: false, error: "Selecione ao menos uma linha" };
    const res = await commitSpreadsheetImport(supabase, {
      obraId,
      userId: user.id,
      inboxItemId: itemId,
      documentId: item.document_id,
      rows,
      defaultCategory,
    });
    await logEvent(supabase, { obra_id: obraId, actor_id: user.id, type: "inbox.confirmed", payload: { inbox_item_id: itemId, ...res } });
    done = true;
    return { ok: true };
  });
  if (done) {
    revalidatePath(`/app/${obraId}`, "layout");
    redirect(`/app/${obraId}/orcamento?importado=1`);
  }
  return result;
}
