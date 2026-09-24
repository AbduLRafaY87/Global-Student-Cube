export type ResetFlowState = "request" | "sent" | "new_password" | "expired";

export function resetErrorState(message: string): ResetFlowState {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("expired") ||
    normalized.includes("already") ||
    normalized.includes("used") ||
    normalized.includes("invalid") ||
    normalized.includes("otp")
  ) {
    return "expired";
  }

  return "request";
}

export function isResetTokenReuseError(message: string): boolean {
  return resetErrorState(message) === "expired";
}

export interface ConsumedTokenStore {
  has(hash: string): boolean;
  add(hash: string): void;
}

export function consumeResetToken(
  store: ConsumedTokenStore,
  tokenHash: string,
): boolean {
  if (store.has(tokenHash)) {
    return false;
  }

  store.add(tokenHash);
  return true;
}
