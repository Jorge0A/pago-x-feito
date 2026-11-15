/** CNPJ helpers (Brazilian company id). Digits only internally; formatted as 00.000.000/0000-00. */

export function cleanCNPJ(input: string): string {
  return input.replace(/\D/g, "");
}

export function formatCNPJ(input: string): string {
  const d = cleanCNPJ(input);
  if (d.length !== 14) return input;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function checkDigit(digits: string, weights: number[]): number {
  const sum = weights.reduce((acc, w, i) => acc + Number(digits[i]) * w, 0);
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

export function isValidCNPJ(input: string): boolean {
  const d = cleanCNPJ(input);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = checkDigit(d.slice(0, 12), w1);
  const d2 = checkDigit(d.slice(0, 12) + d1, w2);
  return d[12] === String(d1) && d[13] === String(d2);
}
