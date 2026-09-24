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
import { upsertUniversityCommand } from "@/server/modules/catalog/commands";

const ALLOWED_KEYS = [
  "id",
  "name",
  "slug",
  "country",
  "city",
  "type",
  "websiteUrl",
  "aliases",
  "reason",
] as const;

interface Body {
  id?: unknown;
  name?: unknown;
  slug?: unknown;
  country?: unknown;
  city?: unknown;
  type?: unknown;
  websiteUrl?: unknown;
  aliases?: unknown;
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
    if (typeof body.name !== "string" || typeof body.country !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);
    const payload = await upsertUniversityCommand(context, {
      id: optionalText(body.id),
      name: body.name,
      slug: optionalText(body.slug),
      country: body.country,
      city: optionalText(body.city),
      type: optionalText(body.type),
      websiteUrl: optionalText(body.websiteUrl),
      aliases: Array.isArray(body.aliases)
        ? body.aliases.filter((value): value is string => typeof value === "string")
        : [],
      reason: requiredReason(body.reason),
    });
    return commandSuccess(payload, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
