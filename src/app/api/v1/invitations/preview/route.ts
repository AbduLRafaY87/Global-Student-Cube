import { sha256Hex } from "@/domain/identity/hash";
import { guestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { previewInvitationSql } from "@/server/modules/identity/invitations";

const ALLOWED_KEYS = ["token"] as const;

interface PreviewBody {
  token?: unknown;
}

export async function POST(request: Request) {
  const requestId = newRequestId();

  try {
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as PreviewBody;
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);

    if (typeof body.token !== "string" || body.token.trim() === "") {
      throw new CommandError("NOT_FOUND", "That invitation is not available.");
    }

    const tokenHash = await sha256Hex(body.token);
    const preview = await previewInvitationSql(guestContext(requestId), tokenHash);
    return commandSuccess(preview, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
