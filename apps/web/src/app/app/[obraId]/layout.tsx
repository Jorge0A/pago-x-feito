import { notFound } from "next/navigation";
import { countOpenInboxItems, getObra } from "@pxf/core";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/app/bottom-nav";

export default async function ObraLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ obraId: string }>;
}) {
  const { obraId } = await params;
  const supabase = await createClient();
  const [obra, inboxCount] = await Promise.all([getObra(supabase, obraId), countOpenInboxItems(supabase, obraId)]);
  if (!obra) notFound();
  return (
    <div className="flex min-h-dvh flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
      {children}
      <BottomNav obraId={obraId} inboxCount={inboxCount} />
    </div>
  );
}
