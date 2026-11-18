import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ChevronRight, FolderOpen, LogOut } from "lucide-react";
import { getObra } from "@pxf/core";
import { createClient, getUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Mais" };

export default async function MaisPage({ params }: { params: Promise<{ obraId: string }> }) {
  const { obraId } = await params;
  const supabase = await createClient();
  const [obra, user] = await Promise.all([getObra(supabase, obraId), getUser()]);
  if (!obra) return null;
  const items = [
    { href: `/app/${obraId}/obra`, icon: Building2, title: "Obra e condomínio", desc: `${obra.title} · ${obra.building.name}` },
    { href: `/app/${obraId}/documentos`, icon: FolderOpen, title: "Documentos", desc: "Tudo que você já enviou" },
  ];
  return (
    <>
      <PageHeader title="Mais" subtitle={user?.email ?? undefined} />
      <main className="mx-auto w-full max-w-lg space-y-6 px-4 py-5">
        <ul className="divide-y rounded-xl border">
          {items.map(({ href, icon: Icon, title, desc }) => (
            <li key={href}>
              <Link href={href} className="flex items-center gap-3 px-4 py-3 active:bg-muted">
                <Icon className="size-5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="truncate text-xs text-muted-foreground">{desc}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
        <p className="px-1 text-xs text-muted-foreground">Agenda (M5), lembretes e histórico (M6) entram aqui nos próximos passos.</p>
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="outline" className="w-full">
            <LogOut className="size-4" /> Sair
          </Button>
        </form>
      </main>
    </>
  );
}
