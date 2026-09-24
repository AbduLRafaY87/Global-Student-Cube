import type { RecommendationReason } from "@/domain/recommendations/recommendations";

export const NOT_PROVIDED = "Not provided";

export interface DeadlineInput {
  precision: string | null;
  date: string | null;
  month: number | null;
}

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function displayText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return NOT_PROVIDED;
  }
  if (typeof value === "string" && value.trim() === "") {
    return NOT_PROVIDED;
  }
  return String(value);
}

export function displayMoney(amount: number | null, currency: string | null): string {
  if (amount === null || !currency) {
    return NOT_PROVIDED;
  }
  return `${amount.toFixed(2)} ${currency}`;
}

export function displayDeadline(input: DeadlineInput): string {
  if (input.precision === "month") {
    if (input.month === null || input.month < 1 || input.month > 12) {
      return NOT_PROVIDED;
    }
    return MONTH_LABELS[input.month - 1] ?? NOT_PROVIDED;
  }
  if (input.precision === "day" && input.date) {
    return input.date;
  }
  return NOT_PROVIDED;
}

export function monthlyAccommodation(
  amount: number | null,
  currency: string | null,
  basis: string | null,
): { monthly: number | null; currency: string | null; estimated: boolean } {
  if (amount === null || !currency) {
    return { monthly: null, currency: null, estimated: false };
  }
  if (basis === "monthly") {
    return { monthly: amount, currency, estimated: false };
  }
  if (basis === "nightly") {
    return { monthly: amount * 30, currency, estimated: true };
  }
  return { monthly: null, currency: null, estimated: false };
}

export function comparableAnnualSum(
  annualTuition: number | null,
  tuitionCurrency: string | null,
  monthly: number | null,
  housingCurrency: string | null,
): number | null {
  if (
    annualTuition === null
    || monthly === null
    || !tuitionCurrency
    || !housingCurrency
    || tuitionCurrency !== housingCurrency
  ) {
    return null;
  }
  return annualTuition + monthly * 12;
}

export const ANNUAL_COMPARISON_LABEL = "Tuition and accommodation estimate";

export function recommendationReasonCopy(reason: RecommendationReason): string {
  switch (reason) {
    case "manual":
      return "You selected this university.";
    case "manual_outside_preferred_countries":
      return "You selected this university. It is outside your preferred countries.";
    case "city":
      return "Same city as your selection.";
    case "country":
      return "Same country as your selection.";
    case "lowest_cost":
      return "Among the lowest comparable annual costs.";
    case "strongest_rank":
      return "Strong comparable course ranking.";
    case "fill":
      return "Additional published match for your preferences.";
  }
}

export function formatVerified(verifiedAt: string | null, nextReviewAt: string | null): string {
  const verified = verifiedAt ? new Date(verifiedAt).toLocaleDateString() : NOT_PROVIDED;
  const next = nextReviewAt ? new Date(nextReviewAt).toLocaleDateString() : NOT_PROVIDED;
  return `Last verified ${verified}. Next review ${next}.`;
}
