import { capProgressPercent } from "../status";

export const READINESS_STATUSES = [
  "known",
  "incomplete_costs",
  "savings_declined",
  "fx_unavailable",
  "invalid_denominator",
] as const;
export type CostReadinessStatus = (typeof READINESS_STATUSES)[number];

export interface ConfirmedFunding {
  amount: number | null;
  confirmed: boolean;
  alreadyInSavings: boolean;
}

export interface CostReadinessInput {
  savings: number | null;
  savingsDeclined: boolean;
  confirmedFunding: readonly ConfirmedFunding[];
  netExpense: number | null;
  fxAvailable: boolean;
}

export interface CostReadinessResult {
  percent: number | null;
  displayPercent: string | null;
  barValue: number;
  status: CostReadinessStatus;
  available: number | null;
}

export function confirmedFundingTotal(
  rows: readonly ConfirmedFunding[],
  asOffset: boolean,
): number {
  let total = 0;
  for (const row of rows) {
    if (!row.confirmed || row.amount === null) {
      continue;
    }
    if (asOffset && row.alreadyInSavings) {
      continue;
    }
    if (!asOffset && !row.alreadyInSavings) {
      continue;
    }
    total += row.amount;
  }
  return total;
}

export function netEstimatedExpense(
  planningTotal: number | null,
  funding: readonly ConfirmedFunding[],
): number | null {
  if (planningTotal === null) {
    return null;
  }
  return planningTotal - confirmedFundingTotal(funding, true);
}

export function availableReserves(
  savings: number | null,
  funding: readonly ConfirmedFunding[],
): number | null {
  if (savings === null) {
    return null;
  }
  return savings + confirmedFundingTotal(funding, false);
}

export function formatReadinessDisplay(percent: number): string {
  return percent.toFixed(1);
}

export function evaluateCostReadiness(input: CostReadinessInput): CostReadinessResult {
  if (input.savingsDeclined) {
    return {
      percent: null,
      displayPercent: null,
      barValue: 0,
      status: "savings_declined",
      available: null,
    };
  }
  if (!input.fxAvailable) {
    return {
      percent: null,
      displayPercent: null,
      barValue: 0,
      status: "fx_unavailable",
      available: input.savings,
    };
  }
  const available = availableReserves(input.savings, input.confirmedFunding);
  if (available === null || input.netExpense === null) {
    return {
      percent: null,
      displayPercent: null,
      barValue: 0,
      status: "incomplete_costs",
      available,
    };
  }
  if (input.netExpense <= 0) {
    return {
      percent: null,
      displayPercent: null,
      barValue: 0,
      status: "invalid_denominator",
      available,
    };
  }
  const percent = (available / input.netExpense) * 100;
  return {
    percent,
    displayPercent: formatReadinessDisplay(percent),
    barValue: capProgressPercent(percent),
    status: "known",
    available,
  };
}

export function selectedScholarshipAddsFunding(
  selected: boolean,
  confirmed: boolean,
): boolean {
  return selected && confirmed;
}
