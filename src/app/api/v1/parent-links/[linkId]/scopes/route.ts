import { isParentScope } from "@/domain/identity/invitations";
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
import { replaceParentLinkScopesCommand } from "@/server/modules/parent/commands";

const ALLOWED_KEYS = ["scopes"] as const;

interface RouteParams {
  params: Promise<{ linkId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as { scopes?: unknown };
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);
    const scopes = Array.isArray(body.scopes)
      ? body.scopes.filter(
          (value): value is string => typeof value === "string" && isParentScope(value),
        )
      : [];
    if (scopes.length === 0) {
      throw new CommandError("VALIDATION_FAILED", "Choose at least one permission.");
    }
    const { linkId } = await params;
    const context = await resolveRequestContext(requestId);
    const result = await replaceParentLinkScopesCommand(context, linkId, scopes);
    return commandSuccess(result, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
