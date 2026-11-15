/**
 * Money summary per budget line and per obra. Pure function over plain rows.
 * Rules:
 *  - committed = contracted when known, otherwise budgeted
 *  - paid per line = payments assigned to that line
 *  - payments not assigned to a line count only at obra level ("não alocado")
 *  - owed = max(committed - paid, 0)
 */
import type { Centavos } from "./money";

export interface BudgetLineRow {
  id: string;
  supplier_id: string | null;
  category: string;
  description: string;
  budgeted_centavos: Centavos;
  contracted_centavos: Centavos | null;
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
}

export interface CategorySummary {
  category: string;
  budgeted: Centavos;
  committed: Centavos;
  paid: Centavos;
  owed: Centavos;
  lines: LineSummary[];
}

export interface ObraSummary {
  budgeted: Centavos;
  committed: Centavos;
  paidAllocated: Centavos;
  paidUnallocated: Centavos;
  paidTotal: Centavos;
  owed: Centavos;
  categories: CategorySummary[];
  lines: LineSummary[];
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
    const committed = line.contracted_centavos ?? line.budgeted_centavos;
    const paid = paidByLine.get(line.id) ?? 0;
    return {
      line,
      budgeted: line.budgeted_centavos,
      contracted: line.contracted_centavos,
      committed,
      paid,
      owed: Math.max(committed - paid, 0),
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
      lines: [],
    };
    cat.budgeted += ls.budgeted;
    cat.committed += ls.committed;
    cat.paid += ls.paid;
    cat.owed += ls.owed;
    cat.lines.push(ls);
    byCategory.set(ls.line.category, cat);
  }

  const budgeted = lineSummaries.reduce((a, l) => a + l.budgeted, 0);
  const committed = lineSummaries.reduce((a, l) => a + l.committed, 0);
  const paidAllocated = lineSummaries.reduce((a, l) => a + l.paid, 0);
  const owedLines = lineSummaries.reduce((a, l) => a + l.owed, 0);

  return {
    budgeted,
    committed,
    paidAllocated,
    paidUnallocated,
    paidTotal: paidAllocated + paidUnallocated,
    // Unallocated payments still reduce what the obra owes overall.
    owed: Math.max(owedLines - paidUnallocated, 0),
    categories: [...byCategory.values()].sort((a, b) => a.category.localeCompare(b.category, "pt-BR")),
    lines: lineSummaries,
  };
}
