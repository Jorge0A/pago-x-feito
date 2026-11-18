import { normalizeHeader } from "./parse";
import type { Cell, ColumnMapping, ImportField } from "./types";

/**
 * Header keywords (already normalized: lowercase, no accents). Order within a field = priority.
 * `exact` wins over `contains`.
 */
const KEYWORDS: Record<ImportField, { exact: string[]; contains: string[] }> = {
  supplier: {
    exact: ["fornecedor", "fornecedores", "empresa", "prestador", "contratado", "razao social", "profissional", "nome"],
    contains: ["fornecedor", "prestador", "empresa", "razao social", "profissional"],
  },
  category: {
    exact: ["categoria", "etapa", "disciplina", "grupo", "area", "ambiente", "setor", "tipo", "servico", "servicos"],
    contains: ["categoria", "etapa", "disciplina", "grupo", "ambiente"],
  },
  description: {
    exact: ["descricao", "item", "discriminacao", "especificacao", "atividade", "detalhe", "descricao do servico", "escopo", "o que"],
    contains: ["descri", "discrimina", "especifica", "atividade", "escopo", "item"],
  },
  qty: { exact: ["qtd", "qtde", "quant", "quantidade", "qt"], contains: ["quantid", "qtd"] },
  unit: { exact: ["un", "und", "unid", "unidade", "un."], contains: ["unid"] },
  unit_price: {
    exact: ["valor unitario", "preco unitario", "vlr unit", "valor unit", "custo unitario", "unitario", "preco unit", "v. unit", "r$ unit"],
    contains: ["unitar", "unit."],
  },
  total: {
    exact: ["total", "valor total", "subtotal", "valor", "preco", "custo", "orcado", "orcamento", "valor (r$)", "preco total", "r$", "vlr total", "valor r$", "total r$"],
    contains: ["total", "valor", "preco", "custo", "orcad", "r$"],
  },
  cnpj: { exact: ["cnpj", "cpf/cnpj", "cnpj/cpf", "documento"], contains: ["cnpj"] },
  contact: { exact: ["contato", "responsavel", "nome do contato", "pessoa de contato"], contains: ["contato", "responsavel"] },
  phone: { exact: ["telefone", "celular", "whatsapp", "fone", "tel", "tel."], contains: ["telefone", "celular", "whats", "fone"] },
  email: { exact: ["e-mail", "email"], contains: ["mail"] },
  notes: { exact: ["obs", "obs.", "observacoes", "observacao", "comentarios", "notas"], contains: ["observa", "coment", "obs"] },
};

/** Fields that must not share a column; lower index = assigned first when scores tie. */
const PRIORITY: ImportField[] = [
  "description",
  "total",
  "unit_price",
  "supplier",
  "category",
  "qty",
  "unit",
  "cnpj",
  "phone",
  "email",
  "contact",
  "notes",
];

interface Candidate {
  field: ImportField;
  column: number;
  score: number;
}

function scoreHeader(header: string, field: ImportField): number {
  if (!header) return 0;
  const k = KEYWORDS[field];
  if (k.exact.includes(header)) return 3;
  for (const c of k.contains) if (header.includes(c)) return 1.5;
  return 0;
}

function looksNumeric(values: Cell[]): number {
  let n = 0;
  let total = 0;
  for (const v of values) {
    if (v === null) continue;
    total++;
    if (typeof v === "number") n++;
    else if (typeof v === "string" && /^[\s(R$\-]*[\d.,]+\s*\)?$/.test(v)) n++;
  }
  return total === 0 ? 0 : n / total;
}

/**
 * Maps header columns to import fields by keyword, then sanity-checks money columns against the
 * data below them. Returns the mapping and a 0–1 confidence for the core fields.
 */
export function mapColumns(headers: Cell[], dataRows: Cell[][]): { mapping: ColumnMapping; confidence: number } {
  const norm = headers.map(normalizeHeader);
  const candidates: Candidate[] = [];
  for (let col = 0; col < norm.length; col++) {
    const h = norm[col] ?? "";
    for (const field of PRIORITY) {
      const s = scoreHeader(h, field);
      if (s > 0) candidates.push({ field, column: col, score: s });
    }
  }

  // Special cases: "servico"/"servicos" is a description when no description column exists.
  // Resolve greedily by score, then priority, then column order.
  candidates.sort((a, b) => b.score - a.score || PRIORITY.indexOf(a.field) - PRIORITY.indexOf(b.field) || a.column - b.column);
  const mapping: ColumnMapping = {};
  const usedCols = new Set<number>();
  for (const c of candidates) {
    if (mapping[c.field] !== undefined || usedCols.has(c.column)) continue;
    // Money columns must mostly hold numbers.
    if ((c.field === "total" || c.field === "unit_price" || c.field === "qty") && dataRows.length > 0) {
      const share = looksNumeric(dataRows.map((r) => r[c.column] ?? null));
      if (share < 0.4) continue;
    }
    mapping[c.field] = c.column;
    usedCols.add(c.column);
  }

  // "servico" captured as category but there is no description: move it.
  if (mapping.description === undefined && mapping.category !== undefined) {
    const h = norm[mapping.category] ?? "";
    if (h.startsWith("servico")) {
      mapping.description = mapping.category;
      delete mapping.category;
    }
  }

  // If there is a unit price and no total, but a numeric column labelled like money remains, take it.
  if (mapping.total === undefined) {
    for (let col = 0; col < norm.length; col++) {
      if (usedCols.has(col)) continue;
      const h = norm[col] ?? "";
      if (/total|valor|preco|r\$/.test(h) && looksNumeric(dataRows.map((r) => r[col] ?? null)) >= 0.4) {
        mapping.total = col;
        usedCols.add(col);
        break;
      }
    }
  }

  let confidence = 0;
  if (mapping.description !== undefined) confidence += 0.4;
  if (mapping.total !== undefined || mapping.unit_price !== undefined) confidence += 0.4;
  if (mapping.supplier !== undefined || mapping.category !== undefined) confidence += 0.2;
  return { mapping, confidence };
}

/** Picks the header row: the one among the first 40 that matches the most known keywords. */
export function detectHeaderRow(rows: Cell[][]): number {
  let best = -1;
  let bestScore = 0;
  const limit = Math.min(rows.length, 40);
  for (let i = 0; i < limit; i++) {
    const row = rows[i] ?? [];
    const strings = row.filter((c) => typeof c === "string") as string[];
    if (strings.length < 2) continue;
    let score = 0;
    for (const s of strings) {
      const h = normalizeHeader(s);
      for (const field of PRIORITY) {
        const sc = scoreHeader(h, field);
        if (sc > 0) {
          score += sc;
          break;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  if (best >= 0 && bestScore >= 3) return best;
  // Fallback: first row with at least 3 text cells.
  for (let i = 0; i < limit; i++) {
    const row = rows[i] ?? [];
    if (row.filter((c) => typeof c === "string").length >= 3) return i;
  }
  return 0;
}
