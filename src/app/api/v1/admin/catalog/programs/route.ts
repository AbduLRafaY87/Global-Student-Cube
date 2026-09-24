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
  requireUuid,
} from "@/server/modules/admin/http";
import { upsertProgramCommand } from "@/server/modules/catalog/commands";

const ALLOWED_KEYS = [
  "id",
  "universityId",
  "name",
  "level",
  "fieldId",
  "durationValue",
  "durationUnit",
  "studyModes",
  "generalUrl",
  "internationalRatio",
  "reason",
] as const;

interface Body {
  id?: unknown;
  universityId?: unknown;
  name?: unknown;
  level?: unknown;
  fieldId?: unknown;
  durationValue?: unknown;
  durationUnit?: unknown;
  studyModes?: unknown;
  generalUrl?: unknown;
  internationalRatio?: unknown;
  reason?: unknown;
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
      typeof body.universityId !== "string" ||
      typeof body.name !== "string" ||
      typeof body.level !== "string" ||
      typeof body.fieldId !== "string" ||
      typeof body.durationValue !== "number" ||
      typeof body.durationUnit !== "string"
    ) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);
    const payload = await upsertProgramCommand(context, {
      id: optionalText(body.id),
      universityId: requireUuid(body.universityId, "universityId"),
      name: body.name,
      level: body.level,
      fieldId: requireUuid(body.fieldId, "fieldId"),
      durationValue: body.durationValue,
      durationUnit: body.durationUnit,
      studyModes: Array.isArray(body.studyModes)
        ? body.studyModes.filter((value): value is string => typeof value === "string")
        : ["on_campus"],
      generalUrl: optionalText(body.generalUrl),
      internationalRatio:
        typeof body.internationalRatio === "number" ? body.internationalRatio : null,
      reason: requiredReason(body.reason),
    });
    return commandSuccess(payload, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
