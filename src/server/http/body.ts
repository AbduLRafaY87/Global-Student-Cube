import { createHash } from "node:crypto";
import { CommandError } from "../errors";

const MAX_BODY_BYTES = 64 * 1024;

export function rejectUnknownKeys(
  body: Record<string, unknown>,
  allowed: readonly string[],
): void {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(body).filter((key) => !allowedSet.has(key));
  if (unknown.length > 0) {
    throw new CommandError("INVALID_REQUEST", "Unknown fields are not allowed.", {
      fields: unknown.map((path) => ({ path, code: "UNKNOWN_KEY" })),
    });
  }
}

export function assertJsonContentType(request: Request): void {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new CommandError(
      "UNSUPPORTED_MEDIA",
      "Use application/json.",
    );
  }
}

export function assertBodySize(request: Request): void {
  const raw = request.headers.get("content-length");
  if (!raw) {
    return;
  }
  const length = Number(raw);
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    throw new CommandError("PAYLOAD_TOO_LARGE", "The request is too large.");
  }
}

export function canonicalHash(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex");
}

export function pathHash(path: string): string {
  return createHash("sha256").update(path, "utf8").digest("hex");
}
