"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createObraAction } from "./actions";

export function NovaObraForm() {
  const [state, action, pending] = useActionState(createObraAction, null);
  return (
    <form action={action} className="space-y-5">
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-muted-foreground">Condomínio</legend>
        <Field label="Nome do condomínio" name="building_name" required placeholder="Condomínio Leaf Loefgren" />
        <Field label="Bairro" name="neighborhood" placeholder="Vila Clementino" />
        <Field label="Endereço (opcional)" name="address" placeholder="Rua, número" />
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-muted-foreground">Obra</legend>
        <Field label="Nome da obra" name="title" required placeholder="Obra fina do apartamento" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unidade" name="unit" placeholder="Apto 101" />
          <Field label="Início previsto" name="start_date" type="date" />
        </div>
      </fieldset>
      {state && !state.ok && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="h-12 w-full text-base" disabled={pending}>
        {pending ? "Criando…" : "Criar obra"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  ...props
}: { label: string; name: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} className="h-11 text-base" {...props} />
    </div>
  );
}
