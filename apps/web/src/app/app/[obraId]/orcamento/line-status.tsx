"use client";

import { useActionState, useEffect, useRef } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, type BudgetLineStatus } from "@pxf/core";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormSheet } from "@/components/app/form-sheet";
import type { ActionResult } from "@/lib/action-result";
import { setLineStatusAction } from "./actions";

export interface AlternativeLine {
  id: string;
  description: string;
  supplierName: string | null;
  total: number;
}

function useQuickAction(obraId: string, lineId: string, status: BudgetLineStatus, label: string) {
  const [state, action, pending] = useActionState(setLineStatusAction.bind(null, obraId, lineId, status), null);
  const last = useRef<ActionResult | null>(null);
  useEffect(() => {
    if (!state || state === last.current) return;
    last.current = state;
    if (state.ok) toast.success(label);
    else toast.error(state.error);
  }, [state, label]);
  return { action, pending };
}

/** Row actions for a budget line, by status. Approving lists other quotes in the same category to reject. */
export function LineStatusActions({
  obraId,
  lineId,
  status,
  description,
  alternatives,
}: {
  obraId: string;
  lineId: string;
  status: BudgetLineStatus;
  description: string;
  alternatives: AlternativeLine[];
}) {
  const contract = useQuickAction(obraId, lineId, "contracted", "Marcado como contratado");
  const reopen = useQuickAction(obraId, lineId, "quoted", "Voltou para cotação");
  const unContract = useQuickAction(obraId, lineId, "approved", "Voltou para aprovado");

  if (status === "quoted") {
    return (
      <div className="flex gap-2">
        <FormSheet
          trigger={
            <Button size="sm" className="bg-[#0f5132] text-white hover:bg-[#0f5132]/90">
              <Check className="size-4" /> Aprovar
            </Button>
          }
          title="Aprovar esta cotação"
          description={description}
          action={setLineStatusAction.bind(null, obraId, lineId, "approved")}
          submitLabel="Aprovar"
          successMessage="Cotação aprovada"
        >
          {alternatives.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Outras cotações nesta categoria</p>
              <p className="text-xs text-muted-foreground">
                Por padrão elas continuam em cotação. Escolha "Aprovar também" para fechar várias de uma vez, ou "Recusar" para as que perdem.
              </p>
              <ul className="divide-y rounded-lg border">
                {alternatives.map((a) => (
                  <li key={a.id} className="space-y-1.5 px-3 py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{a.description}</span>
                        <span className="block truncate text-xs text-muted-foreground">{a.supplierName ?? "Sem fornecedor"}</span>
                      </span>
                      <span className="shrink-0 text-sm tabular-nums">{formatBRL(a.total)}</span>
                    </div>
                    <select
                      name={`alt-${a.id}`}
                      defaultValue=""
                      className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="">Manter em cotação</option>
                      <option value="approve">Aprovar também</option>
                      <option value="reject">Recusar</option>
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">A linha passa a contar no orçado da obra.</p>
          )}
        </FormSheet>
        <FormSheet
          trigger={
            <Button size="sm" variant="outline">
              <X className="size-4" /> Recusar
            </Button>
          }
          title="Recusar esta cotação"
          description={description}
          action={setLineStatusAction.bind(null, obraId, lineId, "rejected")}
          submitLabel="Recusar"
          successMessage="Cotação recusada"
        >
          <div className="space-y-1.5">
            <Label htmlFor="reason">Motivo (opcional, vai para o histórico)</Label>
            <Textarea id="reason" name="reason" rows={2} placeholder="Ex.: preço acima do esperado, pedir outra opção à Fabiana" className="text-base" />
          </div>
        </FormSheet>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="flex gap-2">
        <form action={contract.action}>
          <Button size="sm" variant="outline" type="submit" disabled={contract.pending}>
            <Check className="size-4" /> Contratado
          </Button>
        </form>
        <form action={reopen.action}>
          <Button size="sm" variant="ghost" type="submit" disabled={reopen.pending}>
            <RotateCcw className="size-4" /> Cotação
          </Button>
        </form>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <form action={reopen.action}>
        <Button size="sm" variant="ghost" type="submit" disabled={reopen.pending}>
          <RotateCcw className="size-4" /> Reabrir
        </Button>
      </form>
    );
  }

  return (
    <form action={unContract.action}>
      <Button size="sm" variant="ghost" type="submit" disabled={unContract.pending}>
        <RotateCcw className="size-4" /> Desfazer contratado
      </Button>
    </form>
  );
}
