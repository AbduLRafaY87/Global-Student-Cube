export const SESSION_STATES = [
  "scheduled",
  "waiting",
  "in_progress",
  "ended",
  "completed",
  "interrupted",
  "rebooking_required",
] as const;

export type SessionState = (typeof SESSION_STATES)[number];

export const SESSION_EVENTS = [
  "open_join_window",
  "start_session",
  "end_session",
  "complete_session",
  "interrupt",
  "require_rebooking",
] as const;

export type SessionEvent = (typeof SESSION_EVENTS)[number];

export const SESSION_TRANSITIONS: Record<
  SessionState,
  Partial<Record<SessionEvent, SessionState>>
> = {
  scheduled: {
    open_join_window: "waiting",
    interrupt: "interrupted",
  },
  waiting: {
    start_session: "in_progress",
    interrupt: "interrupted",
    end_session: "ended",
  },
  in_progress: {
    end_session: "ended",
    interrupt: "interrupted",
  },
  ended: {
    complete_session: "completed",
  },
  completed: {},
  interrupted: {
    require_rebooking: "rebooking_required",
  },
  rebooking_required: {},
};

export function isSessionState(value: string): value is SessionState {
  return (SESSION_STATES as readonly string[]).includes(value);
}

export function applySessionEvent(
  current: SessionState,
  event: SessionEvent,
): SessionState {
  const next = SESSION_TRANSITIONS[current][event];
  if (!next) {
    throw new Error(`Invalid session transition ${current} + ${event}`);
  }
  return next;
}

export function canApplySessionEvent(
  current: SessionState,
  event: SessionEvent,
): boolean {
  return SESSION_TRANSITIONS[current][event] !== undefined;
}

export function isRewardableCompleted(
  state: SessionState,
  attendanceOutcome: string | null,
): boolean {
  return state === "completed" && attendanceOutcome === null;
}
