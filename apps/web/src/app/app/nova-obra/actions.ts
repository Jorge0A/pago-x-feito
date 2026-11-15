"use server";

import { redirect } from "next/navigation";
import { createObraWithBuilding, obraSetupSchema } from "@pxf/core";
import { createClient } from "@/lib/supabase/server";
import { runAction, str, type ActionResult } from "@/lib/action-result";

export async function createObraAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let obraId: string | null = null;
  const result = await runAction(async () => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Sessão expirada. Entre de novo." };
    const input = obraSetupSchema.parse({
      building_name: str(fd, "building_name"),
      neighborhood: str(fd, "neighborhood"),
      address: str(fd, "address"),
      unit: str(fd, "unit"),
      title: str(fd, "title"),
      start_date: str(fd, "start_date"),
    });
    obraId = await createObraWithBuilding(supabase, user.id, user.email ?? null, input);
    return { ok: true };
  });
  if (result.ok && obraId) redirect(`/app/${obraId}`);
  return result;
}
