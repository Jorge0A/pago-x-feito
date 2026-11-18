import { parseBRL, cleanCNPJ } from "@pxf/core";
import { normalizeHeader } from "./parse";
import type { Cell, ColumnMapping, ImportRow } from "./types";

function text(c: Cell | undefined): string | null {
  if (c === null || c === undefined || c === "") return null;
  if (typeof c === "boolean") return null;
  return String(c).trim() || null;
}

function money(c: Cell | undefined): number | null {
  if (c === null || c === undefined || c === "" || typeof c === "boolean") return null;
  if (typeof c === "number") return Number.isFinite(c) ? Math.round(c * 100) : null;
  return parseBRL(c);
}

function quantity(c: Cell | undefined): number | null {
  if (c === null || c === undefined || c === "" || typeof c === "boolean") return null;
  if (typeof c === "number") return Number.isFinite(c) ? c : null;
  const n = Number(String(c).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const TOTAL_ROW = /^(sub)?total|^soma|^resumo|^valor total/i;

/**
 * Turns the grid under the header into import rows.
 * - Section headers (a lone text cell in the description/category column, no money) set the category.
 * - Empty category/supplier cells inherit from the row above (merged cells in Excel).
 * - Total/subtotal rows are skipped.
 * - total = qty × unit price when the sheet has no total column.
 */
export function extractRows(rows: Cell[][], headerRowIndex: number, mapping: ColumnMapping): { rows: ImportRow[]; warnings: string[] } {
  const out: ImportRow[] = [];
  const warnings: string[] = [];
  let currentCategory: string | null = null;
  let lastSupplier: string | null = null;
  let filledCategory = 0;
  let filledSupplier = 0;

  const col = (f: keyof ColumnMapping) => mapping[f];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const nonEmpty = r.filter((c) => c !== null && c !== "");
    if (nonEmpty.length === 0) continue;

    const descCol = col("description");
    const description = descCol !== undefined ? text(r[descCol]) : null;
    const total = col("total") !== undefined ? money(r[col("total")!]) : null;
    const unitPrice = col("unit_price") !== undefined ? money(r[col("unit_price")!]) : null;
    const qty = col("qty") !== undefined ? quantity(r[col("qty")!]) : null;
    const categoryCell = col("category") !== undefined ? text(r[col("category")!]) : null;
    const supplierCell = col("supplier") !== undefined ? text(r[col("supplier")!]) : null;

    // Section header: one text cell, no money anywhere.
    const textCells = nonEmpty.filter((c) => typeof c === "string");
    if (nonEmpty.length === textCells.length && textCells.length === 1 && total === null && unitPrice === null) {
      const label = String(textCells[0]).trim();
      if (!TOTAL_ROW.test(label)) {
        currentCategory = label;
        continue;
      }
    }

    // Total/subtotal rows: the label may sit in the description or in the category column.
    if (description && TOTAL_ROW.test(normalizeHeader(description))) continue;
    if (!description && textCells.some((c) => TOTAL_ROW.test(normalizeHeader(String(c))))) continue;
    if (!description && total === null && unitPrice === null) continue;

    let category = categoryCell;
    if (!category && col("category") !== undefined && out.length > 0) {
      category = out[out.length - 1]!.category;
      if (category) filledCategory++;
    }
    if (!category) category = currentCategory;

    let supplier = supplierCell;
    if (!supplier && col("supplier") !== undefined && lastSupplier) {
      supplier = lastSupplier;
      filledSupplier++;
    }
    if (supplierCell) lastSupplier = supplierCell;

    let totalCentavos = total;
    if (totalCentavos === null && unitPrice !== null) {
      totalCentavos = Math.round(unitPrice * (qty ?? 1));
    }

    out.push({
      rowNumber: i + 1,
      supplier,
      category,
      description: description ?? (supplier ? `Serviço de ${supplier}` : "Item sem descrição"),
      qty,
      unit: col("unit") !== undefined ? text(r[col("unit")!]) : null,
      unit_price_centavos: unitPrice,
      total_centavos: totalCentavos,
      cnpj: col("cnpj") !== undefined ? (text(r[col("cnpj")!]) ? cleanCNPJ(text(r[col("cnpj")!])!) : null) : null,
      contact: col("contact") !== undefined ? text(r[col("contact")!]) : null,
      phone: col("phone") !== undefined ? text(r[col("phone")!]) : null,
      email: col("email") !== undefined ? text(r[col("email")!]) : null,
      notes: col("notes") !== undefined ? text(r[col("notes")!]) : null,
    });
  }

  if (filledCategory > 0) warnings.push(`${filledCategory} linha(s) herdaram a categoria da linha anterior (células mescladas).`);
  if (filledSupplier > 0) warnings.push(`${filledSupplier} linha(s) herdaram o fornecedor da linha anterior.`);
  const noMoney = out.filter((r) => r.total_centavos === null).length;
  if (noMoney > 0) warnings.push(`${noMoney} linha(s) sem valor; entram com R$ 0,00 orçado.`);
  return { rows: out, warnings };
}
