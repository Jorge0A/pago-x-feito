"use server";

import { revalidatePath } from "next/cache";
import { createSupplier, supplierSchema, updateSupplier } from "@pxf/core";
import { createClient } from "@/lib/supabase/server";
import { runAction, str, type ActionResult } from "@/lib/action-result";

function parse(fd: FormData) {
  return supplierSchema.parse({
    name: str(fd, "name"),
    category: str(fd, "category"),
    cnpj: str(fd, "cnpj"),
    contact_name: str(fd, "contact_name"),
    phone: str(fd, "phone"),
    whatsapp_number: str(fd, "whatsapp_number"),
    email: str(fd, "email"),
    notes: str(fd, "notes"),
  });
}

export async function createSupplierAction(
  obraId: string,
  _prev: ActionResult | null,
  fd: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "Sessão expirada." };
    await createSupplier(supabase, obraId, data.user.id, parse(fd));
    revalidatePath(`/app/${obraId}`, "layout");
    return { ok: true };
  });
}

export async function updateSupplierAction(
  obraId: string,
  supplierId: string,
  _prev: ActionResult | null,
  fd: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "Sessão expirada." };
    await updateSupplier(supabase, obraId, supplierId, data.user.id, parse(fd));
    revalidatePath(`/app/${obraId}`, "layout");
    return { ok: true };
  });
}
