"use server";

import { revalidatePath } from "next/cache";
import { obraUpdateSchema, updateObra } from "@pxf/core";
import { createClient } from "@/lib/supabase/server";
import { runAction, str, type ActionResult } from "@/lib/action-result";

export async function updateObraAction(obraId: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "Sessão expirada." };
    const input = obraUpdateSchema.parse({
      title: str(fd, "title"),
      unit: str(fd, "unit"),
      start_date: str(fd, "start_date"),
      status: str(fd, "status"),
    });
    await updateObra(supabase, obraId, data.user.id, input);
    revalidatePath(`/app/${obraId}`, "layout");
    return { ok: true };
  });
}
