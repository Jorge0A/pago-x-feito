import { describe, expect, it } from "vitest";
import { summarizeBySupplier, summarizeObra } from "./summary";

const lines = [
  { id: "l1", supplier_id: "s1", category: "Projeto", description: "Planilha", budgeted_centavos: 450000, contracted_centavos: 450000 },
  { id: "l2", supplier_id: "s2", category: "Pintura", description: "Paredes", budgeted_centavos: 800000, contracted_centavos: null },
  { id: "l3", supplier_id: "s2", category: "Pintura", description: "Teto", budgeted_centavos: 200000, contracted_centavos: 250000 },
];

describe("summarizeObra", () => {
  it("computes per-line and totals with allocated and unallocated payments", () => {
    const s = summarizeObra(lines, [
      { id: "p1", supplier_id: "s1", budget_line_id: "l1", amount_centavos: 225000 },
      { id: "p2", supplier_id: "s2", budget_line_id: null, amount_centavos: 150000 },
    ]);
    expect(s.budgeted).toBe(1450000);
    expect(s.committed).toBe(1500000); // 450000 + 800000 + 250000
    expect(s.paidAllocated).toBe(225000);
    expect(s.paidUnallocated).toBe(150000);
    expect(s.paidTotal).toBe(375000);
    expect(s.owed).toBe(1500000 - 225000 - 150000);
    const l1 = s.lines.find((l) => l.line.id === "l1")!;
    expect(l1.owed).toBe(225000);
    const pintura = s.categories.find((c) => c.category === "Pintura")!;
    expect(pintura.committed).toBe(1050000);
    expect(pintura.paid).toBe(0);
  });
  it("never reports negative owed", () => {
    const s = summarizeObra([lines[0]!], [
      { id: "p1", supplier_id: "s1", budget_line_id: "l1", amount_centavos: 500000 },
    ]);
    expect(s.lines[0]!.owed).toBe(0);
    expect(s.owed).toBe(0);
  });
  it("handles an empty obra", () => {
    const s = summarizeObra([], []);
    expect(s.paidTotal).toBe(0);
    expect(s.categories).toEqual([]);
  });
});

describe("summarizeBySupplier", () => {
  it("groups committed and paid per supplier, payments regardless of line", () => {
    const names = new Map([["s1", "BALT"], ["s2", "Pintor"]]);
    const out = summarizeBySupplier(lines, [
      { id: "p1", supplier_id: "s1", budget_line_id: "l1", amount_centavos: 225000 },
      { id: "p2", supplier_id: "s2", budget_line_id: null, amount_centavos: 150000 },
    ], names);
    expect(out.map((s) => s.name)).toEqual(["Pintor", "BALT"]);
    const pintor = out[0]!;
    expect(pintor.committed).toBe(1050000);
    expect(pintor.paid).toBe(150000);
    expect(pintor.owed).toBe(900000);
    expect(out[1]!.owed).toBe(225000);
  });
});
