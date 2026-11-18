import { readWorkbook, normalizeHeader } from "./parse";
import { detectHeaderRow, mapColumns } from "./mapping";
import { extractRows } from "./rows";
import type { Cell, ColumnMapping, SheetAnalysis, SpreadsheetAnalysis } from "./types";

export * from "./types";
export { readWorkbook, normalizeHeader } from "./parse";
export { mapColumns, detectHeaderRow } from "./mapping";
export { extractRows } from "./rows";

export interface AnalyzeOptions {
  /** Per sheet name: header row and mapping chosen by the user in the preview. */
  overrides?: Record<string, { headerRowIndex?: number; mapping?: ColumnMapping }>;
}

export function analyzeSheet(name: string, rows: Cell[][], override?: { headerRowIndex?: number; mapping?: ColumnMapping }): SheetAnalysis {
  const headerRowIndex = override?.headerRowIndex ?? detectHeaderRow(rows);
  const headerCells = rows[headerRowIndex] ?? [];
  const headers = headerCells.map((c) => (c === null ? "" : String(c)));
  const dataRows = rows.slice(headerRowIndex + 1, headerRowIndex + 41);
  const heuristic = mapColumns(headerCells, dataRows);
  const mapping = override?.mapping ?? heuristic.mapping;
  const { rows: imported, warnings } = extractRows(rows, headerRowIndex, mapping);
  const suppliers = new Set(imported.map((r) => r.supplier && normalizeHeader(r.supplier)).filter(Boolean));
  const categories = new Set(imported.map((r) => r.category && normalizeHeader(r.category)).filter(Boolean));
  return {
    sheetName: name,
    headerRowIndex,
    headers,
    mapping,
    confidence: override?.mapping ? 1 : heuristic.confidence,
    mappingSource: override?.mapping ? "user" : "heuristic",
    sampleRows: rows.slice(headerRowIndex + 1, headerRowIndex + 6),
    rows: imported,
    warnings,
    totals: {
      rowCount: imported.length,
      totalCentavos: imported.reduce((a, r) => a + (r.total_centavos ?? 0), 0),
      suppliers: suppliers.size,
      categories: categories.size,
    },
  };
}

/** Deterministic analysis of a spreadsheet. No AI. */
export function analyzeSpreadsheet(data: ArrayBuffer | Uint8Array | Buffer, opts: AnalyzeOptions = {}): SpreadsheetAnalysis {
  const sheets = readWorkbook(data).map((s) => analyzeSheet(s.name, s.rows, opts.overrides?.[s.name]));
  if (sheets.length === 0) return { sheets: [], bestSheetIndex: -1, kind: "unknown" };
  let best = 0;
  for (let i = 1; i < sheets.length; i++) {
    const a = sheets[i]!;
    const b = sheets[best]!;
    if (a.confidence > b.confidence || (a.confidence === b.confidence && a.rows.length > b.rows.length)) best = i;
  }
  const s = sheets[best]!;
  let kind: SpreadsheetAnalysis["kind"] = "unknown";
  if (s.mapping.description !== undefined && (s.mapping.total !== undefined || s.mapping.unit_price !== undefined)) kind = "budget";
  else if (s.mapping.supplier !== undefined && (s.mapping.phone !== undefined || s.mapping.email !== undefined || s.mapping.cnpj !== undefined)) kind = "suppliers";
  return { sheets, bestSheetIndex: best, kind };
}
