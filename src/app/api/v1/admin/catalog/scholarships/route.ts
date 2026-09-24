import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import {
  optionalText,
  requireAdminContext,
  requiredReason,
} from "@/server/modules/admin/http";
import { upsertScholarshipCommand } from "@/server/modules/catalog/commands";

const ALLOWED_KEYS = [
  "id",
  "name",
  "providerName",
  "officialUrl",
  "providerType",
  "countryCodes",
  "levels",
  "fieldIds",
  "availability",
  "deadlinePrecision",
  "deadlineDate",
  "deadlineMonth",
  "reason",
] as const;

interface Body {
  id?: unknown;
  name?: unknown;
  providerName?: unknown;
  officialUrl?: unknown;
  providerType?: unknown;
  countryCodes?: unknown;
  levels?: unknown;
  fieldIds?: unknown;
  availability?: unknown;
  deadlinePrecision?: unknown;
  deadlineDate?: unknown;
  deadlineMonth?: unknown;
  reason?: unknown;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Body;
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);
    if (
      typeof body.name !== "string" ||
      typeof body.providerName !== "string" ||
      typeof body.officialUrl !== "string" ||
      typeof body.providerType !== "string" ||
      typeof body.availability !== "string"
    ) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);
    const payload = await upsertScholarshipCommand(context, {
      id: optionalText(body.id),
      name: body.name,
      providerName: body.providerName,
      officialUrl: body.officialUrl,
      providerType: body.providerType,
      countryCodes: strings(body.countryCodes),
      levels: strings(body.levels),
      fieldIds: strings(body.fieldIds),
      availability: body.availability,
      deadlinePrecision:
        typeof body.deadlinePrecision === "string" ? body.deadlinePrecision : "unknown",
      deadlineDate: optionalText(body.deadlineDate),
      deadlineMonth: typeof body.deadlineMonth === "number" ? body.deadlineMonth : null,
      reason: requiredReason(body.reason),
    });
    return commandSuccess(payload, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
