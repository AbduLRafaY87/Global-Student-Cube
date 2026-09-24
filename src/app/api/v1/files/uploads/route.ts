import { validateFileUpload } from "@/domain/profile/files";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { registerFileUploadCommand } from "@/server/modules/profile/commands";

const ALLOWED_KEYS = ["caseId", "purpose", "sizeBytes", "mime"] as const;

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    const caseId = typeof body.caseId === "string" ? body.caseId : "";
    const purpose = typeof body.purpose === "string" ? body.purpose : "";
    const sizeBytes = typeof body.sizeBytes === "number" ? body.sizeBytes : 0;
    const mime = typeof body.mime === "string" ? body.mime : "";
    const errors = validateFileUpload({ purpose, sizeBytes, mime });
    if (!caseId || errors.length > 0) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.", {
        fields: errors.map((error) => ({ path: error.path, code: error.code })),
      });
    }
    const context = await resolveRequestContext(requestId);
    const result = await registerFileUploadCommand(context, {
      caseId,
      purpose,
      sizeBytes,
      mime,
    });
    return commandSuccess(result, requestId, { status: 201 });
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
