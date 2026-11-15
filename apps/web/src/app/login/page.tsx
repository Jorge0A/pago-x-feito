import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const safeNext = next && next.startsWith("/") ? next : "/app";
  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm space-y-8">
        <div className="space-y-2">
          <div className="flex size-12 items-center justify-center rounded-xl bg-[#0f5132] text-xl font-bold text-white">
            P×F
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Pago x Feito</h1>
          <p className="text-sm text-muted-foreground">O registro organizado da sua obra.</p>
        </div>
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error === "link"
              ? "Esse link não é mais válido. Peça um novo abaixo."
              : "Não foi possível entrar. Tente de novo."}
          </p>
        )}
        <LoginForm next={safeNext} />
      </div>
    </main>
  );
}
