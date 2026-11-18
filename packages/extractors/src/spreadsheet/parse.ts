import { read, utils, type WorkBook } from "xlsx";
import type { Cell } from "./types";

export interface RawSheet {
  name: string;
  rows: Cell[][];
}

function toCell(v: unknown): Cell {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number" || typeof v === "boolean") return v;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s.length ? s : null;
}

/** Reads an .xlsx/.xls/.csv buffer into plain grids, one per sheet. Empty sheets are dropped. */
function isBinaryWorkbook(bytes: Uint8Array): boolean {
  // zip (xlsx/xlsm) or OLE compound file (xls)
  return (bytes[0] === 0x50 && bytes[1] === 0x4b) || (bytes[0] === 0xd0 && bytes[1] === 0xcf);
}

export function readWorkbook(data: ArrayBuffer | Uint8Array | Buffer): RawSheet[] {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  // CSV/TSV: keep cells as raw strings so pt-BR numbers ("1.000,00") are parsed by us, not by SheetJS.
  const wb: WorkBook = isBinaryWorkbook(bytes)
    ? read(bytes, { type: "array", cellDates: true })
    : read(new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, ""), { type: "string", raw: true });
  const out: RawSheet[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const grid = utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null, blankrows: true });
    const rows = grid.map((r) => r.map(toCell));
    if (rows.some((r) => r.some((c) => c !== null))) out.push({ name, rows });
  }
  return out;
}

export function normalizeHeader(value: Cell): string {
  if (value === null) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
