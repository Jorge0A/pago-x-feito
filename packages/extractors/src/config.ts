/**
 * Model configuration. Names live here, never in call sites.
 * fast: classification, receipts, NFs, column mapping. strong: contracts, budgets, building documents.
 */
export const MODELS = {
  fast: process.env.PXF_MODEL_FAST ?? "claude-haiku-5-5",
  strong: process.env.PXF_MODEL_STRONG ?? "claude-opus-5-5",
} as const;

/** USD per million tokens, used to log an estimated cost per call. Update when pricing changes. */
export const PRICING_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
};

export interface AiUsage {
  model: string;
  purpose: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  cost_usd_micros: number;
  duration_ms: number;
  ok: boolean;
}

export function estimateCostMicros(model: string, u: Omit<AiUsage, "model" | "purpose" | "cost_usd_micros" | "duration_ms" | "ok">): number {
  const p = PRICING_USD_PER_MTOK[model];
  if (!p) return 0;
  const usd =
    (u.input_tokens * p.input + u.output_tokens * p.output + u.cache_read_tokens * p.input * 0.1 + u.cache_write_tokens * p.input * 1.25) /
    1_000_000;
  return Math.round(usd * 1_000_000);
}

/** Callback the service layer passes in to persist usage into ai_calls. */
export type UsageSink = (usage: AiUsage) => Promise<void> | void;
