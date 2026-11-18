import type { DbClient, Enums, Tables } from "@pxf/db";

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
