import type { Metadata } from "next";
import { MessageCircle, Pencil, Phone, Plus } from "lucide-react";
import { formatCNPJ, listSuppliers } from "@pxf/core";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SupplierSheet } from "./supplier-form";

export const metadata: Metadata = { title: "Fornecedores" };

function waLink(number: string): string {
  const digits = number.replace(/\D/g, "");
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

export default async function FornecedoresPage({ params }: { params: Promise<{ obraId: string }> }) {
  const { obraId } = await params;
  const supabase = await createClient();
  const suppliers = await listSuppliers(supabase, obraId);

  const addButton = (
    <SupplierSheet
      obraId={obraId}
      trigger={
        <Button size="sm">
          <Plus className="size-4" /> Novo
        </Button>
      }
    />
  );

  return (
    <>
      <PageHeader title="Fornecedores" subtitle={`${suppliers.length} cadastrado${suppliers.length === 1 ? "" : "s"}`} action={addButton} />
      <main className="mx-auto w-full max-w-lg px-4 py-5">
        {suppliers.length === 0 ? (
          <EmptyState
            title="Nenhum fornecedor ainda"
            description="Cadastre quem vai trabalhar na obra: arquiteto, marceneiro, eletricista…"
            action={addButton}
          />
        ) : (
          <ul className="space-y-3">
            {suppliers.map((s) => (
              <li key={s.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {s.category && <Badge variant="secondary">{s.category}</Badge>}
                      {s.cnpj && <span className="tabular-nums">{formatCNPJ(s.cnpj)}</span>}
                    </div>
                    {s.contact_name && <p className="mt-1 text-sm text-muted-foreground">{s.contact_name}</p>}
                  </div>
                  <SupplierSheet
                    obraId={obraId}
                    supplier={s}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`Editar ${s.name}`}>
                        <Pencil className="size-4" />
                      </Button>
                    }
                  />
                </div>
                {(s.whatsapp_number || s.phone) && (
                  <div className="mt-3 flex gap-2">
                    {s.whatsapp_number && (
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<a href={waLink(s.whatsapp_number)} target="_blank" rel="noopener noreferrer" />}
                      >
                        <MessageCircle className="size-4" /> WhatsApp
                      </Button>
                    )}
                    {s.phone && (
                      <Button variant="outline" size="sm" nativeButton={false} render={<a href={`tel:${s.phone.replace(/\D/g, "")}`} />}>
                        <Phone className="size-4" /> Ligar
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
