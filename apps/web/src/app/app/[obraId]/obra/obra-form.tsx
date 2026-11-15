"use client";

import type { Tables } from "@pxf/db";
import { FormSheet } from "@/components/app/form-sheet";
import { Field, SelectField } from "@/components/app/field";
import { updateObraAction } from "./actions";

const STATUS = [
  { value: "planning", label: "Planejamento" },
  { value: "in_progress", label: "Em andamento" },
  { value: "finished", label: "Concluída" },
];

export function ObraSheet({ obra, trigger }: { obra: Tables<"obras">; trigger: React.ReactElement }) {
  return (
    <FormSheet trigger={trigger} title="Editar obra" action={updateObraAction.bind(null, obra.id)} successMessage="Obra atualizada">
      <Field label="Nome da obra" name="title" required defaultValue={obra.title} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Unidade" name="unit" defaultValue={obra.unit ?? ""} />
        <Field label="Início" name="start_date" type="date" defaultValue={obra.start_date ?? ""} />
      </div>
      <SelectField label="Situação" name="status" options={STATUS} defaultValue={obra.status} required />
    </FormSheet>
  );
}
