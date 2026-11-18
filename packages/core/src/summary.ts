/**
 * Money summary per budget line, category, supplier and obra. Pure functions over plain rows.
 * Rules:
 *  - only 'approved' and 'contracted' lines count in the obra totals
 *  - 'quoted' lines are reported separately as "em cotação"; 'rejected' lines are excluded
 *  - committed = contracted when known, otherwise budgeted
 *  - paid per line = payments assigned to that line
 *  - payments not assigned to a line count only at obra level ("não alocado")
 *  - owed = max(committed - paid, 0)
 */
import type { Centavos } from "./money";

export type BudgetLineStatus = "quoted" | "approved" | "rejected" | "contracted";

export const BUDGET_LINE_STATUS_LABELS: Record<BudgetLineStatus, string> = {
  quoted: "Em cotação",
  approved: "Aprovado",
  rejected: "Recusado",
  contracted: "Contratado",
};

export const COUNTED_STATUSES: ReadonlySet<BudgetLineStatus> = new Set(["approved", "contracted"]);

export interface BudgetLineRow {
  id: string;
  supplier_id: string | null;
  category: string;
  description: string;
  budgeted_centavos: Centavos;
  contracted_centavos: Centavos | null;
  status: BudgetLineStatus;
}

export interface PaymentRow {
  id: string;
  supplier_id: string;
  budget_line_id: string | null;
  amount_centavos: Centavos;
}

export interface LineSummary {
  line: BudgetLineRow;
  budgeted: Centavos;
  contracted: Centavos | null;
  committed: Centavos;
  paid: Centavos;
  owed: Centavos;
  counted: boolean;
}

export interface CategorySummary {
  category: string;
  budgeted: Centavos;
  committed: Centavos;
  paid: Centavos;
  owed: Centavos;
  quoted: Centavos;
  lines: LineSummary[];
}

export interface ObraSummary {
  budgeted: Centavos;
  committed: Centavos;
  paidAllocated: Centavos;
  paidUnallocated: Centavos;
  paidTotal: Centavos;
  owed: Centavos;
  /** sum of lines still in 'quoted' status (not counted above) */
  quoted: Centavos;
  quotedCount: number;
  rejectedCount: number;
  categories: CategorySummary[];
  lines: LineSummary[];
}

export interface SupplierSummary {
  supplier_id: string | null;
  name: string;
  committed: Centavos;
  paid: Centavos;
  owed: Centavos;
  quoted: Centavos;
  lines: number;
}

export function isCounted(status: BudgetLineStatus): boolean {
  return COUNTED_STATUSES.has(status);
}

function committedOf(line: BudgetLineRow): Centavos {
  return line.contracted_centavos ?? line.budgeted_centavos;
}

export function summarizeObra(lines: BudgetLineRow[], payments: PaymentRow[]): ObraSummary {
  const paidByLine = new Map<string, Centavos>();
  let paidUnallocated = 0;
  for (const p of payments) {
    if (p.budget_line_id) {
      paidByLine.set(p.budget_line_id, (paidByLine.get(p.budget_line_id) ?? 0) + p.amount_centavos);
    } else {
      paidUnallocated += p.amount_centavos;
    }
  }

  const lineSummaries: LineSummary[] = lines.map((line) => {
    const counted = isCounted(line.status);
    const committed = counted ? committedOf(line) : 0;
    const paid = paidByLine.get(line.id) ?? 0;
    return {
      line,
      budgeted: counted ? line.budgeted_centavos : 0,
      contracted: line.contracted_centavos,
      committed,
      paid,
      owed: Math.max(committed - paid, 0),
      counted,
    };
  });

  const byCategory = new Map<string, CategorySummary>();
  for (const ls of lineSummaries) {
    const cat = byCategory.get(ls.line.category) ?? {
      category: ls.line.category,
      budgeted: 0,
      committed: 0,
      paid: 0,
      owed: 0,
      quoted: 0,
      lines: [],
    };
    cat.budgeted += ls.budgeted;
    cat.committed += ls.committed;
    cat.paid += ls.paid;
    cat.owed += ls.owed;
    if (ls.line.status === "quoted") cat.quoted += committedOf(ls.line);
    cat.lines.push(ls);
    byCategory.set(ls.line.category, cat);
  }

  const budgeted = lineSummaries.reduce((a, l) => a + l.budgeted, 0);
  const committed = lineSummaries.reduce((a, l) => a + l.committed, 0);
  const paidAllocated = lineSummaries.reduce((a, l) => a + l.paid, 0);
  const owedLines = lineSummaries.reduce((a, l) => a + l.owed, 0);
  const quotedLines = lines.filter((l) => l.status === "quoted");

  return {
    budgeted,
    committed,
    paidAllocated,
    paidUnallocated,
    paidTotal: paidAllocated + paidUnallocated,
    // Unallocated payments still reduce what the obra owes overall.
    owed: Math.max(owedLines - paidUnallocated, 0),
    quoted: quotedLines.reduce((a, l) => a + committedOf(l), 0),
    quotedCount: quotedLines.length,
    rejectedCount: lines.filter((l) => l.status === "rejected").length,
    categories: [...byCategory.values()].sort((a, b) => a.category.localeCompare(b.category, "pt-BR")),
    lines: lineSummaries,
  };
}

/**
 * Money per supplier. Payments count for their supplier whether or not they are tied to a line,
 * so "owed" per supplier matches what the owner still has to send that supplier.
 * Suppliers with only quoted or rejected lines still appear, with committed 0.
 */
export function summarizeBySupplier(lines: BudgetLineRow[], payments: PaymentRow[], names: Map<string, string>): SupplierSummary[] {
  const map = new Map<string | null, SupplierSummary>();
  const get = (id: string | null) => {
    let s = map.get(id);
    if (!s) {
      s = { supplier_id: id, name: id ? (names.get(id) ?? "Fornecedor") : "Sem fornecedor", committed: 0, paid: 0, owed: 0, quoted: 0, lines: 0 };
      map.set(id, s);
    }
    return s;
  };
  for (const l of lines) {
    if (l.status === "rejected") continue;
    const s = get(l.supplier_id);
    if (isCounted(l.status)) s.committed += committedOf(l);
    else s.quoted += committedOf(l);
    s.lines += 1;
  }
  for (const p of payments) get(p.supplier_id).paid += p.amount_centavos;
  for (const s of map.values()) s.owed = Math.max(s.committed - s.paid, 0);
  return [...map.values()].sort((a, b) => b.committed - a.committed || b.quoted - a.quoted || a.name.localeCompare(b.name, "pt-BR"));
}
