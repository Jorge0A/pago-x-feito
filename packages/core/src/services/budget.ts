import { z } from "zod";
import type { DbClient, Tables } from "@pxf/db";
import { summarizeBySupplier, summarizeObra, type BudgetLineStatus, type ObraSummary, type SupplierSummary } from "../summary";
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
    .insert({ obra_id: obraId, ...input, status: input.contracted_centavos !== null ? "contracted" : "approved" })
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

export const BUDGET_LINE_TRANSITIONS: Record<BudgetLineStatus, BudgetLineStatus[]> = {
  quoted: ["approved", "rejected"],
  approved: ["contracted", "quoted", "rejected"],
  rejected: ["quoted"],
  contracted: ["approved"],
};

/**
 * Changes a line's status. Approving can also reject other quoted lines (alternatives for the same
 * item) in one go. Every change is logged with the previous status.
 */
export async function setBudgetLineStatus(
  db: DbClient,
  obraId: string,
  lineId: string,
  userId: string,
  status: BudgetLineStatus,
  opts: { alsoReject?: string[]; alsoApprove?: string[]; reason?: string | null } = {},
): Promise<void> {
  const { data: line, error: lErr } = await db.from("budget_lines").select("id, status, description").eq("id", lineId).eq("obra_id", obraId).single();
  if (lErr) throw new Error(`budget_lines.select failed: ${lErr.message}`);
  if (line.status !== status && !BUDGET_LINE_TRANSITIONS[line.status as BudgetLineStatus].includes(status)) {
    throw new Error(`Não dá para mudar de ${line.status} para ${status}`);
  }
  const now = new Date().toISOString();
  const { error } = await db
    .from("budget_lines")
    .update({ status, status_changed_at: now, rejection_reason: status === "rejected" ? (opts.reason ?? null) : null })
    .eq("id", lineId)
    .eq("obra_id", obraId);
  if (error) throw new Error(`budget_lines.update failed: ${error.message}`);
  await logEvent(db, {
    obra_id: obraId,
    actor_id: userId,
    type: "budget_line.status_changed",
    payload: { budget_line_id: lineId, from: line.status, to: status, reason: opts.reason ?? null, description: line.description },
  });

  const alsoApprove = (opts.alsoApprove ?? []).filter((id) => id !== lineId);
  if (status === "approved" && alsoApprove.length > 0) {
    const { data: approved, error: aErr } = await db
      .from("budget_lines")
      .update({ status: "approved", status_changed_at: now, rejection_reason: null })
      .in("id", alsoApprove)
      .eq("obra_id", obraId)
      .eq("status", "quoted")
      .select("id, description");
    if (aErr) throw new Error(`budget_lines.update failed: ${aErr.message}`);
    for (const a of approved ?? []) {
      await logEvent(db, {
        obra_id: obraId,
        actor_id: userId,
        type: "budget_line.status_changed",
        payload: { budget_line_id: a.id, from: "quoted", to: "approved", description: a.description },
      });
    }
  }

  const others = (opts.alsoReject ?? []).filter((id) => id !== lineId && !alsoApprove.includes(id));
  if (status === "approved" && others.length > 0) {
    const { data: rejected, error: rErr } = await db
      .from("budget_lines")
      .update({ status: "rejected", status_changed_at: now, rejection_reason: "Outra cotação aprovada" })
      .in("id", others)
      .eq("obra_id", obraId)
      .eq("status", "quoted")
      .select("id, description");
    if (rErr) throw new Error(`budget_lines.update failed: ${rErr.message}`);
    for (const r of rejected ?? []) {
      await logEvent(db, {
        obra_id: obraId,
        actor_id: userId,
        type: "budget_line.status_changed",
        payload: { budget_line_id: r.id, from: "quoted", to: "rejected", reason: "Outra cotação aprovada", approved_line_id: lineId, description: r.description },
      });
    }
  }
}

export interface ObraDashboard {
  summary: ObraSummary;
  bySupplier: SupplierSummary[];
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
    db.from("suppliers").select("id, name").eq("obra_id", obraId),
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
  if (suppliers.error) throw new Error(suppliers.error.message);
  if (installments.error) throw new Error(installments.error.message);
  const names = new Map((suppliers.data ?? []).map((s) => [s.id, s.name] as const));

  return {
    summary: summarizeObra(lines, payments.data ?? []),
    bySupplier: summarizeBySupplier(lines, payments.data ?? [], names),
    lines,
    suppliersCount: suppliers.data?.length ?? 0,
    pendingNfCount: pendingNf.count ?? 0,
    upcomingInstallments: (installments.data ?? []) as unknown as ObraDashboard["upcomingInstallments"],
  };
}
