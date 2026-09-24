import { normalizeEmail } from "@/domain/identity/email";
import { sha256Hex } from "@/domain/identity/hash";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { acceptInvitationSql } from "@/server/modules/identity/invitations";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_KEYS = ["token"] as const;

interface AcceptBody {
  token?: unknown;
}

export async function POST(request: Request) {
  const requestId = newRequestId();

  try {
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as AcceptBody;
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);

    if (typeof body.token !== "string" || body.token.trim() === "") {
      throw new CommandError("NOT_FOUND", "That invitation is not available.");
    }

    const context = await resolveRequestContext(requestId);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const email = user?.email ? normalizeEmail(user.email) : "";
    if (!email) {
      throw new CommandError("AUTH_REQUIRED", "Sign in to continue.");
    }

    const [tokenHash, emailHash] = await Promise.all([
      sha256Hex(body.token),
      sha256Hex(email),
    ]);

    const accepted = await acceptInvitationSql(context, {
      tokenHash,
      emailHash,
      emailNormalized: email,
    });

    return commandSuccess(accepted, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
