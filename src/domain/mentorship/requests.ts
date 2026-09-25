export const REQUEST_STATES = [
  "draft",
  "requested",
  "accepted",
  "declined",
  "withdrawn",
  "expired",
] as const;
export type RequestState = (typeof REQUEST_STATES)[number];

export const REQUEST_PREFERENCES = ["chat", "session", "either"] as const;
export type RequestPreference = (typeof REQUEST_PREFERENCES)[number];

export const PURPOSE_MAX = 600;
export const REQUEST_EXPIRE_DAYS = 7;

export type RequestActor = "mentee" | "mentor" | "worker";

export interface RequestTransitionInput {
  from: RequestState;
  to: RequestState;
  actor: RequestActor;
}

export function canTransitionRequest(input: RequestTransitionInput): boolean {
  if (input.from === "draft" && input.to === "requested" && input.actor === "mentee") {
    return true;
  }
  if (input.from === "requested" && input.to === "accepted" && input.actor === "mentor") {
    return true;
  }
  if (input.from === "requested" && input.to === "declined" && input.actor === "mentor") {
    return true;
  }
  if (input.from === "requested" && input.to === "withdrawn" && input.actor === "mentee") {
    return true;
  }
  if (input.from === "requested" && input.to === "expired" && input.actor === "worker") {
    return true;
  }
  return false;
}

export function requestExpiresAt(requestedAt: Date): Date {
  const expires = new Date(requestedAt.getTime());
  expires.setUTCDate(expires.getUTCDate() + REQUEST_EXPIRE_DAYS);
  return expires;
}

export function isPendingRequest(state: string): boolean {
  return state === "draft" || state === "requested";
}

export function acceptCreatesSingleConnection(existingConnectionId: string | null): boolean {
  return existingConnectionId !== null;
}

export function messagingAllowed(state: string): boolean {
  return state === "accepted";
}

export function bookingAllowed(state: string): boolean {
  return state === "accepted";
}

export function canWithdraw(state: string): boolean {
  return state === "requested";
}

export function privateConnectBlocked(args: {
  blocked: boolean;
  restricted: boolean;
  isMinor: boolean;
  hasVerifiedGuardian: boolean;
}): boolean {
  if (args.blocked || args.restricted) {
    return true;
  }
  if (args.isMinor && !args.hasVerifiedGuardian) {
    return true;
  }
  return false;
}

export function requestPairsAllowed(args: {
  menteeKind: "student" | "parent";
  mentorKind: "alumni" | "parent";
}): boolean {
  if (args.menteeKind === "student" && args.mentorKind === "alumni") {
    return true;
  }
  if (args.menteeKind === "parent" && args.mentorKind === "parent") {
    return true;
  }
  return false;
}
