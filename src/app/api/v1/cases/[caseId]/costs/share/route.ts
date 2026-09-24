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
import { shareCostSnapshotCommand } from "@/server/modules/costs/commands";

const ALLOWED_KEYS = ["parentLinkId"] as const;

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { caseId } = await params;
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as { parentLinkId?: unknown };
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);
    if (typeof body.parentLinkId !== "string" || body.parentLinkId.trim() === "") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const context = await resolveRequestContext(requestId);
    const result = await shareCostSnapshotCommand(context, caseId, body.parentLinkId);
    return commandSuccess(result, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
