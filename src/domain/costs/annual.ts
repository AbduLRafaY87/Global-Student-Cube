export const COST_HORIZONS = ["first_year", "full_program"] as const;
export type CostHorizon = (typeof COST_HORIZONS)[number];

export function housingMonthlyAmount(
  amount: number | null,
  basis: string | null,
  nightsPerMonth = 30,
): { monthly: number | null; estimated: boolean } {
  if (amount === null) {
    return { monthly: null, estimated: false };
  }
  if (basis === "monthly") {
    return { monthly: amount, estimated: false };
  }
  if (basis === "nightly") {
    return { monthly: amount * nightsPerMonth, estimated: true };
  }
  return { monthly: null, estimated: false };
}

export function tuitionForHorizon(
  annualTuition: number | null,
  fullProgramTuition: number | null,
  horizon: CostHorizon,
): number | null {
  if (horizon === "full_program") {
    return fullProgramTuition;
  }
  return annualTuition;
}

export function annualComparisonAmount(
  annualTuition: number | null,
  monthlyAccommodation: number | null,
): number | null {
  if (annualTuition === null || monthlyAccommodation === null) {
    return null;
  }
  return annualTuition + monthlyAccommodation * 12;
}
