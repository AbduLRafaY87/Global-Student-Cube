import { resolveRequestContext } from "@/server/context";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { completeFileUploadCommand } from "@/server/modules/profile/commands";

const ALLOWED_KEYS = ["detectedMime", "sha256", "durationSeconds"] as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { id } = await params;
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    const context = await resolveRequestContext(requestId);
    const result = await completeFileUploadCommand(context, {
      fileId: id,
      detectedMime: typeof body.detectedMime === "string" ? body.detectedMime : null,
      sha256: typeof body.sha256 === "string" ? body.sha256 : null,
      durationSeconds:
        typeof body.durationSeconds === "number" ? body.durationSeconds : null,
    });
    return commandSuccess(result, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
