import { APPLICATION_STATUSES, type ApplicationStatus } from "@/types";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { parseIfMatchVersion } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import {
  deleteApplicationCommand,
  updateApplicationCommand,
} from "@/server/modules/applications/commands";

const ALLOWED_KEYS = ["universityId", "status", "deadline"] as const;

interface PatchBody {
  universityId?: unknown;
  status?: unknown;
  deadline?: unknown;
}

function parseStatus(value: unknown): ApplicationStatus | null {
  if (value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
  }
  for (const status of APPLICATION_STATUSES) {
    if (status === value) {
      return status;
    }
  }
  throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();

  try {
    const { id } = await context.params;
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as PatchBody;
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);

    const expectedVersion = parseIfMatchVersion(request.headers.get("if-match"));
    const actor = await resolveRequestContext(requestId);
    const result = await updateApplicationCommand(actor, {
      id,
      expectedVersion,
      universityId:
        typeof body.universityId === "string" ? body.universityId : null,
      status: parseStatus(body.status),
      deadline: typeof body.deadline === "string" ? body.deadline : null,
    });

    return commandSuccess(result, requestId, { version: result.version });
  } catch (error) {
    return commandFailure(error, requestId);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();

  try {
    const { id } = await context.params;
    const expectedVersion = parseIfMatchVersion(request.headers.get("if-match"));
    const actor = await resolveRequestContext(requestId);
    const result = await deleteApplicationCommand(actor, {
      id,
      expectedVersion,
    });
    return commandSuccess(result, requestId, { version: result.version });
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
