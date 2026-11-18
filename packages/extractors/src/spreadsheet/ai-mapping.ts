import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { MODELS, estimateCostMicros, type UsageSink } from "../config";
import { IMPORT_FIELDS, IMPORT_FIELD_LABELS, type Cell, type ColumnMapping } from "./types";

const MappingSchema = z.object({
  columns: z.array(
    z.object({
      column_index: z.number().int().min(0),
      field: z.enum(IMPORT_FIELDS),
    }),
  ),
  notes: z.string(),
});

const SYSTEM = `You map spreadsheet columns from Brazilian renovation budgets (orçamento de obra) and supplier lists to a fixed set of fields.
Fields: ${IMPORT_FIELDS.map((f) => `${f} = ${IMPORT_FIELD_LABELS[f]}`).join("; ")}.
Rules: each field at most once; only map a column when you are confident; money columns contain numbers or "R$" values; "serviço" is usually the description when there is no other description column, otherwise the category. Leave out columns that fit no field. Headers and data are in Portuguese.`;

/**
 * Asks the fast model to map columns when the heuristic is unsure. Only headers and a few sample
 * rows are sent. Usage is reported through `sink` so the caller can log cost per obra.
 */
export async function suggestMappingWithAI(
  headers: string[],
  sampleRows: Cell[][],
  opts: { client?: Anthropic; sink?: UsageSink } = {},
): Promise<{ mapping: ColumnMapping; notes: string }> {
  const client = opts.client ?? new Anthropic();
  const model = MODELS.fast;
  const started = Date.now();
  const user = JSON.stringify({
    headers: headers.map((h, i) => ({ column_index: i, header: h })),
    sample_rows: sampleRows.slice(0, 5),
  });

  try {
    const response = await client.messages.parse({
      model,
      max_tokens: 1024,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: user }],
      output_config: { format: zodOutputFormat(MappingSchema) },
    });
    const usage = response.usage;
    await opts.sink?.({
      model,
      purpose: "spreadsheet.column_mapping",
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cache_read_tokens: usage.cache_read_input_tokens ?? 0,
      cache_write_tokens: usage.cache_creation_input_tokens ?? 0,
      cost_usd_micros: estimateCostMicros(model, {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cache_read_tokens: usage.cache_read_input_tokens ?? 0,
        cache_write_tokens: usage.cache_creation_input_tokens ?? 0,
      }),
      duration_ms: Date.now() - started,
      ok: response.parsed_output !== null,
    });
    const parsed = response.parsed_output;
    if (!parsed) return { mapping: {}, notes: "A IA não conseguiu mapear as colunas." };
    const mapping: ColumnMapping = {};
    for (const c of parsed.columns) {
      if (c.column_index < headers.length && mapping[c.field] === undefined) mapping[c.field] = c.column_index;
    }
    return { mapping, notes: parsed.notes };
  } catch (e) {
    await opts.sink?.({
      model,
      purpose: "spreadsheet.column_mapping",
      input_tokens: 0,
      output_tokens: 0,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      cost_usd_micros: 0,
      duration_ms: Date.now() - started,
      ok: false,
    });
    throw e;
  }
}
