import { z } from "zod";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export const initialActionState: ActionResult | null = null;

/** Turns a zod error into the first readable pt-BR message. */
export function zodMessage(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return "Dados inválidos";
  return first.message;
}

/** Wraps a server action body so unexpected errors become a result instead of a crash. */
export async function runAction(fn: () => Promise<ActionResult | void>): Promise<ActionResult> {
  try {
    const r = await fn();
    return r ?? { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: zodMessage(e) };
    // Next.js redirect() throws; let it propagate.
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) {
      throw e;
    }
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Erro inesperado" };
  }
}

export function str(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" ? v : undefined;
}

export function int(fd: FormData, key: string): number | undefined {
  const v = str(fd, key);
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isInteger(n) ? n : undefined;
}

export function num(fd: FormData, key: string): number | undefined {
  const v = str(fd, key);
  if (v === undefined || v === "") return undefined;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}
