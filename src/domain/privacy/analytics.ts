export const MIN_REPORTING_COHORT = 10;

export const ATTRIBUTION_CAUTION =
  "Perceived platform influence is not causal attribution. Do not label temporal associations as platform advantage.";

export interface MetricParts {
  numerator: number;
  denominator: number;
  unknown: number;
  cohortSize: number;
  selfReported: number;
  verified: number;
}

export interface PublishedMetric {
  label: string;
  numerator: number | null;
  denominator: number | null;
  unknown: number;
  cohortSize: number;
  suppressed: boolean;
  selfReported: number;
  verified: number;
  causalClaim: false;
}

export function publishMetric(label: string, parts: MetricParts): PublishedMetric {
  const suppressed = parts.cohortSize > 0 && parts.cohortSize < MIN_REPORTING_COHORT;
  return {
    label,
    numerator: suppressed ? null : parts.numerator,
    denominator: suppressed ? null : parts.denominator,
    unknown: parts.unknown,
    cohortSize: parts.cohortSize,
    suppressed,
    selfReported: parts.selfReported,
    verified: parts.verified,
    causalClaim: false,
  };
}

export function unreportedAlumniAreFailures(): boolean {
  return false;
}

export function missingOutcomesUseObservedDenominator(): boolean {
  return true;
}

export function conversionClaimAllowed(): boolean {
  return false;
}
