import { resolveRequestContext } from "@/server/context";
import {
  assertBodySize,
  assertJsonContentType,
  requiredLiteral,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import { decideMentorRequestSql } from "@/server/modules/mentorship/commands";

const ALLOWED_KEYS = ["decision"] as const;
const DECISIONS = ["accept", "decline"] as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { id } = await params;
    requireUuid(id, "id");
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    const decision = requiredLiteral(body.decision, DECISIONS, "decision");
    const context = await resolveRequestContext(requestId);
    return commandSuccess(await decideMentorRequestSql(context, id, decision), requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
