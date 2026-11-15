"use client";

import { useState } from "react";
import type { Tables } from "@pxf/db";
import { BUDGET_CATEGORIES } from "@pxf/core";
import { FormSheet } from "@/components/app/form-sheet";
import { Field, SelectField } from "@/components/app/field";
import { MoneyInput } from "@/components/app/money-input";
import { Label } from "@/components/ui/label";
import { createBudgetLineAction, updateBudgetLineAction } from "./actions";

export function BudgetLineSheet({
  obraId,
  line,
  suppliers,
  trigger,
}: {
  obraId: string;
  line?: Tables<"budget_lines">;
  suppliers: Array<Pick<Tables<"suppliers">, "id" | "name">>;
  trigger: React.ReactElement;
}) {
  const action = line
    ? updateBudgetLineAction.bind(null, obraId, line.id)
    : createBudgetLineAction.bind(null, obraId);
  const knownCategory = line ? (BUDGET_CATEGORIES as readonly string[]).includes(line.category) : true;
  const [category, setCategory] = useState(line ? (knownCategory ? line.category : "__other") : "");

  return (
    <FormSheet
      trigger={trigger}
      title={line ? "Editar linha" : "Nova linha do orçamento"}
      action={action}
      successMessage={line ? "Linha atualizada" : "Linha adicionada"}
    >
      <div className="space-y-1.5">
        <Label htmlFor="category">Categoria</Label>
        <select
          id="category"
          name="category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Selecione</option>
          {BUDGET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value="__other">Outra…</option>
        </select>
      </div>
      {category === "__other" && (
        <Field label="Nome da categoria" name="category_other" required defaultValue={!knownCategory ? line?.category : ""} />
      )}
      <Field label="Descrição" name="description" required defaultValue={line?.description} placeholder="Ex.: Pintura das paredes, 3 quartos" />
      <SelectField
        label="Fornecedor"
        name="supplier_id"
        options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
        defaultValue={line?.supplier_id}
        placeholder="A definir"
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantidade" name="qty" inputMode="decimal" defaultValue={line?.qty ?? ""} placeholder="1" />
        <Field label="Unidade" name="unit" defaultValue={line?.unit ?? ""} placeholder="vb, m², un" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="budgeted">Valor orçado</Label>
        <MoneyInput id="budgeted" name="budgeted_centavos" defaultCentavos={line?.budgeted_centavos ?? null} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contracted">Valor contratado (se já fechado)</Label>
        <MoneyInput id="contracted" name="contracted_centavos" defaultCentavos={line?.contracted_centavos ?? null} />
      </div>
    </FormSheet>
  );
}
