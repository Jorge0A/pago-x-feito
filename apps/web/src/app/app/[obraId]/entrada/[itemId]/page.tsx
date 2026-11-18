import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { formatDateTimeBR, getInboxItem, signedDocumentUrl } from "@pxf/core";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteFileAction, discardAction, type SpreadsheetProposal } from "../actions";
import { ImportPreview } from "./import-preview";

export const metadata: Metadata = { title: "Entrada" };

function fmtBytes(n: number | null): string {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default async function InboxItemPage({ params }: { params: Promise<{ obraId: string; itemId: string }> }) {
  const { obraId, itemId } = await params;
  const supabase = await createClient();
  const item = await getInboxItem(supabase, itemId);
  if (!item || item.obra_id !== obraId) notFound();
  const doc = item.document;
  const url = doc ? await signedDocumentUrl(supabase, doc.storage_path) : null;
  const proposal = item.proposal as SpreadsheetProposal | null;
  const sheet = proposal?.type === "spreadsheet" ? proposal.analysis.sheets.find((s) => s.sheetName === proposal.selectedSheet) : undefined;
  const isOpen = item.status === "proposed" || item.status === "received" || item.status === "failed";

  return (
    <>
      <PageHeader
        title={doc?.original_name ?? "Item"}
        subtitle={`${formatDateTimeBR(item.created_at)}${doc?.size_bytes ? ` · ${fmtBytes(doc.size_bytes)}` : ""}`}
        action={
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/app/${obraId}/entrada`} />}>
            <ArrowLeft className="size-4" /> Entrada
          </Button>
        }
      />
      <main className="mx-auto w-full max-w-lg space-y-5 px-4 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={item.status === "proposed" ? "default" : item.status === "failed" ? "destructive" : "secondary"}>
            {item.status === "proposed"
              ? "Aguardando sua confirmação"
              : item.status === "received"
                ? "Recebido"
                : item.status === "confirmed"
                  ? "Confirmado"
                  : item.status === "discarded"
                    ? "Descartado"
                    : item.status === "failed"
                      ? "Falhou"
                      : "Lendo…"}
          </Badge>
          {url && (
            <Button variant="outline" size="sm" nativeButton={false} render={<a href={url} target="_blank" rel="noopener noreferrer" />}>
              <ExternalLink className="size-4" /> Abrir original
            </Button>
          )}
        </div>

        {item.status === "failed" && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Não consegui ler este arquivo: {item.error ?? "erro desconhecido"}. Você pode descartá-lo e enviar de novo.
          </p>
        )}

        {sheet && item.status === "proposed" && (
          <ImportPreview obraId={obraId} itemId={itemId} sheets={proposal!.analysis.sheets.map((s) => s.sheetName)} sheet={sheet} />
        )}

        {item.status === "received" && (
          <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Arquivo guardado.</p>
            <p className="mt-1">
              A leitura automática de comprovantes, notas fiscais e contratos chega no próximo passo (M3). Ele fica aqui na fila até lá.
            </p>
          </div>
        )}

        {item.status === "confirmed" && (
          <p className="text-sm text-muted-foreground">
            Importado para o orçamento.{" "}
            <Link href={`/app/${obraId}/orcamento`} className="underline">
              Ver orçamento
            </Link>
          </p>
        )}

        {isOpen && (
          <form action={discardAction.bind(null, obraId, itemId)}>
            <Button type="submit" variant="outline" className="w-full">
              Descartar proposta
            </Button>
            <p className="mt-1.5 text-center text-xs text-muted-foreground">O arquivo continua em Documentos; só a proposta é descartada.</p>
          </form>
        )}
        {doc && (
          <form action={deleteFileAction.bind(null, obraId, itemId)}>
            <Button type="submit" variant="outline" className="w-full text-destructive">
              <Trash2 className="size-4" /> Excluir arquivo
            </Button>
            <p className="mt-1.5 text-center text-xs text-muted-foreground">Remove o arquivo e este item da Entrada. Linhas já importadas continuam no orçamento.</p>
          </form>
        )}
      </main>
    </>
  );
}
