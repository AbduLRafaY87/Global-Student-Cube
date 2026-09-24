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
import { upsertAccommodationCommand } from "@/server/modules/catalog/commands";

const ALLOWED_KEYS = [
  "id",
  "universityId",
  "name",
  "type",
  "amount",
  "currency",
  "basis",
  "reason",
] as const;

interface Body {
  id?: unknown;
  universityId?: unknown;
  name?: unknown;
  type?: unknown;
  amount?: unknown;
  currency?: unknown;
  basis?: unknown;
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
      typeof body.type !== "string" ||
      typeof body.basis !== "string"
    ) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);
    const payload = await upsertAccommodationCommand(context, {
      id: optionalText(body.id),
      universityId: requireUuid(body.universityId, "universityId"),
      name: body.name,
      type: body.type,
      amount: typeof body.amount === "number" ? body.amount : null,
      currency: optionalText(body.currency),
      basis: body.basis,
      reason: requiredReason(body.reason),
    });
    return commandSuccess(payload, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
