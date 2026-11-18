import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { BUDGET_LINE_STATUS_LABELS, getObraDashboard, listSuppliers, type BudgetLineStatus } from "@pxf/core";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Money } from "@/components/app/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BudgetLineSheet } from "./budget-line-form";
import { LineStatusActions, type AlternativeLine } from "./line-status";

export const metadata: Metadata = { title: "Orçamento" };

type Filter = "todos" | "cotacao" | "aprovados" | "recusados";
const FILTERS: Array<{ key: Filter; label: string; statuses: BudgetLineStatus[] | null }> = [
  { key: "todos", label: "Todos", statuses: null },
  { key: "cotacao", label: "Em cotação", statuses: ["quoted"] },
  { key: "aprovados", label: "Aprovados", statuses: ["approved", "contracted"] },
  { key: "recusados", label: "Recusados", statuses: ["rejected"] },
];

const STATUS_BADGE: Record<BudgetLineStatus, string> = {
  quoted: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  approved: "bg-[#0f5132]/10 text-[#0f5132] dark:text-emerald-300",
  contracted: "bg-[#0f5132] text-white",
  rejected: "bg-muted text-muted-foreground line-through",
};

export default async function OrcamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string }>;
  searchParams: Promise<{ importado?: string; filtro?: string }>;
}) {
  const { obraId } = await params;
  const { importado, filtro } = await searchParams;
  const supabase = await createClient();
  const [dash, suppliers] = await Promise.all([getObraDashboard(supabase, obraId), listSuppliers(supabase, obraId)]);
  const { summary } = dash;
  const supplierOptions = suppliers.map((s) => ({ id: s.id, name: s.name }));
  const filter = FILTERS.find((f) => f.key === filtro) ?? FILTERS[0]!;
  const counts = {
    cotacao: summary.quotedCount,
    aprovados: dash.lines.filter((l) => l.status === "approved" || l.status === "contracted").length,
    recusados: summary.rejectedCount,
  };

  const addButton = (
    <BudgetLineSheet
      obraId={obraId}
      suppliers={supplierOptions}
      trigger={
        <Button size="sm">
          <Plus className="size-4" /> Linha
        </Button>
      }
    />
  );

  const visibleCategories = summary.categories
    .map((cat) => ({ ...cat, lines: cat.lines.filter((ls) => !filter.statuses || filter.statuses.includes(ls.line.status)) }))
    .filter((cat) => cat.lines.length > 0);

  return (
    <>
      <PageHeader title="Orçamento" subtitle={`${summary.lines.length} ${summary.lines.length === 1 ? "linha" : "linhas"}`} action={addButton} />
      <main className="mx-auto w-full max-w-lg space-y-5 px-4 py-5">
        {importado === "1" && (
          <p className="rounded-xl border border-[#0f5132]/30 bg-[#0f5132]/5 px-4 py-3 text-sm">
            Planilha importada. As linhas entram <strong>em cotação</strong>: aprove as que valem e recuse as outras. Só o aprovado conta no orçado.
          </p>
        )}

        <section className="grid grid-cols-3 gap-2 rounded-xl border p-3 text-center">
          <Total label="Orçado" value={summary.budgeted} />
          <Total label="Contratado" value={summary.committed} />
          <Total label="Pago" value={summary.paidTotal} />
        </section>
        {summary.quoted > 0 && (
          <p className="-mt-2 px-1 text-xs text-muted-foreground">
            Fora do orçado: <Money value={summary.quoted} className="text-foreground" /> em {summary.quotedCount}{" "}
            {summary.quotedCount === 1 ? "cotação aguardando decisão" : "cotações aguardando decisão"}.
          </p>
        )}

        <nav className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1 text-sm" aria-label="Filtro">
          {FILTERS.map((f) => {
            const n = f.key === "todos" ? summary.lines.length : counts[f.key];
            return (
              <Link
                key={f.key}
                href={f.key === "todos" ? `/app/${obraId}/orcamento` : `/app/${obraId}/orcamento?filtro=${f.key}`}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-md px-3 py-1.5",
                  filter.key === f.key ? "bg-background font-medium shadow-sm" : "text-muted-foreground",
                )}
              >
                {f.label}
                <span className="text-xs tabular-nums">{n}</span>
              </Link>
            );
          })}
        </nav>

        {summary.categories.length === 0 ? (
          <EmptyState
            title="Orçamento vazio"
            description="Envie a planilha do engenheiro pela Entrada ou adicione linhas manualmente."
            action={addButton}
          />
        ) : visibleCategories.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nada neste filtro.</p>
        ) : (
          visibleCategories.map((cat) => (
            <section key={cat.category} className="space-y-2">
              <div className="flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold">{cat.category}</h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  <Money value={cat.committed} />
                  {cat.quoted > 0 && (
                    <>
                      {" · "}
                      <Money value={cat.quoted} /> em cotação
                    </>
                  )}
                </span>
              </div>
              <ul className="divide-y rounded-xl border">
                {cat.lines.map(({ line: l, paid, contracted }) => {
                  const full = dash.lines.find((x) => x.id === l.id)!;
                  const status = l.status;
                  const amount = l.contracted_centavos ?? l.budgeted_centavos;
                  const alternatives: AlternativeLine[] = cat.lines
                    .filter((o) => o.line.id !== l.id && o.line.status === "quoted")
                    .map((o) => {
                      const of = dash.lines.find((x) => x.id === o.line.id)!;
                      return { id: o.line.id, description: o.line.description, supplierName: of.supplier?.name ?? null, total: o.line.contracted_centavos ?? o.line.budgeted_centavos };
                    });
                  return (
                    <li key={l.id} className={cn("space-y-2 px-3 py-3", status === "rejected" && "opacity-70")}>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-sm font-medium", status === "rejected" && "line-through")}>{l.description}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {full.supplier?.name ?? "Fornecedor a definir"}
                            {full.qty ? ` · ${Number(full.qty).toLocaleString("pt-BR")} ${full.unit ?? ""}`.trimEnd() : ""}
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                            <Badge className={cn("border-transparent", STATUS_BADGE[status])}>{BUDGET_LINE_STATUS_LABELS[status]}</Badge>
                            <Money value={amount} className="text-foreground" />
                            {contracted !== null && status !== "contracted" && <span>(contratado)</span>}
                            {paid > 0 && (
                              <>
                                <span>· pago</span>
                                <Money value={paid} className="text-[#0f5132]" />
                              </>
                            )}
                          </p>
                          {status === "rejected" && full.rejection_reason && (
                            <p className="mt-0.5 text-xs text-muted-foreground">Motivo: {full.rejection_reason}</p>
                          )}
                        </div>
                        <BudgetLineSheet
                          obraId={obraId}
                          line={full}
                          suppliers={supplierOptions}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label={`Editar ${l.description}`}>
                              <Pencil className="size-4" />
                            </Button>
                          }
                        />
                      </div>
                      <LineStatusActions obraId={obraId} lineId={l.id} status={status} description={l.description} alternatives={alternatives} />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </main>
    </>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">
        <Money value={value} />
      </p>
    </div>
  );
}
