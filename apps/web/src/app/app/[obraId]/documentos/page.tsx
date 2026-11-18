import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { formatDateTimeBR, listDocuments, signedDocumentUrl } from "@pxf/core";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Documentos" };

const KIND: Record<string, string> = {
  receipt: "Comprovante",
  nf: "Nota fiscal",
  contract: "Contrato",
  budget: "Planilha",
  photo: "Foto",
  quote: "Orçamento",
  other: "Arquivo",
};

export default async function DocumentosPage({ params }: { params: Promise<{ obraId: string }> }) {
  const { obraId } = await params;
  const supabase = await createClient();
  const docs = await listDocuments(supabase, obraId);
  const urls = await Promise.all(docs.map((d) => signedDocumentUrl(supabase, d.storage_path).catch(() => null)));

  return (
    <>
      <PageHeader
        title="Documentos"
        subtitle={`${docs.length} arquivo${docs.length === 1 ? "" : "s"}`}
        action={
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/app/${obraId}/mais`} />}>
            <ArrowLeft className="size-4" /> Mais
          </Button>
        }
      />
      <main className="mx-auto w-full max-w-lg px-4 py-5">
        {docs.length === 0 ? (
          <EmptyState title="Nenhum documento ainda" description="Arquivos enviados pela Entrada aparecem aqui, com link privado de 10 minutos." />
        ) : (
          <ul className="divide-y rounded-xl border">
            {docs.map((d, i) => (
              <li key={d.id} className="flex items-center gap-3 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.original_name}</p>
                  <p className="text-xs text-muted-foreground">
                    <Badge variant="secondary" className="mr-1.5">
                      {KIND[d.kind] ?? d.kind}
                    </Badge>
                    {formatDateTimeBR(d.created_at)}
                  </p>
                </div>
                {urls[i] && (
                  <Button variant="ghost" size="icon" aria-label="Abrir" nativeButton={false} render={<a href={urls[i]!} target="_blank" rel="noopener noreferrer" />}>
                    <ExternalLink className="size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
