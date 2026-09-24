export const FEE_APPLIES_TO = ["system", "group", "choice"] as const;
export type FeeAppliesTo = (typeof FEE_APPLIES_TO)[number];

export interface ApplicationFeeRule {
  appliesTo: FeeAppliesTo;
  kind: string;
  amount: number | null;
  currency: string | null;
  includedChoices: number | null;
  sourceFactId: string | null;
}

export interface AssessedFeeLine {
  kind: string;
  appliesTo: FeeAppliesTo;
  amount: number | null;
  currency: string | null;
}

export function assessApplicationFees(
  rules: readonly ApplicationFeeRule[],
  choiceCount: number,
): { lines: AssessedFeeLine[]; total: number | null; currency: string | null } {
  const seen = new Set<string>();
  const lines: AssessedFeeLine[] = [];
  for (const rule of rules) {
    const identity = `${rule.kind}:${rule.sourceFactId ?? "none"}`;
    if (seen.has(identity)) {
      continue;
    }
    seen.add(identity);
    if (rule.appliesTo === "choice") {
      const extras =
        rule.includedChoices === null
          ? choiceCount
          : Math.max(0, choiceCount - rule.includedChoices);
      lines.push({
        kind: rule.kind,
        appliesTo: rule.appliesTo,
        amount: rule.amount === null ? null : rule.amount * extras,
        currency: rule.currency,
      });
      continue;
    }
    lines.push({
      kind: rule.kind,
      appliesTo: rule.appliesTo,
      amount: rule.amount,
      currency: rule.currency,
    });
  }

  let total = 0;
  let currency: string | null = null;
  for (const line of lines) {
    if (line.amount === null || !line.currency) {
      return { lines, total: null, currency: null };
    }
    if (currency && currency !== line.currency) {
      return { lines, total: null, currency: null };
    }
    currency = line.currency;
    total += line.amount;
  }
  return { lines, total: lines.length === 0 ? null : total, currency };
}

export function sumKnownFeeSubtotals(subtotals: readonly (number | null)[]): number | null {
  if (subtotals.length === 0 || subtotals.some((value) => value === null)) {
    return null;
  }
  return subtotals.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}
