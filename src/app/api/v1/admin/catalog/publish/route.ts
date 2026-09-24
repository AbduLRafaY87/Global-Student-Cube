import {
  CATALOG_ENTITY_TYPES,
  CATALOG_PUBLICATION_STATES,
  type CatalogEntityType,
  type CatalogPublicationState,
} from "@/domain/catalog/catalog";
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
import { setCatalogPublicationStateCommand } from "@/server/modules/catalog/commands";

const ALLOWED_KEYS = ["entityType", "entityId", "nextState", "reason"] as const;

interface Body {
  entityType?: unknown;
  entityId?: unknown;
  nextState?: unknown;
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
      typeof body.entityType !== "string" ||
      !(CATALOG_ENTITY_TYPES as readonly string[]).includes(body.entityType)
    ) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    if (
      typeof body.nextState !== "string" ||
      !(CATALOG_PUBLICATION_STATES as readonly string[]).includes(body.nextState)
    ) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    if (typeof body.entityId !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }

    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);
    const payload = await setCatalogPublicationStateCommand(context, {
      entityType: body.entityType as CatalogEntityType,
      entityId: requireUuid(body.entityId, "entityId"),
      nextState: body.nextState as CatalogPublicationState,
      reason: requiredReason(body.reason),
    });
    return commandSuccess(payload, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
