/**
 * Real-looking spreadsheet fixtures as cell grids, plus the expected analysis.
 * Built into .xlsx in tests with SheetJS, so the whole read → map → extract path is exercised.
 */
import type { Cell } from "../spreadsheet/types";

export interface SpreadsheetFixture {
  name: string;
  sheets: Array<{ name: string; rows: Cell[][] }>;
  expect: {
    kind: "budget" | "suppliers" | "unknown";
    bestSheet: string;
    headerRowIndex: number;
    mapping: Record<string, number>;
    rowCount: number;
    totalCentavos: number;
    suppliers?: number;
    firstRow?: Partial<{ supplier: string; category: string; description: string; total_centavos: number }>;
  };
}

/** Engineer's planilha: title rows, merged-cell categories, subtotal rows, pt-BR money as text. */
export const planilhaEngenheiro: SpreadsheetFixture = {
  name: "planilha-engenheiro",
  sheets: [
    {
      name: "Orçamento",
      rows: [
        ["ORÇAMENTO EXECUTIVO — APTO 101", null, null, null, null, null],
        ["Condomínio Leaf Loefgren", null, null, null, null, null],
        [null, null, null, null, null, null],
        ["Etapa", "Descrição", "Fornecedor", "Qtd", "Unid.", "Valor total (R$)"],
        ["Demolição", "Remoção de piso e contrapiso", "Equipe Silva Demolições", 85, "m²", "R$ 6.800,00"],
        [null, "Remoção de forro de gesso", "Equipe Silva Demolições", 60, "m²", "1.500,00"],
        ["Elétrica", "Infraestrutura elétrica completa", "JR Instalações", 1, "vb", 18500],
        [null, "Quadro de distribuição novo", "JR Instalações", 1, "un", 2400.5],
        ["Subtotal", null, null, null, null, "R$ 29.200,50"],
        ["Pintura", "Pintura paredes e teto", "Pinturas Oliveira", 320, "m²", "9.600,00"],
        ["TOTAL GERAL", null, null, null, null, "38.800,50"],
      ],
    },
    { name: "Memória", rows: [["Observações"], ["Valores válidos por 15 dias."]] },
  ],
  expect: {
    kind: "budget",
    bestSheet: "Orçamento",
    headerRowIndex: 3,
    mapping: { category: 0, description: 1, supplier: 2, qty: 3, unit: 4, total: 5 },
    rowCount: 5,
    totalCentavos: 680000 + 150000 + 1850000 + 240050 + 960000,
    suppliers: 3,
    firstRow: { supplier: "Equipe Silva Demolições", category: "Demolição", description: "Remoção de piso e contrapiso", total_centavos: 680000 },
  },
};

/** Supplier list from the engineer: one service per supplier, unit price only, section headers. */
export const listaFornecedores: SpreadsheetFixture = {
  name: "lista-fornecedores",
  sheets: [
    {
      name: "Fornecedores",
      rows: [
        ["Fornecedor", "Serviço", "Contato", "WhatsApp", "CNPJ", "Valor unitário", "Qtde", "Obs"],
        ["MARCENARIA"],
        ["Móveis Planejados Lima", "Marcenaria cozinha e quartos", "Carlos", "11 98888-1111", "11.222.333/0001-81", "R$ 42.000,00", 1, "Prazo 45 dias"],
        ["GESSO"],
        ["Gesso & Cia", "Forro de gesso acartonado", "Ana", "(11) 97777-2222", null, 85.5, 120, null],
        ["Gesso & Cia", "Sanca com iluminação", "Ana", "(11) 97777-2222", null, "150,00", 40, null],
      ],
    },
  ],
  expect: {
    kind: "budget",
    bestSheet: "Fornecedores",
    headerRowIndex: 0,
    mapping: { supplier: 0, description: 1, contact: 2, phone: 3, cnpj: 4, unit_price: 5, qty: 6, notes: 7 },
    rowCount: 3,
    totalCentavos: 4200000 + Math.round(8550 * 120) + 15000 * 40,
    suppliers: 2,
    firstRow: { supplier: "Móveis Planejados Lima", category: "MARCENARIA", description: "Marcenaria cozinha e quartos", total_centavos: 4200000 },
  },
};

/** A sheet with unknown headers: the heuristic should return low confidence, not garbage. */
export const planilhaDesconhecida: SpreadsheetFixture = {
  name: "planilha-desconhecida",
  sheets: [
    {
      name: "Plan1",
      rows: [
        ["A", "B", "C"],
        ["x", 1, 2],
        ["y", 3, 4],
      ],
    },
  ],
  expect: { kind: "unknown", bestSheet: "Plan1", headerRowIndex: 0, mapping: {}, rowCount: 0, totalCentavos: 0 },
};

export const SPREADSHEET_FIXTURES = [planilhaEngenheiro, listaFornecedores, planilhaDesconhecida];
