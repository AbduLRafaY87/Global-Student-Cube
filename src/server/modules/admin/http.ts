import { CommandError } from "@/server/errors";
import type { RequestContext } from "@/server/context";
import { parseIfMatchVersion } from "@/server/http/headers";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function requireUuid(value: string, path: string): string {
  if (!isUuid(value)) {
    throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.", {
      fields: [{ path, code: "INVALID" }],
    });
  }
  return value;
}

export function optionalUuid(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return requireUuid(value, "id");
}

export function parseLimit(value: string | null, fallback = 20): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, 50);
}

export function parseOffset(value: string | null): number {
  if (!value) {
    return 0;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

export function requiredReason(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.", {
      fields: [{ path: "reason", code: "REQUIRED" }],
    });
  }
  return value.trim();
}

export function optionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function requireAdminContext(context: RequestContext): void {
  if (context.role !== "admin") {
    throw new CommandError("FORBIDDEN", "You cannot perform this action.");
  }
  if (context.assurance !== "aal2") {
    throw new CommandError(
      "MFA_REQUIRED",
      "Confirm your authenticator to continue.",
    );
  }
}

export function readVersion(
  request: Request,
  bodyVersion: unknown,
): number {
  const header = request.headers.get("if-match");
  if (header) {
    return parseIfMatchVersion(header);
  }
  if (typeof bodyVersion === "number" && Number.isInteger(bodyVersion) && bodyVersion > 0) {
    return bodyVersion;
  }
  throw new CommandError(
    "PRECONDITION_REQUIRED",
    "This change needs a current version.",
  );
}
