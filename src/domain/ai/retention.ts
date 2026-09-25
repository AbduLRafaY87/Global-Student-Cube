import {
  RECORDING_RETENTION_DAYS,
  TRANSCRIPT_RETENTION_DAYS,
} from "../sessions/consent";

export function addUtcDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 24 * 60 * 60 * 1000).toISOString();
}

export function recordingExpiresAt(capturedAt: string): string {
  return addUtcDays(capturedAt, RECORDING_RETENTION_DAYS);
}

export function transcriptExpiresAt(createdAt: string): string {
  return addUtcDays(createdAt, TRANSCRIPT_RETENTION_DAYS);
}

export function shouldDeleteMedia(deleteAfter: string, now: string): boolean {
  return Date.parse(now) >= Date.parse(deleteAfter);
}

export function deletionEvidenceHash(input: {
  resourceType: "recording" | "transcript";
  resourceId: string;
  deletedAt: string;
}): string {
  return `${input.resourceType}:${input.resourceId}:${input.deletedAt}`;
}
