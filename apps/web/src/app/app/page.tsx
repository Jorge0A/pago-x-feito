import { redirect } from "next/navigation";
import { listObras } from "@pxf/core";
import { createClient } from "@/lib/supabase/server";

/** v0 has one obra per owner: go straight to it, or to the setup screen. */
export default async function AppIndex() {
  const supabase = await createClient();
  const obras = await listObras(supabase);
  if (obras.length === 0) redirect("/app/nova-obra");
  redirect(`/app/${obras[0]!.id}`);
}
