import { describe, expect, it } from "vitest";
import { formatCNPJ, isValidCNPJ, cleanCNPJ } from "./cnpj";

describe("cnpj", () => {
  it("validates check digits", () => {
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
    expect(isValidCNPJ("11222333000181")).toBe(true);
    expect(isValidCNPJ("11.222.333/0001-82")).toBe(false);
    expect(isValidCNPJ("00000000000000")).toBe(false);
    expect(isValidCNPJ("123")).toBe(false);
  });
  it("formats and cleans", () => {
    expect(formatCNPJ("11222333000181")).toBe("11.222.333/0001-81");
    expect(cleanCNPJ("11.222.333/0001-81")).toBe("11222333000181");
    expect(formatCNPJ("123")).toBe("123");
  });
});
