export const IMPORT_FIELDS = [
  "supplier",
  "category",
  "description",
  "qty",
  "unit",
  "unit_price",
  "total",
  "cnpj",
  "contact",
  "phone",
  "email",
  "notes",
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  supplier: "Fornecedor",
  category: "Categoria / etapa",
  description: "Descrição do item",
  qty: "Quantidade",
  unit: "Unidade",
  unit_price: "Valor unitário",
  total: "Valor total",
  cnpj: "CNPJ",
  contact: "Contato",
  phone: "Telefone / WhatsApp",
  email: "E-mail",
  notes: "Observações",
};

/** field → zero-based column index in the sheet */
export type ColumnMapping = Partial<Record<ImportField, number>>;

export type Cell = string | number | boolean | null;

export interface ImportRow {
  /** 1-based row number as the user sees it in Excel */
  rowNumber: number;
  supplier: string | null;
  category: string | null;
  description: string;
  qty: number | null;
  unit: string | null;
  unit_price_centavos: number | null;
  total_centavos: number | null;
  cnpj: string | null;
  contact: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

export interface SheetAnalysis {
  sheetName: string;
  /** zero-based index of the header row in the raw grid */
  headerRowIndex: number;
  headers: string[];
  mapping: ColumnMapping;
  /** 0–1: how sure the mapper is about the core columns */
  confidence: number;
  mappingSource: "heuristic" | "ai" | "user";
  /** First rows under the header, for the preview UI */
  sampleRows: Cell[][];
  rows: ImportRow[];
  warnings: string[];
  totals: { rowCount: number; totalCentavos: number; suppliers: number; categories: number };
}

export interface SpreadsheetAnalysis {
  sheets: SheetAnalysis[];
  bestSheetIndex: number;
  /** what the best sheet looks like */
  kind: "budget" | "suppliers" | "unknown";
}
