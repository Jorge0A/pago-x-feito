"use server";

import { revalidatePath } from "next/cache";
import { budgetLineSchema, createBudgetLine, updateBudgetLine } from "@pxf/core";
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
