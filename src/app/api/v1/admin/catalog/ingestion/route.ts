import {
  isIngestionSourceType,
  parsePublicHttpUrl,
} from "@/domain/catalog/ingestion";
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
import { optionalText, requireAdminContext, requiredReason } from "@/server/modules/admin/http";
import { submitCatalogIngestionCommand } from "@/server/modules/catalog/commands";
import { retrievePermittedExcerpt } from "@/server/modules/catalog/retrieve";

const ALLOWED_KEYS = [
  "sourceType",
  "canonicalUrl",
  "permissionBasis",
  "licenseRef",
  "entityType",
  "entityId",
  "reviewOwner",
  "proposedFields",
  "contentHash",
  "excerpt",
  "reason",
] as const;

interface Body {
  sourceType?: unknown;
  canonicalUrl?: unknown;
  permissionBasis?: unknown;
  licenseRef?: unknown;
  entityType?: unknown;
  entityId?: unknown;
  reviewOwner?: unknown;
  proposedFields?: unknown;
  contentHash?: unknown;
  excerpt?: unknown;
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

    if (typeof body.sourceType !== "string" || !isIngestionSourceType(body.sourceType)) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    if (typeof body.canonicalUrl !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const parsed = parsePublicHttpUrl(body.canonicalUrl);
    if (!parsed) {
      throw new CommandError(
        "VALIDATION_FAILED",
        "That destination is not on the public allowlist path.",
      );
    }

    let retrieved = await retrievePermittedExcerpt(body.canonicalUrl);
    if (!retrieved && body.sourceType === "official_url") {
      throw new CommandError(
        "VALIDATION_FAILED",
        "Retrieval failed. Use the manual sourced-entry path.",
      );
    }
    if (!retrieved) {
      const excerpt = optionalText(body.excerpt);
      const hash = optionalText(body.contentHash);
      if (!excerpt || !hash) {
        throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
      }
      retrieved = {
        host: parsed.hostname.toLowerCase(),
        path: parsed.pathname || "/",
        retrievedAt: new Date().toISOString(),
        contentHash: hash,
        excerpt,
      };
    }

    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);
    const payload = await submitCatalogIngestionCommand(context, {
      sourceType: body.sourceType,
      canonicalUrl: parsed.toString(),
      officialHost: retrieved.host,
      path: retrieved.path,
      permissionBasis:
        typeof body.permissionBasis === "string"
          ? body.permissionBasis
          : "official_public_page",
      licenseRef: optionalText(body.licenseRef),
      entityType: typeof body.entityType === "string" ? body.entityType : "university",
      entityId: optionalText(body.entityId),
      reviewOwner: optionalText(body.reviewOwner),
      retrievedAt: retrieved.retrievedAt,
      contentHash: retrieved.contentHash,
      excerpt: retrieved.excerpt,
      proposedFields:
        body.proposedFields && typeof body.proposedFields === "object"
          ? (body.proposedFields as Record<string, unknown>)
          : {},
      reason: requiredReason(body.reason),
    });
    return commandSuccess(payload, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
