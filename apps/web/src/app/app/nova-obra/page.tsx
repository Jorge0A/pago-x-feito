import type { Metadata } from "next";
import { NovaObraForm } from "./nova-obra-form";

export const metadata: Metadata = { title: "Nova obra" };

export default function NovaObraPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Vamos começar sua obra</h1>
        <p className="text-sm text-muted-foreground">
          Informe o condomínio e dê um nome à obra. Você pode ajustar tudo depois.
        </p>
      </div>
      <NovaObraForm />
    </main>
  );
}
