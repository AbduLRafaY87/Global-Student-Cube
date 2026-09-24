import {
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_SECONDS,
} from "@/domain/identity/abuse";
import { sha256Hex } from "@/domain/identity/hash";
import { guestContext } from "@/server/context";
import { bumpAbuseSql } from "@/server/modules/identity/sql-commands";

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
  const keyHash = await sha256Hex(key);
  const payload = await bumpAbuseSql(
    guestContext(),
    keyHash,
    windowSeconds,
    limit,
  );
  return {
    allowed: payload.allowed === true,
    retryAfterSeconds: payload.retry_after_seconds ?? 0,
  };
}
