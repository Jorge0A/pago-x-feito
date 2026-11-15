import { z } from "zod";
import type { DbClient, Tables } from "@pxf/db";
import { summarizeObra, type ObraSummary } from "../summary";
import { logEvent } from "./events";

const centavos = z.number().int().min(0);

export const budgetLineSchema = z.object({
  supplier_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined))
    .transform((v) => v ?? null),
  category: z.string().trim().min(1, "Informe a categoria").max(80),
  description: z.string().trim().min(1, "Descreva o item").max(300),
  qty: z.number().positive().optional().nullable().transform((v) => v ?? null),
  unit: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  budgeted_centavos: centavos,
  contracted_centavos: centavos.optional().nullable().transform((v) => v ?? null),
});
export type BudgetLineInput = z.infer<typeof budgetLineSchema>;

export const BUDGET_CATEGORIES = [
  "Projeto",
  "Demolição",
  "Alvenaria",
  "Elétrica",
  "Hidráulica",
  "Gesso e drywall",
  "Pisos e revestimentos",
  "Pintura",
  "Marcenaria",
  "Esquadrias e vidros",
  "Ar-condicionado",
  "Louças e metais",
  "Iluminação",
  "Limpeza",
  "Taxas e documentação",
  "Outros",
] as const;

export type BudgetLineWithSupplier = Tables<"budget_lines"> & {
  supplier: Pick<Tables<"suppliers">, "id" | "name"> | null;
};

export async function listBudgetLines(db: DbClient, obraId: string): Promise<BudgetLineWithSupplier[]> {
  const { data, error } = await db
    .from("budget_lines")
    .select("*, supplier:suppliers(id, name)")
    .eq("obra_id", obraId)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as BudgetLineWithSupplier[];
}

export async function createBudgetLine(db: DbClient, obraId: string, userId: string, input: BudgetLineInput) {
  const { data, error } = await db
    .from("budget_lines")
    .insert({ obra_id: obraId, ...input })
    .select("id")
    .single();
  if (error) throw new Error(`budget_lines.insert failed: ${error.message}`);
  await logEvent(db, {
    obra_id: obraId,
    actor_id: userId,
    type: "budget_line.created",
    payload: { budget_line_id: data.id, ...input },
  });
  return data.id;
}

export async function updateBudgetLine(
  db: DbClient,
  obraId: string,
  lineId: string,
  userId: string,
  input: BudgetLineInput,
) {
  const { error } = await db.from("budget_lines").update(input).eq("id", lineId).eq("obra_id", obraId);
  if (error) throw new Error(`budget_lines.update failed: ${error.message}`);
  await logEvent(db, {
    obra_id: obraId,
    actor_id: userId,
    type: "budget_line.updated",
    payload: { budget_line_id: lineId, ...input },
  });
}

export interface ObraDashboard {
  summary: ObraSummary;
  lines: BudgetLineWithSupplier[];
  suppliersCount: number;
  pendingNfCount: number;
  upcomingInstallments: Array<
    Tables<"installments"> & { contract: { supplier: Pick<Tables<"suppliers">, "id" | "name"> | null } | null }
  >;
}

export async function getObraDashboard(db: DbClient, obraId: string): Promise<ObraDashboard> {
  const [lines, payments, suppliers, pendingNf, installments] = await Promise.all([
    listBudgetLines(db, obraId),
    db.from("payments").select("id, supplier_id, budget_line_id, amount_centavos").eq("obra_id", obraId),
    db.from("suppliers").select("id", { count: "exact", head: true }).eq("obra_id", obraId),
    db
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("obra_id", obraId)
      .eq("nf_status", "pending"),
    db
      .from("installments")
      .select("*, contract:contracts(supplier:suppliers(id, name))")
      .eq("obra_id", obraId)
      .eq("status", "pending")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(5),
  ]);
  if (payments.error) throw new Error(payments.error.message);
  if (installments.error) throw new Error(installments.error.message);

  return {
    summary: summarizeObra(lines, payments.data ?? []),
    lines,
    suppliersCount: suppliers.count ?? 0,
    pendingNfCount: pendingNf.count ?? 0,
    upcomingInstallments: (installments.data ?? []) as unknown as ObraDashboard["upcomingInstallments"],
  };
}
