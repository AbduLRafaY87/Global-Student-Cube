import { isRecordingFeatureEnabled } from "../sessions/features";

export const AI_JOB_KINDS = [
  "transcribe",
  "advisory_draft",
  "qa_coaching",
] as const;

export type AiJobKind = (typeof AI_JOB_KINDS)[number];

export const AI_JOB_STATES = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "blocked",
] as const;

export type AiJobState = (typeof AI_JOB_STATES)[number];

export const AI_JOB_RATE_PER_BOOKING_HOUR = 10;
export const AI_JOB_COST_CAP_CENTS = 50;
export const AI_JOB_TOKEN_CAP = 8_000;

export function mediaAiActionsAllowed(flag: string | undefined): {
  recording: boolean;
  transcription: boolean;
  draft: boolean;
  coaching: boolean;
  manualAdvisory: true;
} {
  const enabled = isRecordingFeatureEnabled(flag);
  return {
    recording: enabled,
    transcription: enabled,
    draft: enabled,
    coaching: enabled,
    manualAdvisory: true,
  };
}

export function canEnqueueAiJob(input: {
  featureEnabled: boolean;
  jobsInLastHour: number;
  estimatedCostCents: number;
  estimatedTokens: number;
}): boolean {
  if (!input.featureEnabled) {
    return false;
  }
  if (input.jobsInLastHour >= AI_JOB_RATE_PER_BOOKING_HOUR) {
    return false;
  }
  if (input.estimatedCostCents > AI_JOB_COST_CAP_CENTS) {
    return false;
  }
  return input.estimatedTokens <= AI_JOB_TOKEN_CAP;
}

export function exceedsCostCap(costCents: number, tokens: number): boolean {
  return costCents > AI_JOB_COST_CAP_CENTS || tokens > AI_JOB_TOKEN_CAP;
}
