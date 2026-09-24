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
  requireAdminContext,
  requiredReason,
  requireUuid,
} from "@/server/modules/admin/http";
import { upsertEntryCriterionCommand } from "@/server/modules/catalog/commands";

const ALLOWED_KEYS = [
  "criterionKey",
  "kind",
  "requirement",
  "mandatory",
  "weight",
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
      typeof body.criterionKey !== "string" ||
      typeof body.kind !== "string" ||
      typeof body.requirement !== "object" ||
      body.requirement === null
    ) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const { id } = await params;
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);
    const payload = await upsertEntryCriterionCommand(context, {
      programId: requireUuid(id, "id"),
      criterionKey: body.criterionKey,
      kind: body.kind,
      requirement: body.requirement as Record<string, unknown>,
      mandatory: body.mandatory !== false,
      weight: typeof body.weight === "number" ? body.weight : null,
      reason: requiredReason(body.reason),
    });
    return commandSuccess(payload, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
