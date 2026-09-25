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
  createDataRequestCommand,
  listMyDataRequestsCommand,
} from "@/server/modules/privacy/commands";

export async function GET() {
  const requestId = newRequestId();
  try {
    const context = await resolveRequestContext(requestId);
    return commandSuccess(await listMyDataRequestsCommand(context), requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}

const ALLOWED_KEYS = ["kind", "reason", "confirm"] as const;

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    if (body.kind !== "export" && body.kind !== "delete") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    if (body.kind === "delete" && body.confirm !== true) {
      throw new CommandError(
        "VALIDATION_FAILED",
        "Confirm account deletion to continue.",
      );
    }
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await createDataRequestCommand(
        context,
        context.accountId,
        body.kind,
        typeof body.reason === "string" ? body.reason : "",
      ),
      requestId,
      { status: 202 },
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
