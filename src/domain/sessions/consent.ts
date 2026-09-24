export const RECORDING_STATES = [
  "not_requested",
  "consent_requested",
  "consented",
  "recording",
  "stopped",
  "declined",
] as const;

export type RecordingState = (typeof RECORDING_STATES)[number];

export const RECORDING_RETENTION_DAYS = 30;
export const TRANSCRIPT_RETENTION_DAYS = 90;
export const MINOR_AGE_YEARS = 18;

export interface RecordingConsentEvent {
  participantId: string;
  rosterVersion: number;
  decision: boolean;
  occurredAt: string;
  guardianConsentEventId: string | null;
}

export interface ConsentDecisionInput {
  recordingState: RecordingState;
  rosterVersion: number;
  presentParticipantIds: readonly string[];
  events: readonly RecordingConsentEvent[];
  actorId: string;
  decision: boolean;
  isMinorStudent: boolean;
  guardianAuthorized: boolean;
  actorIsGuardian: boolean;
  accountLevelConsent: boolean;
  recordingFeatureEnabled: boolean;
  adapterCanEnforceRoster: boolean;
}

export function isMinorStudent(dateOfBirth: string, now: string): boolean {
  const birth = Date.parse(`${dateOfBirth}T00:00:00.000Z`);
  const current = Date.parse(now);
  const eighteenth = new Date(birth);
  eighteenth.setUTCFullYear(eighteenth.getUTCFullYear() + MINOR_AGE_YEARS);
  return current < eighteenth.getTime();
}

export function latestConsent(
  events: readonly RecordingConsentEvent[],
  participantId: string,
  rosterVersion: number,
): RecordingConsentEvent | null {
  const matches = events.filter(
    (event) =>
      event.participantId === participantId &&
      event.rosterVersion === rosterVersion,
  );
  return matches.at(-1) ?? null;
}

export function participantConsented(
  events: readonly RecordingConsentEvent[],
  participantId: string,
  rosterVersion: number,
): boolean {
  return latestConsent(events, participantId, rosterVersion)?.decision === true;
}

export function nextRecordingState(input: ConsentDecisionInput): RecordingState {
  if (!input.decision) {
    if (input.recordingState === "recording" || input.recordingState === "consented") {
      return "stopped";
    }
    return "declined";
  }

  if (input.recordingState === "not_requested") {
    return "consent_requested";
  }

  if (input.isMinorStudent && !input.guardianAuthorized) {
    return "consent_requested";
  }

  const everyonePresentConsented = input.presentParticipantIds.every((id) =>
    participantConsented(input.events, id, input.rosterVersion),
  );

  if (!everyonePresentConsented) {
    return "consent_requested";
  }

  if (!input.recordingFeatureEnabled || !input.adapterCanEnforceRoster) {
    return "consented";
  }

  return "consented";
}

export function canStartRecording(input: {
  recordingState: RecordingState;
  rosterVersion: number;
  presentParticipantIds: readonly string[];
  events: readonly RecordingConsentEvent[];
  isMinorStudent: boolean;
  guardianConsented: boolean;
  recordingFeatureEnabled: boolean;
  adapterCanEnforceRoster: boolean;
}): boolean {
  if (input.recordingState === "declined" || input.recordingState === "stopped") {
    return false;
  }
  if (!input.recordingFeatureEnabled || !input.adapterCanEnforceRoster) {
    return false;
  }
  if (input.isMinorStudent && !input.guardianConsented) {
    return false;
  }
  if (input.presentParticipantIds.length === 0) {
    return false;
  }
  return input.presentParticipantIds.every((id) =>
    participantConsented(input.events, id, input.rosterVersion),
  );
}

export function lateJoinRosterVersion(currentRoster: number): number {
  return currentRoster + 1;
}

export function recordingAfterLateJoin(): RecordingState {
  return "consent_requested";
}

export function recordingAfterWithdrawal(): RecordingState {
  return "stopped";
}

export function checkboxStartsUnchecked(accountLevelConsent: boolean): boolean {
  return accountLevelConsent === true || accountLevelConsent === false;
}
