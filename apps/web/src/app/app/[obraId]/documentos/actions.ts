"use server";

import { revalidatePath } from "next/cache";
import { deleteDocument } from "@pxf/core";
import { createClient } from "@/lib/supabase/server";
import { runAction, type ActionResult } from "@/lib/action-result";

export async function deleteDocumentAction(obraId: string, documentId: string): Promise<ActionResult> {
  return runAction(async () => {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "Sessão expirada." };
    await deleteDocument(supabase, obraId, documentId, data.user.id);
    revalidatePath(`/app/${obraId}`, "layout");
    return { ok: true, message: "Arquivo excluído" };
  });
}
