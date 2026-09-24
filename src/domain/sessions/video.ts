export interface VideoRoom {
  roomName: string;
  roomUrl: string;
  generation: number;
  recordingEnabled: boolean;
}

export interface VideoJoinToken {
  token: string;
  expiresAt: string;
  roomName: string;
}

export interface CreateJoinTokenInput {
  roomName: string;
  participantId: string;
  displayName: string;
  isOwner: boolean;
  notBefore: string;
  expiresAt: string;
}

export interface VideoProvider {
  readonly id: "sandbox" | "daily";
  readonly canEnforceRosterSafeRecording: boolean;
  createRoom(bookingId: string, generation: number): Promise<VideoRoom>;
  createJoinToken(input: CreateJoinTokenInput): Promise<VideoJoinToken>;
}

export function tokenWindow(startsAt: string, endsAt: string): {
  notBefore: string;
  expiresAt: string;
} {
  const open = Date.parse(startsAt) - 10 * 60 * 1000;
  const close = Date.parse(endsAt) + 15 * 60 * 1000;
  return {
    notBefore: new Date(open).toISOString(),
    expiresAt: new Date(close).toISOString(),
  };
}

export function tokenIsActive(
  notBefore: string,
  expiresAt: string,
  now: string,
): boolean {
  const current = Date.parse(now);
  return current >= Date.parse(notBefore) && current <= Date.parse(expiresAt);
}
