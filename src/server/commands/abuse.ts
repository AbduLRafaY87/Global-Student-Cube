import {
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_SECONDS,
} from "@/domain/identity/abuse";
import { sha256Hex } from "@/domain/identity/hash";
import { createAdminClient } from "@/lib/supabase/admin";

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function bumpLoginAbuse(
  ip: string,
  emailNormalized: string,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  return bumpAbuse(
    `login:${ip}:${emailNormalized}`,
    LOGIN_WINDOW_SECONDS,
    LOGIN_MAX_ATTEMPTS,
  );
}

export async function bumpAbuse(
  key: string,
  windowSeconds: number,
  limit: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const admin = createAdminClient();
  const keyHash = await sha256Hex(key);
  const { data, error } = await admin.rpc("bump_abuse", {
    p_key_hash: keyHash,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  const payload = data as { allowed?: boolean; retry_after_seconds?: number };
  return {
    allowed: payload.allowed === true,
    retryAfterSeconds: payload.retry_after_seconds ?? 0,
  };
}
