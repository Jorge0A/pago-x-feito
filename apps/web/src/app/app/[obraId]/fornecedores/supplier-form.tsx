"use client";

import type { Tables } from "@pxf/db";
import { formatCNPJ, SUPPLIER_CATEGORIES } from "@pxf/core";
import { FormSheet } from "@/components/app/form-sheet";
import { Field, SelectField } from "@/components/app/field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSupplierAction, updateSupplierAction } from "./actions";

const categories = SUPPLIER_CATEGORIES.map((c) => ({ value: c, label: c }));

export function SupplierSheet({
  obraId,
  supplier,
  trigger,
}: {
  obraId: string;
  supplier?: Tables<"suppliers">;
  trigger: React.ReactElement;
}) {
  const action = supplier
    ? updateSupplierAction.bind(null, obraId, supplier.id)
    : createSupplierAction.bind(null, obraId);
  return (
    <FormSheet
      trigger={trigger}
      title={supplier ? "Editar fornecedor" : "Novo fornecedor"}
      action={action}
      successMessage={supplier ? "Fornecedor atualizado" : "Fornecedor cadastrado"}
    >
      <Field label="Nome" name="name" required defaultValue={supplier?.name} placeholder="BALT Arquitetura LTDA" />
      <SelectField
        label="Categoria"
        name="category"
        options={categories}
        defaultValue={supplier?.category}
        placeholder="Selecione a categoria"
      />
      <Field
        label="CNPJ (opcional)"
        name="cnpj"
        inputMode="numeric"
        defaultValue={supplier?.cnpj ? formatCNPJ(supplier.cnpj) : ""}
        placeholder="00.000.000/0000-00"
      />
      <Field label="Contato" name="contact_name" defaultValue={supplier?.contact_name ?? ""} placeholder="Nome da pessoa" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="WhatsApp" name="whatsapp_number" inputMode="tel" defaultValue={supplier?.whatsapp_number ?? ""} placeholder="11 9…" />
        <Field label="Telefone" name="phone" inputMode="tel" defaultValue={supplier?.phone ?? ""} />
      </div>
      <Field label="E-mail" name="email" type="email" inputMode="email" defaultValue={supplier?.email ?? ""} />
      <div className="space-y-1.5">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={supplier?.notes ?? ""} className="text-base" />
      </div>
    </FormSheet>
  );
}
