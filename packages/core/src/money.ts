/**
 * Money helpers. All amounts are integer centavos (BRL). Never floats.
 */

export type Centavos = number;

function assertCentavos(value: unknown): asserts value is Centavos {
  if (typeof value !== "number" || !Number.isInteger(value) || !Number.isSafeInteger(value)) {
    throw new TypeError(`Expected integer centavos, got ${String(value)}`);
  }
}

/** Formats centavos as "R$ 1.234,56". Negative values become "-R$ 1.234,56". */
export function formatBRL(centavos: Centavos, opts: { symbol?: boolean } = {}): string {
  assertCentavos(centavos);
  const symbol = opts.symbol ?? true;
  const negative = centavos < 0;
  const abs = Math.abs(centavos);
  const reais = Math.floor(abs / 100);
  const cents = abs % 100;
  const intPart = reais.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const body = `${intPart},${cents.toString().padStart(2, "0")}`;
  const withSymbol = symbol ? `R$ ${body}` : body;
  return negative ? `-${withSymbol}` : withSymbol;
}

/**
 * Parses user or spreadsheet input into centavos. Accepts:
 *   "R$ 1.234,56", "1.234,56", "1234,56", "1234", "4.500" (= 4500 reais), "1500.00" (= 1500 reais),
 *   "-250,00", "(250,00)".
 * Returns null when the text is not a money amount.
 */
export function parseBRL(input: string | number | null | undefined): Centavos | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    return Math.round(input * 100);
  }
  let s = input.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/R\$/gi, "").replace(/\s| /g, "");
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s)) return null;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  let intPart: string;
  let fracPart = "";

  if (hasComma) {
    // Comma is always the decimal separator in pt-BR; dots are thousands.
    const [i, f, extra] = s.split(",");
    if (extra !== undefined) return null;
    intPart = (i ?? "").replace(/\./g, "");
    fracPart = f ?? "";
  } else if (hasDot) {
    const parts = s.split(".");
    const last = parts[parts.length - 1] ?? "";
    if (parts.length > 2 || last.length === 3) {
      // "1.234.567" or "4.500" → thousands separators
      const ok = parts.every((p, idx) => (idx === 0 ? p.length >= 1 && p.length <= 3 : p.length === 3));
      if (!ok) return null;
      intPart = parts.join("");
    } else {
      // "1500.00" or "1500.5" → decimal point (spreadsheet style)
      intPart = parts[0] ?? "";
      fracPart = last;
    }
  } else {
    intPart = s;
  }

  if (!/^\d+$/.test(intPart || "0")) return null;
  if (fracPart && !/^\d+$/.test(fracPart)) return null;
  if (fracPart.length > 2) {
    // Round half up at the third decimal.
    const third = Number(fracPart[2]);
    fracPart = fracPart.slice(0, 2);
    let cents = Number(intPart || "0") * 100 + Number(fracPart.padEnd(2, "0"));
    if (third >= 5) cents += 1;
    return negative ? -cents : cents;
  }
  const cents = Number(intPart || "0") * 100 + Number(fracPart.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
}

export function sumCentavos(values: Iterable<Centavos>): Centavos {
  let total = 0;
  for (const v of values) {
    assertCentavos(v);
    total += v;
  }
  return total;
}

/**
 * Splits a total into n installments whose sum equals the total exactly.
 * The remainder centavos go to the first installments.
 */
export function splitInstallments(total: Centavos, n: number): Centavos[] {
  assertCentavos(total);
  if (!Number.isInteger(n) || n < 1) throw new RangeError("n must be a positive integer");
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

/** Integer percentage of part over total, rounded half up. Returns 0 when total is 0. */
export function percentOf(part: Centavos, total: Centavos): number {
  assertCentavos(part);
  assertCentavos(total);
  if (total === 0) return 0;
  return Math.round((part * 100) / total);
}
