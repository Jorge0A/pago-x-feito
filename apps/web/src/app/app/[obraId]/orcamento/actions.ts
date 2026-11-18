"use server";

import { revalidatePath } from "next/cache";
import { budgetLineSchema, createBudgetLine, setBudgetLineStatus, updateBudgetLine, type BudgetLineStatus } from "@pxf/core";
import { createClient } from "@/lib/supabase/server";
import { int, num, runAction, str, type ActionResult } from "@/lib/action-result";

function parse(fd: FormData) {
  const budgeted = int(fd, "budgeted_centavos");
  if (budgeted === undefined) throw new Error("Informe o valor orçado");
  return budgetLineSchema.parse({
    supplier_id: str(fd, "supplier_id"),
    category: str(fd, "category") === "__other" ? str(fd, "category_other") : str(fd, "category"),
    description: str(fd, "description"),
    qty: num(fd, "qty"),
    unit: str(fd, "unit"),
    budgeted_centavos: budgeted,
    contracted_centavos: int(fd, "contracted_centavos"),
  });
}

export async function createBudgetLineAction(
  obraId: string,
  _prev: ActionResult | null,
  fd: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "Sessão expirada." };
    await createBudgetLine(supabase, obraId, data.user.id, parse(fd));
    revalidatePath(`/app/${obraId}`, "layout");
    return { ok: true };
  });
}

export async function updateBudgetLineAction(
  obraId: string,
  lineId: string,
  _prev: ActionResult | null,
  fd: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "Sessão expirada." };
    await updateBudgetLine(supabase, obraId, lineId, data.user.id, parse(fd));
    revalidatePath(`/app/${obraId}`, "layout");
    return { ok: true };
  });
}

export async function setLineStatusAction(
  obraId: string,
  lineId: string,
  status: BudgetLineStatus,
  _prev: ActionResult | null,
  fd?: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "Sessão expirada." };
    const alsoReject: string[] = [];
    const alsoApprove: string[] = [];
    if (fd) {
      for (const [k, v] of fd.entries()) {
        if (!k.startsWith("alt-") || typeof v !== "string") continue;
        if (v === "approve") alsoApprove.push(k.slice(4));
        if (v === "reject") alsoReject.push(k.slice(4));
      }
    }
    const reason = fd ? (str(fd, "reason")?.trim() || null) : null;
    await setBudgetLineStatus(supabase, obraId, lineId, data.user.id, status, { alsoReject, alsoApprove, reason });
    revalidatePath(`/app/${obraId}`, "layout");
    return { ok: true };
  });
}

/** Approves or rejects every ticked line in the "Em cotação" view. */
export async function bulkStatusAction(obraId: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "Sessão expirada." };
    const status = str(fd, "status");
    if (status !== "approved" && status !== "rejected") return { ok: false, error: "Ação inválida" };
    const ids = fd.getAll("ids").map(String).filter(Boolean);
    if (ids.length === 0) return { ok: false, error: "Marque ao menos uma linha" };
    for (const id of ids) await setBudgetLineStatus(supabase, obraId, id, data.user.id, status);
    revalidatePath(`/app/${obraId}`, "layout");
    return { ok: true, message: `${ids.length} ${ids.length === 1 ? "linha" : "linhas"} ${status === "approved" ? "aprovada" : "recusada"}${ids.length === 1 ? "" : "s"}` };
  });
}
