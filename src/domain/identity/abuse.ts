export const LOGIN_WINDOW_SECONDS = 15 * 60;
export const LOGIN_MAX_ATTEMPTS = 5;
export const EMAIL_RESEND_COOLDOWN_SECONDS = 60;
export const EMAIL_RESEND_MAX_PER_HOUR = 5;
export const PASSWORD_RESET_COOLDOWN_SECONDS = 60;

export const GENERIC_LOGIN_ERROR = "Email or password is incorrect.";
export const GENERIC_RESET_CONFIRMATION =
  "If an account exists for that email, we sent a reset link.";
export const SUSPENDED_ACCOUNT_MESSAGE =
  "This account is suspended. Sign-in cannot continue.";
export const UNVERIFIED_BLOCK_MESSAGE =
  "Verify your email before opening this page.";

export function retryAfterMessage(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

export function resendWaitMessage(seconds: number): string {
  return `You can resend in ${seconds} seconds.`;
}
