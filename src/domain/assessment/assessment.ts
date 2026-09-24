import { MANUAL_REVIEW, compareEducationScores } from "../profile/education";
import { compareTestToRequirement, type TestRequirement } from "../profile/tests";

export const SELF_REPORTED_DISCLAIMER =
  "Self-reported, not an admission probability.";

export const LIKELY_THRESHOLD = 85;
export const POSSIBLE_THRESHOLD = 60;

export const ASSESSMENT_ANSWERS = [
  "meets",
  "does_not_meet",
  "unknown",
  "not_applicable",
] as const;
export type AssessmentAnswer = (typeof ASSESSMENT_ANSWERS)[number];

export const ASSESSMENT_LABELS = [
  "likely_eligible",
  "possibly_eligible",
  "requirements_not_met",
  "provisional",
  "unknown",
] as const;
export type AssessmentLabel = (typeof ASSESSMENT_LABELS)[number];

export const VERIFICATION_STATES = [
  "verified",
  "unverified",
  "unlike_scale",
  "missing_evidence",
  "not_applicable",
] as const;
export type VerificationState = (typeof VERIFICATION_STATES)[number];

export interface AssessmentCriterionInput {
  key: string;
  kind: string;
  weight: number | null;
  mandatory: boolean;
  hard?: boolean;
  applicable?: boolean;
  requirement: unknown;
}

export interface AssessmentClaim {
  key: string;
  answer: AssessmentAnswer;
  evidenceFileId: string | null;
  explanation: string;
}

export interface StudentScaleEvidence {
  kind: "test" | "education";
  scaleCode: string;
  scaleVersion: string;
  score: number | null;
  verified: boolean;
}

export interface ScoredCriterion {
  key: string;
  kind: string;
  weight: number;
  mandatory: boolean;
  hard: boolean;
  publishedThreshold: string;
  claimedAnswer: AssessmentAnswer;
  effectiveAnswer: AssessmentAnswer;
  verification: VerificationState;
}

export interface AssessmentResult {
  score: number | null;
  label: AssessmentLabel;
  knownCoverage: number | null;
  possibleLow: number | null;
  possibleHigh: number | null;
  equalWeights: boolean;
  hardUnmet: boolean;
  unknownMandatory: boolean;
  disclaimer: typeof SELF_REPORTED_DISCLAIMER;
  items: ScoredCriterion[];
}

export function isAssessmentAnswer(value: string): value is AssessmentAnswer {
  return (ASSESSMENT_ANSWERS as readonly string[]).includes(value);
}

export function assessmentLabelCopy(label: AssessmentLabel): string {
  switch (label) {
    case "likely_eligible":
      return "Likely eligible";
    case "possibly_eligible":
      return "Possibly eligible";
    case "requirements_not_met":
      return "Requirements not met";
    case "provisional":
      return "Provisional";
    case "unknown":
      return "Unknown";
  }
}

export function criterionTitle(key: string): string {
  const trimmed = key.trim();
  if (trimmed === "") {
    return "Not provided";
  }
  return trimmed
    .split(/[_-]+/)
    .map((part) => (part.length === 0 ? part : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function publishedThresholdLabel(requirement: unknown): string {
  const record = asRecord(requirement);
  const minimum = record.minimum ?? record.min ?? record.threshold;
  const scale =
    (typeof record.scaleCode === "string" && record.scaleCode) ||
    (typeof record.scale === "string" && record.scale) ||
    null;
  const version =
    typeof record.scaleVersion === "string" && record.scaleVersion.trim() !== ""
      ? record.scaleVersion
      : null;
  const text =
    typeof record.text === "string"
      ? record.text
      : typeof record.description === "string"
        ? record.description
        : null;

  const parts: string[] = [];
  if (minimum !== undefined && minimum !== null && String(minimum).trim() !== "") {
    parts.push(`Minimum ${String(minimum)}`);
  }
  if (scale) {
    parts.push(version ? `${scale} ${version}` : scale);
  }
  if (parts.length > 0) {
    return parts.join(" · ");
  }
  if (text && text.trim() !== "") {
    return text.trim();
  }
  return "Not provided";
}

export function publishedApplicable(requirement: unknown): boolean {
  const record = asRecord(requirement);
  if (record.applicable === false || record.notApplicable === true) {
    return false;
  }
  return true;
}

export function criterionIsHard(criterion: AssessmentCriterionInput): boolean {
  const record = asRecord(criterion.requirement);
  if (record.hard === false) {
    return false;
  }
  if (record.hard === true || criterion.hard === true) {
    return true;
  }
  return criterion.mandatory;
}

function readScale(
  requirement: unknown,
): { scaleCode: string; scaleVersion: string; minimum: number | null } | null {
  const record = asRecord(requirement);
  const scaleCode =
    typeof record.scaleCode === "string"
      ? record.scaleCode
      : typeof record.scale === "string"
        ? record.scale
        : "";
  if (scaleCode.trim() === "") {
    return null;
  }
  return {
    scaleCode,
    scaleVersion:
      typeof record.scaleVersion === "string" && record.scaleVersion.trim() !== ""
        ? record.scaleVersion
        : "1",
    minimum: asFiniteNumber(record.minimum ?? record.min ?? record.threshold),
  };
}

export function comparePublishedRequirement(
  requirement: unknown,
  evidence: StudentScaleEvidence | null,
): "met" | "unmet" | "unknown" | "unlike_scale" {
  const published = readScale(requirement);
  if (!published || !evidence) {
    return "unknown";
  }
  if (evidence.kind === "test") {
    const testRequirement: TestRequirement = {
      scaleCode: published.scaleCode,
      scaleVersion: published.scaleVersion,
      minimum: published.minimum ?? 0,
    };
    const compared = compareTestToRequirement(
      {
        scaleCode: evidence.scaleCode,
        scaleVersion: evidence.scaleVersion,
        score: evidence.score,
      },
      testRequirement,
    );
    if (compared === MANUAL_REVIEW) {
      return "unlike_scale";
    }
    return compared;
  }
  const education = compareEducationScores(
    { value: String(evidence.score ?? ""), scale: evidence.scaleCode },
    { value: String(published.minimum ?? ""), scale: published.scaleCode },
  );
  if (education === MANUAL_REVIEW) {
    return "unlike_scale";
  }
  if (education === "equal" || education === "left") {
    return "met";
  }
  return "unmet";
}

function matchingEvidence(
  criterion: AssessmentCriterionInput,
  evidence: readonly StudentScaleEvidence[],
): StudentScaleEvidence | null {
  const published = readScale(criterion.requirement);
  if (!published) {
    return null;
  }
  const wantedKind = criterion.kind === "test" || criterion.kind === "language" ? "test" : "education";
  return (
    evidence.find(
      (row) =>
        row.kind === wantedKind &&
        row.scaleCode === published.scaleCode &&
        row.scaleVersion === published.scaleVersion,
    ) ??
    evidence.find((row) => row.kind === wantedKind && row.scaleCode === published.scaleCode) ??
    evidence.find((row) => row.kind === wantedKind) ??
    null
  );
}

export function resolveEffectiveAnswer(
  criterion: AssessmentCriterionInput,
  claim: AssessmentClaim | undefined,
  evidence: readonly StudentScaleEvidence[],
): { answer: AssessmentAnswer; verification: VerificationState } {
  const applicable = criterion.applicable !== false && publishedApplicable(criterion.requirement);
  if (!applicable) {
    return { answer: "not_applicable", verification: "not_applicable" };
  }

  const claimed = claim?.answer ?? "unknown";
  if (claimed === "not_applicable") {
    return { answer: "unknown", verification: "unverified" };
  }
  if (claimed === "unknown") {
    return { answer: "unknown", verification: "unverified" };
  }
  if (claimed === "does_not_meet") {
    return { answer: "does_not_meet", verification: "unverified" };
  }

  const hasEvidence =
    Boolean(claim?.evidenceFileId) || claim?.explanation.trim() !== "";
  const published = readScale(criterion.requirement);
  if (published) {
    const match = matchingEvidence(criterion, evidence);
    const compared = comparePublishedRequirement(criterion.requirement, match);
    if (compared === "unlike_scale") {
      return { answer: "unknown", verification: "unlike_scale" };
    }
    if (compared === "unknown") {
      return { answer: "unknown", verification: hasEvidence ? "unverified" : "missing_evidence" };
    }
    if (!match?.verified && compared === "met") {
      return { answer: "unknown", verification: "unverified" };
    }
    if (compared === "unmet") {
      return { answer: "does_not_meet", verification: match?.verified ? "verified" : "unverified" };
    }
    return { answer: "meets", verification: "verified" };
  }

  if (!hasEvidence) {
    return { answer: "unknown", verification: "missing_evidence" };
  }
  return { answer: "meets", verification: "unverified" };
}

function roundScore(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function evaluateAssessment(
  criteria: readonly AssessmentCriterionInput[],
  claims: readonly AssessmentClaim[],
  evidence: readonly StudentScaleEvidence[] = [],
): AssessmentResult {
  const claimByKey = new Map(claims.map((row) => [row.key, row]));
  const applicable = criteria.filter(
    (row) => row.applicable !== false && publishedApplicable(row.requirement),
  );
  const missingWeights = applicable.some((row) => row.weight === null || row.weight <= 0);
  const equalWeights = applicable.length > 0 && missingWeights;
  const unit = equalWeights ? 1 : 0;

  const items: ScoredCriterion[] = criteria.map((criterion) => {
    const resolved = resolveEffectiveAnswer(criterion, claimByKey.get(criterion.key), evidence);
    const weight =
      criterion.applicable === false || !publishedApplicable(criterion.requirement)
        ? 0
        : equalWeights
          ? unit
          : (criterion.weight ?? 0);
    return {
      key: criterion.key,
      kind: criterion.kind,
      weight,
      mandatory: criterion.mandatory,
      hard: criterionIsHard(criterion),
      publishedThreshold: publishedThresholdLabel(criterion.requirement),
      claimedAnswer: claimByKey.get(criterion.key)?.answer ?? "unknown",
      effectiveAnswer: resolved.answer,
      verification: resolved.verification,
    };
  });

  const scored = items.filter((row) => row.effectiveAnswer !== "not_applicable" && row.weight > 0);
  const total = scored.reduce((sum, row) => sum + row.weight, 0);
  if (scored.length === 0 || total <= 0) {
    return {
      score: null,
      label: "unknown",
      knownCoverage: null,
      possibleLow: null,
      possibleHigh: null,
      equalWeights,
      hardUnmet: false,
      unknownMandatory: false,
      disclaimer: SELF_REPORTED_DISCLAIMER,
      items,
    };
  }

  const metWeight = scored
    .filter((row) => row.effectiveAnswer === "meets")
    .reduce((sum, row) => sum + row.weight, 0);
  const knownWeight = scored
    .filter((row) => row.effectiveAnswer === "meets" || row.effectiveAnswer === "does_not_meet")
    .reduce((sum, row) => sum + row.weight, 0);
  const unknownWeight = scored
    .filter((row) => row.effectiveAnswer === "unknown")
    .reduce((sum, row) => sum + row.weight, 0);

  const score = roundScore((100 * metWeight) / total);
  const knownCoverage = roundScore((100 * knownWeight) / total);
  const possibleLow = score;
  const possibleHigh = roundScore((100 * (metWeight + unknownWeight)) / total);

  const hardUnmet = scored.some(
    (row) => row.hard && row.effectiveAnswer === "does_not_meet",
  );
  const unknownMandatory = scored.some(
    (row) => row.mandatory && row.effectiveAnswer === "unknown",
  );

  let label: AssessmentLabel;
  if (hardUnmet) {
    label = "requirements_not_met";
  } else if (unknownMandatory) {
    label = "provisional";
  } else if (score >= LIKELY_THRESHOLD) {
    label = "likely_eligible";
  } else if (score >= POSSIBLE_THRESHOLD) {
    label = "possibly_eligible";
  } else {
    label = "requirements_not_met";
  }

  return {
    score,
    label,
    knownCoverage,
    possibleLow,
    possibleHigh,
    equalWeights,
    hardUnmet,
    unknownMandatory,
    disclaimer: SELF_REPORTED_DISCLAIMER,
    items,
  };
}

export function requirementVersionOf(
  criteria: readonly { id?: string; key: string; revision?: number }[],
): string {
  return criteria
    .map((row) => `${row.id ?? row.key}:${row.revision ?? 1}`)
    .sort()
    .join("|");
}
