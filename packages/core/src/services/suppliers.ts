import { z } from "zod";
import type { DbClient, Tables } from "@pxf/db";
import { cleanCNPJ, isValidCNPJ } from "../cnpj";
import { logEvent } from "./events";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

export const supplierSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do fornecedor").max(160),
  category: optionalText(80),
  cnpj: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? cleanCNPJ(v) : null))
    .refine((v) => v === null || isValidCNPJ(v), "CNPJ inválido"),
  contact_name: optionalText(120),
  phone: optionalText(40),
  whatsapp_number: optionalText(40),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null))
    .refine((v) => v === null || z.email().safeParse(v).success, "E-mail inválido"),
  notes: optionalText(2000),
});
export type SupplierInput = z.infer<typeof supplierSchema>;

export const SUPPLIER_CATEGORIES = [
  "Projeto",
  "Marcenaria",
  "Elétrica",
  "Hidráulica",
  "Pintura",
  "Pisos e revestimentos",
  "Gesso e drywall",
  "Ar-condicionado",
  "Vidros e esquadrias",
  "Mão de obra geral",
  "Materiais",
  "Outros",
] as const;

export async function listSuppliers(db: DbClient, obraId: string): Promise<Tables<"suppliers">[]> {
  const { data, error } = await db
    .from("suppliers")
    .select("*")
    .eq("obra_id", obraId)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function createSupplier(db: DbClient, obraId: string, userId: string, input: SupplierInput) {
  const { data, error } = await db
    .from("suppliers")
    .insert({ obra_id: obraId, ...input })
    .select("id, name")
    .single();
  if (error) throw new Error(`suppliers.insert failed: ${error.message}`);
  await logEvent(db, {
    obra_id: obraId,
    actor_id: userId,
    type: "supplier.created",
    payload: { supplier_id: data.id, name: data.name },
  });
  return data.id;
}

export async function updateSupplier(
  db: DbClient,
  obraId: string,
  supplierId: string,
  userId: string,
  input: SupplierInput,
) {
  const { error } = await db.from("suppliers").update(input).eq("id", supplierId).eq("obra_id", obraId);
  if (error) throw new Error(`suppliers.update failed: ${error.message}`);
  await logEvent(db, {
    obra_id: obraId,
    actor_id: userId,
    type: "supplier.updated",
    payload: { supplier_id: supplierId, name: input.name },
  });
}

/**
 * Deletes a supplier. Refused when payments or contracts reference it. Budget lines that pointed
 * to it keep existing without a supplier (the caller gets the count to tell the user).
 */
export async function deleteSupplier(db: DbClient, obraId: string, supplierId: string, userId: string): Promise<{ detachedLines: number }> {
  const [payments, contracts, lines, supplier] = await Promise.all([
    db.from("payments").select("id", { count: "exact", head: true }).eq("supplier_id", supplierId),
    db.from("contracts").select("id", { count: "exact", head: true }).eq("supplier_id", supplierId),
    db.from("budget_lines").select("id", { count: "exact", head: true }).eq("supplier_id", supplierId),
    db.from("suppliers").select("*").eq("id", supplierId).eq("obra_id", obraId).single(),
  ]);
  if (supplier.error) throw new Error(`suppliers.select failed: ${supplier.error.message}`);
  if ((payments.count ?? 0) > 0) throw new Error("Este fornecedor tem pagamentos registrados e não pode ser excluído.");
  if ((contracts.count ?? 0) > 0) throw new Error("Este fornecedor tem contrato cadastrado e não pode ser excluído.");
  const { error } = await db.from("suppliers").delete().eq("id", supplierId).eq("obra_id", obraId);
  if (error) throw new Error(`suppliers.delete failed: ${error.message}`);
  await logEvent(db, {
    obra_id: obraId,
    actor_id: userId,
    type: "supplier.deleted",
    payload: { supplier_id: supplierId, supplier: supplier.data, detached_lines: lines.count ?? 0 },
  });
  return { detachedLines: lines.count ?? 0 };
}
