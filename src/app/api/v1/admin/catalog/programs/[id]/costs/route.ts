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
import { upsertProgramCostCommand } from "@/server/modules/catalog/commands";

const ALLOWED_KEYS = [
  "academicYear",
  "feeBasis",
  "amount",
  "currency",
  "residencyCategory",
  "sourceFactId",
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
    if (
      typeof body.academicYear !== "string" ||
      typeof body.feeBasis !== "string" ||
      typeof body.amount !== "number" ||
      typeof body.currency !== "string" ||
      typeof body.sourceFactId !== "string"
    ) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const { id } = await params;
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);
    const payload = await upsertProgramCostCommand(context, {
      programId: requireUuid(id, "id"),
      academicYear: body.academicYear,
      feeBasis: body.feeBasis,
      amount: body.amount,
      currency: body.currency,
      residencyCategory: optionalText(body.residencyCategory),
      sourceFactId: requireUuid(body.sourceFactId, "sourceFactId"),
      reason: requiredReason(body.reason),
    });
    return commandSuccess(payload, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
