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
import { createGuardianOperatedCaseCommand } from "@/server/modules/parent/commands";

const ALLOWED_KEYS = ["studentName", "studentDob"] as const;

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as {
      studentName?: unknown;
      studentDob?: unknown;
    };
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);
    if (typeof body.studentName !== "string" || body.studentName.trim() === "") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    if (typeof body.studentDob !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.studentDob)) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const context = await resolveRequestContext(requestId);
    const result = await createGuardianOperatedCaseCommand(context, {
      studentName: body.studentName.trim(),
      studentDob: body.studentDob,
    });
    return commandSuccess(result, requestId, { status: 201 });
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
