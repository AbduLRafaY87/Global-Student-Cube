export const SESSION_MINUTES = 30;
export const SESSION_BUFFER_MINUTES = 15;
export const RESCHEDULE_NOTICE_HOURS = 48;

export type BookingLinkStatus = "preparing" | "ready" | "calendar_attention";

export function sessionEndMs(startMs: number): number {
  return startMs + SESSION_MINUTES * 60 * 1000;
}

export function occupancyEndMs(startMs: number): number {
  return sessionEndMs(startMs) + SESSION_BUFFER_MINUTES * 60 * 1000;
}

export function occupancyConflicts(startA: string, startB: string): boolean {
  const a0 = Date.parse(startA);
  const b0 = Date.parse(startB);
  if (!Number.isFinite(a0) || !Number.isFinite(b0)) {
    return true;
  }
  const a1 = occupancyEndMs(a0);
  const b1 = occupancyEndMs(b0);
  return a0 < b1 && b0 < a1;
}

export function canReschedule(startAt: string, now: string): boolean {
  const start = Date.parse(startAt);
  const current = Date.parse(now);
  if (!Number.isFinite(start) || !Number.isFinite(current)) {
    return false;
  }
  return start - current >= RESCHEDULE_NOTICE_HOURS * 60 * 60 * 1000;
}

export function canCancelAppointment(startAt: string, now: string): boolean {
  return canReschedule(startAt, now);
}

export function hasSingleActiveAppointment(activeCount: number): boolean {
  return activeCount <= 1;
}

export function adapterFailureKeepsBooking(status: BookingLinkStatus): {
  confirmed: true;
  linkStatus: BookingLinkStatus;
} {
  return { confirmed: true, linkStatus: status };
}

export function calendarFailureLinkStatus(): BookingLinkStatus {
  return "calendar_attention";
}

export function videoFailureLinkStatus(): BookingLinkStatus {
  return "preparing";
}
