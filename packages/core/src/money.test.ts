import { describe, expect, it } from "vitest";
import { formatBRL, parseBRL, splitInstallments, sumCentavos, percentOf } from "./money";

describe("formatBRL", () => {
  it("formats with thousands dot and decimal comma", () => {
    expect(formatBRL(123456)).toBe("R$ 1.234,56");
    expect(formatBRL(450000)).toBe("R$ 4.500,00");
    expect(formatBRL(5)).toBe("R$ 0,05");
    expect(formatBRL(0)).toBe("R$ 0,00");
    expect(formatBRL(100000000)).toBe("R$ 1.000.000,00");
  });
  it("handles negatives and no symbol", () => {
    expect(formatBRL(-225000)).toBe("-R$ 2.250,00");
    expect(formatBRL(225000, { symbol: false })).toBe("2.250,00");
  });
  it("rejects floats", () => {
    expect(() => formatBRL(12.5)).toThrow(TypeError);
  });
});

describe("parseBRL", () => {
  it("parses pt-BR formats", () => {
    expect(parseBRL("R$ 1.234,56")).toBe(123456);
    expect(parseBRL("1.234,56")).toBe(123456);
    expect(parseBRL("1234,56")).toBe(123456);
    expect(parseBRL("2.250,00")).toBe(225000);
    expect(parseBRL("R$ 4.500,00")).toBe(450000);
  });
  it("treats a lone dot with three digits as thousands", () => {
    expect(parseBRL("4.500")).toBe(450000);
    expect(parseBRL("1.234.567")).toBe(123456700);
  });
  it("treats a lone dot with other digit counts as a decimal point", () => {
    expect(parseBRL("1500.00")).toBe(150000);
    expect(parseBRL("1500.5")).toBe(150050);
    expect(parseBRL("700.1")).toBe(70010);
  });
  it("parses integers, negatives and parentheses", () => {
    expect(parseBRL("1500")).toBe(150000);
    expect(parseBRL("-250,00")).toBe(-25000);
    expect(parseBRL("(250,00)")).toBe(-25000);
    expect(parseBRL(1500)).toBe(150000);
    expect(parseBRL(12.345)).toBe(1235);
  });
  it("rounds a third decimal half up", () => {
    expect(parseBRL("10,005")).toBe(1001);
    expect(parseBRL("10,004")).toBe(1000);
  });
  it("returns null for garbage", () => {
    expect(parseBRL("")).toBeNull();
    expect(parseBRL("abc")).toBeNull();
    expect(parseBRL("1,2,3")).toBeNull();
    expect(parseBRL("1.23.4")).toBeNull();
    expect(parseBRL(null)).toBeNull();
  });
});

describe("splitInstallments", () => {
  it("splits evenly", () => {
    expect(splitInstallments(450000, 2)).toEqual([225000, 225000]);
  });
  it("gives remainder centavos to the first installments and sums exactly", () => {
    const parts = splitInstallments(10000, 3);
    expect(parts).toEqual([3334, 3333, 3333]);
    expect(sumCentavos(parts)).toBe(10000);
  });
  it("rejects n < 1", () => {
    expect(() => splitInstallments(100, 0)).toThrow(RangeError);
  });
});

describe("percentOf", () => {
  it("rounds and handles zero totals", () => {
    expect(percentOf(225000, 450000)).toBe(50);
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(10, 0)).toBe(0);
  });
});
