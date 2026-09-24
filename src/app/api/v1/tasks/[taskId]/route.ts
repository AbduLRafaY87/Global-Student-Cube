import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import { extendTaskSql, transitionTaskSql } from "@/server/modules/counseling/commands";

const ALLOWED_KEYS = ["event", "note", "evidenceId", "nextDueAt", "reason"] as const;

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { taskId } = await params;
    requireUuid(taskId, "taskId");
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    const context = await resolveRequestContext(requestId);
    if (body.event === "extend") {
      if (typeof body.nextDueAt !== "string" || typeof body.reason !== "string") {
        throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
      }
      return commandSuccess(
        await extendTaskSql(context, taskId, body.nextDueAt, body.reason),
        requestId,
      );
    }
    if (typeof body.event !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    return commandSuccess(
      await transitionTaskSql(
        context,
        taskId,
        body.event,
        typeof body.note === "string" ? body.note : null,
        typeof body.evidenceId === "string" ? body.evidenceId : null,
      ),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
