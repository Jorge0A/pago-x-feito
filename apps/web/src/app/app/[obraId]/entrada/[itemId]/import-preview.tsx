"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@pxf/core";
import { IMPORT_FIELD_LABELS, IMPORT_FIELDS, type SheetAnalysis } from "@pxf/extractors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { aiMappingAction, confirmImportAction, remapAction, selectSheetAction } from "../actions";
import type { ActionResult } from "@/lib/action-result";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function useToastOnResult(state: ActionResult | null) {
  const last = useRef<ActionResult | null>(null);
  useEffect(() => {
    if (!state || state === last.current) return;
    last.current = state;
    if (state.ok && state.message) toast.success(state.message);
    if (!state.ok) toast.error(state.error);
  }, [state]);
}

export function ImportPreview({
  obraId,
  itemId,
  sheets,
  sheet,
}: {
  obraId: string;
  itemId: string;
  sheets: string[];
  sheet: SheetAnalysis;
}) {
  const [remapState, remap, remapping] = useActionState(remapAction.bind(null, obraId, itemId), null);
  const [aiState, ai, aiBusy] = useActionState(aiMappingAction.bind(null, obraId, itemId), null);
  const [confirmState, confirm, confirming] = useActionState(confirmImportAction.bind(null, obraId, itemId), null);
  useToastOnResult(remapState);
  useToastOnResult(aiState);
  useToastOnResult(confirmState);

  const mapForm = useRef<HTMLFormElement>(null);
  const [showMapping, setShowMapping] = useState(sheet.confidence < 0.8);
  const columnField = (col: number) => (Object.entries(sheet.mapping).find(([, c]) => c === col)?.[0] as string | undefined) ?? "";

  const selectedTotal = sheet.totals.totalCentavos;

  return (
    <div className="space-y-6">
      {sheets.length > 1 && (
        <div className="space-y-1.5">
          <Label>Aba da planilha</Label>
          <select
            className={selectClass}
            value={sheet.sheetName}
            onChange={(e) => void selectSheetAction(obraId, itemId, e.target.value)}
          >
            {sheets.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      <section className="rounded-xl border">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          onClick={() => setShowMapping((v) => !v)}
        >
          <span className="text-sm font-semibold">Colunas reconhecidas</span>
          <span className="text-xs text-muted-foreground">
            {sheet.mappingSource === "user" ? "ajustado por você" : sheet.mappingSource === "ai" ? "sugerido pela IA" : `confiança ${Math.round(sheet.confidence * 100)}%`}
            {" · "}
            {showMapping ? "ocultar" : "ajustar"}
          </span>
        </button>
        {showMapping && (
          <form ref={mapForm} action={remap} className="space-y-3 border-t px-4 py-3">
            <input type="hidden" name="sheet" value={sheet.sheetName} />
            <div className="flex items-center gap-3">
              <Label htmlFor="header_row" className="shrink-0">
                Linha do cabeçalho
              </Label>
              <Input
                id="header_row"
                name="header_row"
                type="number"
                min={1}
                defaultValue={sheet.headerRowIndex + 1}
                className="h-9 w-20"
                onBlur={() => mapForm.current?.requestSubmit()}
              />
            </div>
            <ul className="space-y-2">
              {sheet.headers.map((h, col) => (
                <li key={col} className="grid grid-cols-[1fr_1fr] items-center gap-2">
                  <span className="truncate text-sm" title={h}>
                    {h || <span className="text-muted-foreground">(coluna {col + 1})</span>}
                  </span>
                  <select
                    name={`map-${col}`}
                    className={selectClass}
                    defaultValue={columnField(col)}
                    onChange={() => mapForm.current?.requestSubmit()}
                  >
                    <option value="">Ignorar</option>
                    {IMPORT_FIELDS.map((f) => (
                      <option key={f} value={f}>
                        {IMPORT_FIELD_LABELS[f]}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-2 pt-1">
              <Button type="submit" form="ai-mapping-form" variant="outline" size="sm" disabled={aiBusy}>
                <Sparkles className="size-4" /> {aiBusy ? "Pensando…" : "Sugerir com IA"}
              </Button>
              <span className="text-xs text-muted-foreground">{remapping ? "Atualizando…" : "Muda ao selecionar"}</span>
            </div>
          </form>
        )}
        {/* Separate form so the AI button never nests inside the mapping form. */}
        <form id="ai-mapping-form" action={ai} className="hidden" />
      </section>

      {sheet.warnings.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs dark:border-amber-900 dark:bg-amber-950/40">
          {sheet.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <form action={confirm} className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">
            {sheet.rows.length} {sheet.rows.length === 1 ? "linha encontrada" : "linhas encontradas"}
          </h2>
          <span className="text-sm font-medium tabular-nums">{formatBRL(selectedTotal)}</span>
        </div>

        {sheet.rows.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhuma linha reconhecida. Ajuste as colunas acima: no mínimo, indique qual é a descrição e qual é o valor.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {sheet.rows.map((r, i) => (
              <li key={i} className="flex items-start gap-3 px-3 py-2.5">
                <input type="checkbox" name="rows" value={i} defaultChecked className="mt-1 size-5 shrink-0 accent-[#0f5132]" aria-label={`Incluir linha ${r.rowNumber}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{r.description}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[r.category, r.supplier, r.qty !== null ? `${r.qty.toLocaleString("pt-BR")} ${r.unit ?? ""}`.trim() : null]
                      .filter(Boolean)
                      .join(" · ") || `linha ${r.rowNumber}`}
                  </p>
                </div>
                <span className="shrink-0 text-sm tabular-nums">{r.total_centavos === null ? "—" : formatBRL(r.total_centavos)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-3 rounded-xl border px-4 py-3">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="contracted" className="size-5 accent-[#0f5132]" />
            Estes valores já estão contratados (fechados com o fornecedor). Se não, entram em cotação para você aprovar ou recusar.
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="default_category">Categoria para linhas sem categoria</Label>
            <Input id="default_category" name="default_category" defaultValue="Outros" className="h-10" />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Nada é salvo até você confirmar. Fornecedores com o mesmo nome dos já cadastrados são reaproveitados.
        </p>
        <Button type="submit" className="h-12 w-full text-base" disabled={confirming || sheet.rows.length === 0}>
          {confirming ? "Importando…" : "Confirmar importação"}
        </Button>
      </form>
    </div>
  );
}
