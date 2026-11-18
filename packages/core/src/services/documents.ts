import type { DbClient, Enums, Tables } from "@pxf/db";
import { logEvent } from "./events";

export const DOCUMENTS_BUCKET = "documents";

export interface RegisterDocumentInput {
  obra_id: string;
  storage_path: string;
  original_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  kind?: Enums<"document_kind">;
  uploaded_by: string;
}

const SPREADSHEET_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
]);

export function isSpreadsheet(mime: string | null, name: string): boolean {
  if (mime && SPREADSHEET_MIMES.has(mime)) return true;
  return /\.(xlsx|xls|xlsm|csv)$/i.test(name);
}

export function guessDocumentKind(mime: string | null, name: string): Enums<"document_kind"> {
  if (isSpreadsheet(mime, name)) return "budget";
  if (mime?.startsWith("image/")) return "photo";
  if (mime === "application/pdf" || /\.pdf$/i.test(name)) return "other";
  return "other";
}

/** Builds a storage path inside the obra folder. The first segment is what RLS checks. */
export function buildStoragePath(obraId: string, originalName: string, id: string): string {
  const safe = originalName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return `${obraId}/${id}-${safe}`;
}

export async function registerDocument(db: DbClient, input: RegisterDocumentInput): Promise<Tables<"documents">> {
  const { data, error } = await db
    .from("documents")
    .insert({
      obra_id: input.obra_id,
      storage_path: input.storage_path,
      original_name: input.original_name,
      mime_type: input.mime_type,
      size_bytes: input.size_bytes,
      kind: input.kind ?? guessDocumentKind(input.mime_type, input.original_name),
      uploaded_by: input.uploaded_by,
    })
    .select("*")
    .single();
  if (error) throw new Error(`documents.insert failed: ${error.message}`);
  return data;
}

export async function listDocuments(db: DbClient, obraId: string): Promise<Tables<"documents">[]> {
  const { data, error } = await db.from("documents").select("*").eq("obra_id", obraId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function getDocument(db: DbClient, id: string): Promise<Tables<"documents"> | null> {
  const { data, error } = await db.from("documents").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Short-lived signed URL for a private file. RLS on storage.objects still applies. */
export async function signedDocumentUrl(db: DbClient, storagePath: string, expiresInSeconds = 600): Promise<string> {
  const { data, error } = await db.storage.from(DOCUMENTS_BUCKET).createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw new Error(`signed url failed: ${error.message}`);
  return data.signedUrl;
}

export async function downloadDocument(db: DbClient, storagePath: string): Promise<ArrayBuffer> {
  const { data, error } = await db.storage.from(DOCUMENTS_BUCKET).download(storagePath);
  if (error) throw new Error(`download failed: ${error.message}`);
  return data.arrayBuffer();
}

/**
 * Deletes an uploaded file and its inbox items. Refused when a payment or contract uses it
 * (receipt, NF, contract PDF). Budget lines imported from it keep existing without the source link.
 */
export async function deleteDocument(db: DbClient, obraId: string, documentId: string, userId: string): Promise<void> {
  const { data: doc, error: dErr } = await db.from("documents").select("*").eq("id", documentId).eq("obra_id", obraId).single();
  if (dErr) throw new Error(`documents.select failed: ${dErr.message}`);
  const [receipts, nfs, contracts] = await Promise.all([
    db.from("payments").select("id", { count: "exact", head: true }).eq("receipt_document_id", documentId),
    db.from("payments").select("id", { count: "exact", head: true }).eq("nf_document_id", documentId),
    db.from("contracts").select("id", { count: "exact", head: true }).eq("document_id", documentId),
  ]);
  if ((receipts.count ?? 0) + (nfs.count ?? 0) > 0) throw new Error("Este arquivo é comprovante ou nota de um pagamento e não pode ser excluído.");
  if ((contracts.count ?? 0) > 0) throw new Error("Este arquivo é o contrato de um fornecedor e não pode ser excluído.");

  const { error: iErr } = await db.from("inbox_items").delete().eq("document_id", documentId);
  if (iErr) throw new Error(`inbox_items.delete failed: ${iErr.message}`);
  const { error: sErr } = await db.storage.from(DOCUMENTS_BUCKET).remove([doc.storage_path]);
  if (sErr) throw new Error(`storage remove failed: ${sErr.message}`);
  const { error } = await db.from("documents").delete().eq("id", documentId).eq("obra_id", obraId);
  if (error) throw new Error(`documents.delete failed: ${error.message}`);
  await logEvent(db, {
    obra_id: obraId,
    actor_id: userId,
    type: "document.deleted",
    payload: { document_id: documentId, original_name: doc.original_name, kind: doc.kind, size_bytes: doc.size_bytes },
  });
}
