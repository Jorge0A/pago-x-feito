"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { bulkStatusAction } from "./actions";

export const BULK_FORM_ID = "bulk-status-form";

/**
 * Sticky bar for the "Em cotação" view. The line checkboxes live in the list and point at this
 * form through the `form` attribute, so nothing nests inside the per-line forms.
 */
export function BulkBar({ obraId, total }: { obraId: string; total: number }) {
  const [state, action, pending] = useActionState(bulkStatusAction.bind(null, obraId), null);
  const last = useRef<ActionResult | null>(null);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!state || state === last.current) return;
    last.current = state;
    if (state.ok) toast.success(state.message ?? "Pronto");
    else toast.error(state.error);
  }, [state]);

  useEffect(() => {
    const count = () => setSelected(document.querySelectorAll<HTMLInputElement>(`input[form="${BULK_FORM_ID}"]:checked`).length);
    count();
    document.addEventListener("change", count);
    return () => document.removeEventListener("change", count);
  }, []);

  function toggleAll(on: boolean) {
    document.querySelectorAll<HTMLInputElement>(`input[form="${BULK_FORM_ID}"]`).forEach((el) => {
      el.checked = on;
    });
    setSelected(on ? total : 0);
  }

  return (
    <form
      id={BULK_FORM_ID}
      action={action}
      className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-2">
        <button type="button" className="text-xs text-muted-foreground underline" onClick={() => toggleAll(selected < total)}>
          {selected < total ? "Marcar todas" : "Desmarcar"}
        </button>
        <span className="flex-1 text-xs text-muted-foreground tabular-nums">{selected} de {total}</span>
        <Button type="submit" name="status" value="rejected" variant="outline" size="sm" disabled={pending || selected === 0}>
          <X className="size-4" /> Recusar
        </Button>
        <Button type="submit" name="status" value="approved" size="sm" className="bg-[#0f5132] text-white hover:bg-[#0f5132]/90" disabled={pending || selected === 0}>
          <Check className="size-4" /> Aprovar
        </Button>
      </div>
    </form>
  );
}
