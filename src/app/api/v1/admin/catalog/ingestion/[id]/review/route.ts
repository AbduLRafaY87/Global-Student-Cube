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
import { reviewCatalogIngestionCommand } from "@/server/modules/catalog/commands";

const ALLOWED_KEYS = ["decisions", "nextReviewAt", "reason"] as const;

interface Body {
  decisions?: unknown;
  nextReviewAt?: unknown;
  reason?: unknown;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Body;
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);
    if (!Array.isArray(body.decisions)) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }

    const { id } = await params;
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);
    const payload = await reviewCatalogIngestionCommand(context, {
      jobId: requireUuid(id, "id"),
      decisions: body.decisions as Array<{
        fieldPath: string;
        decision: "accepted" | "rejected";
      }>,
      nextReviewAt: optionalText(body.nextReviewAt),
      reason: requiredReason(body.reason),
    });
    return commandSuccess(payload, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
