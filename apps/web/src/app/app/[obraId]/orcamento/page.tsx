import type { Metadata } from "next";
import { Pencil, Plus } from "lucide-react";
import { getObraDashboard, listSuppliers } from "@pxf/core";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Money } from "@/components/app/money";
import { Button } from "@/components/ui/button";
import { BudgetLineSheet } from "./budget-line-form";

export const metadata: Metadata = { title: "Orçamento" };

export default async function OrcamentoPage({ params }: { params: Promise<{ obraId: string }> }) {
  const { obraId } = await params;
  const supabase = await createClient();
  const [dash, suppliers] = await Promise.all([getObraDashboard(supabase, obraId), listSuppliers(supabase, obraId)]);
  const { summary } = dash;
  const supplierOptions = suppliers.map((s) => ({ id: s.id, name: s.name }));

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

  return (
    <>
      <PageHeader title="Orçamento" subtitle={`${summary.lines.length} ${summary.lines.length === 1 ? "linha" : "linhas"}`} action={addButton} />
      <main className="mx-auto w-full max-w-lg space-y-5 px-4 py-5">
        <section className="grid grid-cols-3 gap-2 rounded-xl border p-3 text-center">
          <Total label="Orçado" value={summary.budgeted} />
          <Total label="Contratado" value={summary.committed} />
          <Total label="Pago" value={summary.paidTotal} />
        </section>

        {summary.categories.length === 0 ? (
          <EmptyState
            title="Orçamento vazio"
            description="Adicione as linhas do orçamento do engenheiro. A importação da planilha chega em M3."
            action={addButton}
          />
        ) : (
          summary.categories.map((cat) => (
            <section key={cat.category} className="space-y-2">
              <div className="flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold">{cat.category}</h2>
                <Money value={cat.committed} className="text-xs text-muted-foreground" />
              </div>
              <ul className="divide-y rounded-xl border">
                {cat.lines.map(({ line: l, paid, committed, contracted }) => {
                  const full = dash.lines.find((x) => x.id === l.id)!;
                  return (
                    <li key={l.id} className="flex items-center gap-2 px-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{l.description}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {full.supplier?.name ?? "Fornecedor a definir"}
                          {full.qty ? ` · ${Number(full.qty).toLocaleString("pt-BR")} ${full.unit ?? ""}`.trimEnd() : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                          {contracted !== null ? "Contratado " : "Orçado "}
                          <Money value={committed} className="text-foreground" />
                          {paid > 0 && (
                            <>
                              {" · pago "}
                              <Money value={paid} className="text-[#0f5132]" />
                            </>
                          )}
                        </p>
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
