import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileSpreadsheet, FileText, Image as ImageIcon } from "lucide-react";
import { formatDateTimeBR, listInboxItems, type InboxItemWithDocument } from "@pxf/core";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { UploadButton } from "./upload-button";

export const metadata: Metadata = { title: "Entrada" };

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  received: { label: "Recebido", variant: "secondary" },
  extracting: { label: "Lendo…", variant: "secondary" },
  proposed: { label: "Aguardando confirmação", variant: "default" },
  confirmed: { label: "Confirmado", variant: "outline" },
  discarded: { label: "Descartado", variant: "outline" },
  failed: { label: "Falhou", variant: "destructive" },
};

function Icon({ item }: { item: InboxItemWithDocument }) {
  const mime = item.document?.mime_type ?? "";
  const name = item.document?.original_name ?? "";
  if (/sheet|excel|csv/.test(mime) || /\.(xlsx|xls|csv)$/i.test(name)) return <FileSpreadsheet className="size-5 text-[#0f5132]" />;
  if (mime.startsWith("image/")) return <ImageIcon className="size-5 text-muted-foreground" />;
  return <FileText className="size-5 text-muted-foreground" />;
}

export default async function EntradaPage({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string }>;
  searchParams: Promise<{ todos?: string }>;
}) {
  const { obraId } = await params;
  const { todos } = await searchParams;
  const supabase = await createClient();
  const items = await listInboxItems(supabase, obraId, { includeClosed: todos === "1" });
  const open = items.filter((i) => ["received", "proposed", "failed"].includes(i.status));

  return (
    <>
      <PageHeader
        title="Entrada"
        subtitle={open.length === 0 ? "Nada pendente" : `${open.length} para revisar`}
        action={<UploadButton obraId={obraId} size="sm" label="Enviar" />}
      />
      <main className="mx-auto w-full max-w-lg space-y-5 px-4 py-5">
        <p className="text-sm text-muted-foreground">
          Envie planilhas, comprovantes, notas, contratos ou fotos. A planilha vira fornecedores e linhas do orçamento depois
          que você confere o mapeamento. Comprovantes e notas passam a ser lidos no próximo passo (M3).
        </p>

        {items.length === 0 ? (
          <EmptyState
            title="Caixa de entrada vazia"
            description="Comece pela planilha do engenheiro: ela vira o orçamento inteiro em uma confirmação."
            action={<UploadButton obraId={obraId} />}
          />
        ) : (
          <ul className="divide-y rounded-xl border">
            {items.map((item) => {
              const st = STATUS[item.status] ?? STATUS.received!;
              return (
                <li key={item.id}>
                  <Link href={`/app/${obraId}/entrada/${item.id}`} className="flex items-center gap-3 px-3 py-3 active:bg-muted">
                    <Icon item={item} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.document?.original_name ?? item.raw_text?.slice(0, 60) ?? "Item"}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTimeBR(item.created_at)}</p>
                    </div>
                    <Badge variant={st.variant} className="shrink-0">
                      {st.label}
                    </Badge>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-center text-xs">
          {todos === "1" ? (
            <Link href={`/app/${obraId}/entrada`} className="text-muted-foreground underline">
              Mostrar só pendentes
            </Link>
          ) : (
            <Link href={`/app/${obraId}/entrada?todos=1`} className="text-muted-foreground underline">
              Mostrar confirmados e descartados
            </Link>
          )}
        </p>
      </main>
    </>
  );
}
