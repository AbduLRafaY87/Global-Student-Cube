import { CommandError } from "../errors";

export function parseIfMatchVersion(header: string | null): number {
  if (!header || header.trim() === "") {
    throw new CommandError(
      "PRECONDITION_REQUIRED",
      "Updates require If-Match.",
    );
  }

  const trimmed = header.trim();
  const quoted = /^"v(\d+)"$/.exec(trimmed);
  const bare = /^v(\d+)$/.exec(trimmed);
  const digits = /^(\d+)$/.exec(trimmed);
  const match = quoted ?? bare ?? digits;
  const value = match ? Number(match[1]) : Number.NaN;

  if (!Number.isInteger(value) || value < 1) {
    throw new CommandError("INVALID_REQUEST", "If-Match must be a version.");
  }

  return value;
}

export function etagForVersion(version: number): string {
  return `"v${version}"`;
}

export function requireIdempotencyKey(header: string | null): string {
  const key = header?.trim() ?? "";
  if (key === "") {
    throw new CommandError(
      "INVALID_REQUEST",
      "Create commands require Idempotency-Key.",
    );
  }
  return key;
}

export function parseFormVersion(value: FormDataEntryValue | null): number {
  const raw = String(value ?? "").trim();
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new CommandError(
      "PRECONDITION_REQUIRED",
      "This change needs a current version.",
    );
  }
  return parsed;
}
