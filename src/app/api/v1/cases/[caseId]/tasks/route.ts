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
import { caseTasksSql, createTaskSql } from "@/server/modules/counseling/commands";

const ALLOWED_KEYS = ["title", "ownerRole", "description", "dueAt", "bookingId"] as const;

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { caseId } = await params;
    requireUuid(caseId, "caseId");
    const context = await resolveRequestContext(requestId);
    return commandSuccess(await caseTasksSql(context, caseId), requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { caseId } = await params;
    requireUuid(caseId, "caseId");
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    if (typeof body.title !== "string" || typeof body.ownerRole !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await createTaskSql(context, {
        caseId,
        title: body.title,
        ownerRole: body.ownerRole,
        description: typeof body.description === "string" ? body.description : "",
        dueAt: typeof body.dueAt === "string" ? body.dueAt : null,
        bookingId: typeof body.bookingId === "string" ? body.bookingId : null,
      }),
      requestId,
      { status: 201 },
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
