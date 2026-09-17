import type { AdmissionOddsCategory } from "@/types";

export interface AdmissionOddsInput {
  studentGpa: number;
  minimumGpa: number;
  acceptanceRate: number;
}

function normalizeAcceptanceRate(acceptanceRate: number): number {
  if (acceptanceRate > 1) {
    return acceptanceRate / 100;
  }

  return acceptanceRate;
}

export function calculateAdmissionOdds({
  studentGpa,
  minimumGpa,
  acceptanceRate,
}: AdmissionOddsInput): AdmissionOddsCategory {
  const rate = normalizeAcceptanceRate(acceptanceRate);
  const gpaGap = studentGpa - minimumGpa;

  if (gpaGap < 0 || rate < 0.2) {
    return "Reach";
  }

  if (gpaGap >= 0.3 && rate >= 0.5) {
    return "Safety";
  }

  return "Match";
}
