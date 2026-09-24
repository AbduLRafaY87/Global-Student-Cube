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
import { upsertProgramIntakeCommand } from "@/server/modules/catalog/commands";

const ALLOWED_KEYS = [
  "intakeYear",
  "intakeMonth",
  "deadlinePrecision",
  "deadlineDate",
  "deadlineMonth",
  "reason",
] as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    if (typeof body.intakeYear !== "number" || typeof body.deadlinePrecision !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const { id } = await params;
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);
    const payload = await upsertProgramIntakeCommand(context, {
      programId: requireUuid(id, "id"),
      intakeYear: body.intakeYear,
      intakeMonth: typeof body.intakeMonth === "number" ? body.intakeMonth : null,
      deadlinePrecision: body.deadlinePrecision,
      deadlineDate: optionalText(body.deadlineDate),
      deadlineMonth: typeof body.deadlineMonth === "number" ? body.deadlineMonth : null,
      reason: requiredReason(body.reason),
    });
    return commandSuccess(payload, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
