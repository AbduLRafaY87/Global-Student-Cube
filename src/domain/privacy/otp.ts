export const PHONE_OTP_LENGTH = 6;
export const PHONE_OTP_TTL_SECONDS = 5 * 60;
export const PHONE_OTP_RESEND_SECONDS = 60;
export const PHONE_OTP_MAX_ATTEMPTS = 5;
export const PHONE_OTP_MAX_SENDS_PER_HOUR = 5;

export const PHONE_OTP_NOT_MFA =
  "This verifies your phone, not two-factor login.";

export interface PhoneChallengeState {
  expiresAt: string;
  attemptCount: number;
  sendCountInWindow: number;
  lastSentAt: string | null;
  consumedAt: string | null;
  storesRawOtp: false;
}

export function isSixDigitOtp(value: string): boolean {
  return /^\d{6}$/.test(value);
}

export function challengeExpired(expiresAt: string, now: string): boolean {
  return Date.parse(now) >= Date.parse(expiresAt);
}

export function canResendOtp(args: {
  lastSentAt: string | null;
  sendCountInWindow: number;
  now: string;
}): { ok: boolean; retryAfterSeconds: number; reason: string | null } {
  if (args.sendCountInWindow >= PHONE_OTP_MAX_SENDS_PER_HOUR) {
    return {
      ok: false,
      retryAfterSeconds: 3600,
      reason: "Too many codes were sent to this phone. Try again later.",
    };
  }
  if (args.lastSentAt) {
    const elapsed = Math.floor(
      (Date.parse(args.now) - Date.parse(args.lastSentAt)) / 1000,
    );
    if (elapsed < PHONE_OTP_RESEND_SECONDS) {
      return {
        ok: false,
        retryAfterSeconds: PHONE_OTP_RESEND_SECONDS - elapsed,
        reason: `You can resend in ${PHONE_OTP_RESEND_SECONDS - elapsed} seconds.`,
      };
    }
  }
  return { ok: true, retryAfterSeconds: 0, reason: null };
}

export function registerOtpAttempt(args: {
  attemptCount: number;
  expiresAt: string;
  now: string;
}): { accepted: boolean; nextAttemptCount: number; invalidated: boolean } {
  if (challengeExpired(args.expiresAt, args.now)) {
    return { accepted: false, nextAttemptCount: args.attemptCount, invalidated: true };
  }
  const next = args.attemptCount + 1;
  if (next > PHONE_OTP_MAX_ATTEMPTS) {
    return { accepted: false, nextAttemptCount: next, invalidated: true };
  }
  return {
    accepted: true,
    nextAttemptCount: next,
    invalidated: next >= PHONE_OTP_MAX_ATTEMPTS,
  };
}

export function otpSuccessBypassesEmailOrGuardian(): boolean {
  return false;
}

export function phoneOtpIsLoginMfa(): boolean {
  return false;
}

export function storesRawOtp(): false {
  return false;
}
