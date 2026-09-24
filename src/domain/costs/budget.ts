export const BUDGET_LINE_KINDS = [
  "meals",
  "transport",
  "insurance",
  "travel",
  "application_fees",
  "visa",
  "other",
] as const;
export type BudgetLineKind = (typeof BUDGET_LINE_KINDS)[number];

export const LINE_BASES = ["annual", "monthly", "one_off"] as const;
export type LineBasis = (typeof LINE_BASES)[number];

export interface BudgetLine {
  kind: BudgetLineKind;
  amount: number | null;
  currency: string | null;
  basis: LineBasis;
  includedInAccommodation: boolean;
}

export function annualizeLine(amount: number, basis: LineBasis): number {
  if (basis === "monthly") {
    return amount * 12;
  }
  return amount;
}

export function broaderBudgetTotal(lines: readonly BudgetLine[]): number | null {
  let total = 0;
  let sawKnown = false;
  for (const line of lines) {
    if (line.includedInAccommodation) {
      continue;
    }
    if (line.amount === null || !line.currency) {
      continue;
    }
    sawKnown = true;
    total += annualizeLine(line.amount, line.basis);
  }
  return sawKnown ? total : null;
}

export function combinedPlanningTotal(
  annualComparison: number | null,
  broader: number | null,
): number | null {
  if (annualComparison === null) {
    return null;
  }
  return annualComparison + (broader ?? 0);
}
