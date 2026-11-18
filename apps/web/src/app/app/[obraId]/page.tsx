import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { countOpenInboxItems, formatDateBR, getObra, getObraDashboard, percentOf } from "@pxf/core";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Money } from "@/components/app/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/app/empty-state";

export default async function ResumoPage({ params }: { params: Promise<{ obraId: string }> }) {
  const { obraId } = await params;
  const supabase = await createClient();
  const [obra, dash, inboxCount] = await Promise.all([
    getObra(supabase, obraId),
    getObraDashboard(supabase, obraId),
    countOpenInboxItems(supabase, obraId),
  ]);
  if (!obra) return null;
  const { summary } = dash;
  const paidPct = percentOf(summary.paidTotal, summary.committed);

  return (
    <>
      <PageHeader title={obra.title} subtitle={obra.building.name} />
      <main className="mx-auto w-full max-w-lg space-y-6 px-4 py-5">
        {inboxCount > 0 && (
          <Link
            href={`/app/${obraId}/entrada`}
            className="flex items-center justify-between rounded-xl border border-[#0f5132]/30 bg-[#0f5132]/5 px-4 py-3 text-sm"
          >
            <span>
              <strong>{inboxCount}</strong> {inboxCount === 1 ? "item aguardando sua confirmação" : "itens aguardando sua confirmação"}
            </span>
            <ChevronRight className="size-4" />
          </Link>
        )}
        <section className="grid grid-cols-2 gap-3">
          <Stat label="Orçado" value={summary.budgeted} />
          <Stat label="Contratado" value={summary.committed} />
          <Stat label="Pago" value={summary.paidTotal} accent />
          <Stat label="A pagar" value={summary.owed} />
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pago sobre contratado</span>
            <span className="font-medium tabular-nums">{paidPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[#0f5132]" style={{ width: `${Math.min(paidPct, 100)}%` }} />
          </div>
          {summary.paidUnallocated > 0 && (
            <p className="text-xs text-muted-foreground">
              <Money value={summary.paidUnallocated} /> pagos sem linha do orçamento.
            </p>
          )}
        </section>

        {dash.pendingNfCount > 0 && (
          <Card className="border-amber-300 bg-amber-50 py-3 dark:border-amber-900 dark:bg-amber-950/40">
            <CardContent className="flex items-center justify-between px-4">
              <div>
                <p className="text-sm font-medium">
                  {dash.pendingNfCount} {dash.pendingNfCount === 1 ? "nota fiscal pendente" : "notas fiscais pendentes"}
                </p>
                <p className="text-xs text-muted-foreground">Cobrança e lista completa chegam no próximo passo (M2).</p>
              </div>
              <Badge variant="outline">NF</Badge>
            </CardContent>
          </Card>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Por categoria</h2>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/app/${obraId}/orcamento`} />}>
              Ver orçamento <ChevronRight className="size-4" />
            </Button>
          </div>
          {summary.categories.length === 0 ? (
            <EmptyState
              title="Nenhuma linha no orçamento ainda"
              description="Cadastre as linhas manualmente ou importe a planilha do engenheiro (M3)."
              action={
                <Button size="sm" nativeButton={false} render={<Link href={`/app/${obraId}/orcamento`} />}>
                  Adicionar linha
                </Button>
              }
            />
          ) : (
            <ul className="divide-y rounded-xl border">
              {summary.categories.map((c) => {
                const pct = percentOf(c.paid, c.committed);
                return (
                  <li key={c.category} className="space-y-1.5 px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-medium">{c.category}</span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        <Money value={c.paid} className="text-foreground" /> / <Money value={c.committed} />
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-[#0f5132]" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {dash.bySupplier.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Por fornecedor</h2>
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/app/${obraId}/fornecedores`} />}>
                Ver todos <ChevronRight className="size-4" />
              </Button>
            </div>
            <ul className="divide-y rounded-xl border">
              {dash.bySupplier.slice(0, 8).map((s) => (
                <li key={s.supplier_id ?? "none"} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      pago <Money value={s.paid} className="text-foreground" /> de <Money value={s.committed} />
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] text-muted-foreground">a pagar</p>
                    <Money value={s.owed} className="text-sm font-medium" />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Próximos vencimentos</h2>
          {dash.upcomingInstallments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma parcela pendente.</p>
          ) : (
            <ul className="divide-y rounded-xl border">
              {dash.upcomingInstallments.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{i.contract?.supplier?.name ?? "Fornecedor"}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.label}
                      {i.due_date ? ` · ${formatDateBR(i.due_date)}` : ""}
                      {i.trigger !== "date" && i.trigger_note ? ` · ${i.trigger_note}` : ""}
                    </p>
                  </div>
                  <Money value={i.amount_centavos} className="shrink-0 text-sm font-medium" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card className="gap-1 py-3">
      <CardContent className="px-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={accent ? "text-lg font-semibold text-[#0f5132]" : "text-lg font-semibold"}>
          <Money value={value} />
        </p>
      </CardContent>
    </Card>
  );
}
