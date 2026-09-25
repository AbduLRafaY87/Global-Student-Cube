import { resolveRequestContext } from "@/server/context";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import { withdrawStorySql } from "@/server/modules/news/commands";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, []);
    const { id } = await context.params;
    requireUuid(id, "id");
    const requestContext = await resolveRequestContext(requestId);
    return commandSuccess(await withdrawStorySql(requestContext, id), requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
