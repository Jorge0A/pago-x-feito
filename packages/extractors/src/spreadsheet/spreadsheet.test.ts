import { describe, expect, it } from "vitest";
import { utils, write } from "xlsx";
import { analyzeSpreadsheet } from "./index";
import { SPREADSHEET_FIXTURES } from "../fixtures/spreadsheets";

function toXlsx(sheets: Array<{ name: string; rows: unknown[][] }>): Buffer {
  const wb = utils.book_new();
  for (const s of sheets) utils.book_append_sheet(wb, utils.aoa_to_sheet(s.rows), s.name);
  return write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("analyzeSpreadsheet (fixtures)", () => {
  for (const f of SPREADSHEET_FIXTURES) {
    it(`handles ${f.name}`, () => {
      const result = analyzeSpreadsheet(toXlsx(f.sheets));
      expect(result.kind).toBe(f.expect.kind);
      const best = result.sheets[result.bestSheetIndex]!;
      expect(best.sheetName).toBe(f.expect.bestSheet);
      expect(best.headerRowIndex).toBe(f.expect.headerRowIndex);
      expect(best.mapping).toEqual(f.expect.mapping);
      expect(best.rows).toHaveLength(f.expect.rowCount);
      expect(best.totals.totalCentavos).toBe(f.expect.totalCentavos);
      if (f.expect.suppliers !== undefined) expect(best.totals.suppliers).toBe(f.expect.suppliers);
      if (f.expect.firstRow) expect(best.rows[0]).toMatchObject(f.expect.firstRow);
    });
  }

  it("inherits merged-cell categories and skips subtotal rows", () => {
    const f = SPREADSHEET_FIXTURES[0]!;
    const best = analyzeSpreadsheet(toXlsx(f.sheets)).sheets[0]!;
    expect(best.rows.map((r) => r.category)).toEqual(["Demolição", "Demolição", "Elétrica", "Elétrica", "Pintura"]);
    expect(best.rows.some((r) => /total/i.test(r.description))).toBe(false);
    expect(best.warnings.join(" ")).toMatch(/herdaram a categoria/);
  });

  it("computes totals from unit price × qty when there is no total column", () => {
    const f = SPREADSHEET_FIXTURES[1]!;
    const best = analyzeSpreadsheet(toXlsx(f.sheets)).sheets[0]!;
    const sanca = best.rows.find((r) => r.description.startsWith("Sanca"))!;
    expect(sanca.unit_price_centavos).toBe(15000);
    expect(sanca.qty).toBe(40);
    expect(sanca.total_centavos).toBe(600000);
    expect(sanca.category).toBe("GESSO");
    expect(best.rows[0]!.cnpj).toBe("11222333000181");
  });

  it("accepts a user override of the mapping", () => {
    const f = SPREADSHEET_FIXTURES[2]!;
    const result = analyzeSpreadsheet(toXlsx(f.sheets), {
      overrides: { Plan1: { headerRowIndex: 0, mapping: { description: 0, total: 1 } } },
    });
    const best = result.sheets[0]!;
    expect(best.mappingSource).toBe("user");
    expect(best.rows).toHaveLength(2);
    expect(best.totals.totalCentavos).toBe(400);
    expect(result.kind).toBe("budget");
  });

  it("reads csv too", () => {
    const csv = Buffer.from("Descrição;Valor\nPintura;R$ 1.000,00\nGesso;500,00\n", "utf8");
    const result = analyzeSpreadsheet(csv);
    expect(result.sheets[0]!.rows).toHaveLength(2);
    expect(result.sheets[0]!.totals.totalCentavos).toBe(150000);
  });
});
