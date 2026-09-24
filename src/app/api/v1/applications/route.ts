import { APPLICATION_STATUSES, type ApplicationStatus } from "@/types";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  canonicalHash,
  pathHash,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { createApplicationCommand } from "@/server/modules/applications/commands";

const ALLOWED_KEYS = ["universityId", "status", "deadline"] as const;

interface CreateBody {
  universityId?: unknown;
  status?: unknown;
  deadline?: unknown;
}

function parseStatus(value: unknown): ApplicationStatus | null {
  if (typeof value !== "string") {
    return null;
  }
  for (const status of APPLICATION_STATUSES) {
    if (status === value) {
      return status;
    }
  }
  return null;
}

export async function POST(request: Request) {
  const requestId = newRequestId();

  try {
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as CreateBody;
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);

    const universityId =
      typeof body.universityId === "string" ? body.universityId.trim() : "";
    const status = parseStatus(body.status);
    const deadline =
      typeof body.deadline === "string" ? body.deadline.trim() : "";

    if (!universityId || !status || !deadline) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }

    const idempotencyKey = requireIdempotencyKey(
      request.headers.get("idempotency-key"),
    );
    const context = await resolveRequestContext(requestId);
    const canonical = { universityId, status, deadline };
    const result = await createApplicationCommand(context, {
      universityId,
      status,
      deadline,
      idempotencyKey,
      requestHash: canonicalHash(canonical),
      pathHash: pathHash("/api/v1/applications"),
    });

    return commandSuccess(result, requestId, {
      status: 201,
      version: result.version,
    });
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
