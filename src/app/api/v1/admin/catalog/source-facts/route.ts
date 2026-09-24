import { parsePublicHttpUrl } from "@/domain/catalog/ingestion";
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
import {
  upsertSourceDocumentCommand,
  upsertSourceFactCommand,
} from "@/server/modules/catalog/commands";

const ALLOWED_KEYS = [
  "canonicalUrl",
  "contentHash",
  "excerpt",
  "permissionBasis",
  "method",
  "entityType",
  "entityId",
  "fieldPath",
  "value",
  "sourceType",
  "nextReviewAt",
  "reason",
] as const;

const SOURCE_TYPES = [
  "official_university",
  "government",
  "ranking_provider",
  "university_partner",
] as const;

interface Body {
  canonicalUrl?: unknown;
  contentHash?: unknown;
  excerpt?: unknown;
  permissionBasis?: unknown;
  method?: unknown;
  entityType?: unknown;
  entityId?: unknown;
  fieldPath?: unknown;
  value?: unknown;
  sourceType?: unknown;
  nextReviewAt?: unknown;
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
      typeof body.canonicalUrl !== "string" ||
      typeof body.contentHash !== "string" ||
      typeof body.entityType !== "string" ||
      typeof body.entityId !== "string" ||
      typeof body.fieldPath !== "string" ||
      typeof body.sourceType !== "string" ||
      typeof body.nextReviewAt !== "string" ||
      !(SOURCE_TYPES as readonly string[]).includes(body.sourceType)
    ) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }

    const parsed = parsePublicHttpUrl(body.canonicalUrl);
    if (!parsed) {
      throw new CommandError(
        "VALIDATION_FAILED",
        "That destination is not on the public allowlist path.",
      );
    }

    const reason = requiredReason(body.reason);
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);

    const document = await upsertSourceDocumentCommand(context, {
      canonicalUrl: parsed.toString(),
      officialHost: parsed.hostname.toLowerCase(),
      retrievedAt: new Date().toISOString(),
      contentHash: body.contentHash,
      excerpt: optionalText(body.excerpt),
      permissionBasis:
        typeof body.permissionBasis === "string"
          ? body.permissionBasis
          : "official_public_page",
      method: typeof body.method === "string" ? body.method : "manual",
      reason,
    });

    const fact = await upsertSourceFactCommand(context, {
      documentId: document.id,
      entityType: body.entityType,
      entityId: requireUuid(body.entityId, "entityId"),
      fieldPath: body.fieldPath,
      valueJson: body.value ?? null,
      excerpt: optionalText(body.excerpt),
      sourceType: body.sourceType,
      nextReviewAt: body.nextReviewAt,
      reason,
    });

    return commandSuccess({ documentId: document.id, id: fact.id }, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
