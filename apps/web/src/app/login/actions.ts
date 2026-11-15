"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { runAction, str, type ActionResult } from "@/lib/action-result";

const emailSchema = z.email("Informe um e-mail válido");

export async function sendLoginEmail(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const email = emailSchema.parse(str(fd, "email")?.trim().toLowerCase());
    const next = str(fd, "next") || "/app";
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${publicEnv.appUrl}/auth/callback?next=${encodeURIComponent(next)}`,
        shouldCreateUser: true,
      },
    });
    if (error) return { ok: false, error: translateAuthError(error.message) };
    return { ok: true, message: email };
  });
}

export async function verifyLoginCode(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const email = emailSchema.safeParse(str(fd, "email")?.trim().toLowerCase());
  const token = (str(fd, "token") ?? "").replace(/\D/g, "");
  const next = str(fd, "next") || "/app";
  if (!email.success) return { ok: false, error: "E-mail inválido" };
  if (token.length < 6) return { ok: false, error: "Digite o código de 6 dígitos" };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.data, token, type: "email" });
  if (error) return { ok: false, error: translateAuthError(error.message) };
  redirect(next.startsWith("/") ? next : "/app");
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  }
  if (m.includes("expired") || m.includes("invalid")) {
    return "Código inválido ou expirado. Peça um novo código.";
  }
  return message;
}
