import type { Metadata } from "next";
import { LogOut, Pencil } from "lucide-react";
import { formatDateBR, getObra, workHoursOf, type WorkHours } from "@pxf/core";
import { createClient, getUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ObraSheet } from "./obra-form";

export const metadata: Metadata = { title: "Obra" };

const STATUS_LABEL: Record<string, string> = {
  planning: "Planejamento",
  in_progress: "Em andamento",
  finished: "Concluída",
};

const DAY_LABEL: Array<[keyof Omit<WorkHours, "holidays">, string]> = [
  ["mon", "Segunda"],
  ["tue", "Terça"],
  ["wed", "Quarta"],
  ["thu", "Quinta"],
  ["fri", "Sexta"],
  ["sat", "Sábado"],
  ["sun", "Domingo"],
];

export default async function ObraPage({ params }: { params: Promise<{ obraId: string }> }) {
  const { obraId } = await params;
  const supabase = await createClient();
  const [obra, user] = await Promise.all([getObra(supabase, obraId), getUser()]);
  if (!obra) return null;
  const wh = workHoursOf(obra.building);

  return (
    <>
      <PageHeader
        title="Obra"
        subtitle={user?.email ?? undefined}
        action={
          <ObraSheet
            obra={obra}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil className="size-4" /> Editar
              </Button>
            }
          />
        }
      />
      <main className="mx-auto w-full max-w-lg space-y-6 px-4 py-5">
        <section className="space-y-1 rounded-xl border p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{obra.title}</h2>
            <Badge variant="secondary">{STATUS_LABEL[obra.status] ?? obra.status}</Badge>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 text-sm">
            <Item label="Unidade" value={obra.unit ?? "—"} />
            <Item label="Início" value={obra.start_date ? formatDateBR(obra.start_date) : "—"} />
          </dl>
        </section>

        <section className="space-y-3 rounded-xl border p-4">
          <div>
            <h2 className="font-semibold">{obra.building.name}</h2>
            <p className="text-sm text-muted-foreground">
              {[obra.building.neighborhood, obra.building.city].filter(Boolean).join(", ")}
            </p>
          </div>
          <div>
            <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Horário de obra</h3>
            <ul className="divide-y rounded-lg border text-sm">
              {DAY_LABEL.map(([key, label]) => (
                <li key={key} className="flex justify-between px-3 py-1.5">
                  <span>{label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {wh[key].length === 0 ? "Sem obra" : wh[key].map(([a, b]) => `${a}–${b}`).join(", ")}
                  </span>
                </li>
              ))}
              <li className="flex justify-between px-3 py-1.5">
                <span>Feriados</span>
                <span className="text-muted-foreground">{wh.holidays ? "Permitido" : "Sem obra"}</span>
              </li>
            </ul>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Os documentos do condomínio (manual, procedimentos, atas) entram na v1 e alimentam estas regras.
            </p>
          </div>
        </section>

        <form action="/auth/signout" method="post">
          <Button type="submit" variant="outline" className="w-full">
            <LogOut className="size-4" /> Sair
          </Button>
        </form>
      </main>
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
