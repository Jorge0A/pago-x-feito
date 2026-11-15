"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendLoginEmail, verifyLoginCode } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [sendState, sendAction, sending] = useActionState(sendLoginEmail, null);
  const [verifyState, verifyAction, verifying] = useActionState(verifyLoginCode, null);
  const [email, setEmail] = useState("");
  const sent = sendState?.ok === true;

  useEffect(() => {
    if (sendState?.ok && sendState.message) setEmail(sendState.message);
  }, [sendState]);

  if (!sent) {
    return (
      <form action={sendAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div className="space-y-2">
          <Label htmlFor="email">Seu e-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            required
            placeholder="voce@exemplo.com.br"
            className="h-12 text-base"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {sendState && !sendState.ok && <p className="text-sm text-destructive">{sendState.error}</p>}
        <Button type="submit" className="h-12 w-full text-base" disabled={sending}>
          {sending ? "Enviando…" : "Receber link de acesso"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Sem senha. Enviamos um link e um código de 6 dígitos para o seu e-mail.
        </p>
      </form>
    );
  }

  return (
    <form action={verifyAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="email" value={email} />
      <p className="text-sm">
        Enviamos um e-mail para <strong>{email}</strong>. Toque no link ou digite o código abaixo.
      </p>
      <div className="space-y-2">
        <Label htmlFor="token">Código de 6 dígitos</Label>
        <Input
          id="token"
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          placeholder="000000"
          className="h-12 text-center text-2xl tracking-[0.4em]"
        />
      </div>
      {verifyState && !verifyState.ok && <p className="text-sm text-destructive">{verifyState.error}</p>}
      <Button type="submit" className="h-12 w-full text-base" disabled={verifying}>
        {verifying ? "Entrando…" : "Entrar"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() => window.location.reload()}
      >
        Usar outro e-mail
      </Button>
    </form>
  );
}
