import { createClient } from "@/lib/supabase/server";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";

const ALLOWED_KEYS = ["factorId"] as const;

interface ChallengeBody {
  factorId?: unknown;
}

export async function POST(request: Request) {
  const requestId = newRequestId();

  try {
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as ChallengeBody;
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);

    if (typeof body.factorId !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.mfa.challenge({
      factorId: body.factorId,
    });

    if (error || !data) {
      throw new CommandError(
        "VALIDATION_FAILED",
        "Unable to start an authenticator challenge.",
      );
    }

    return commandSuccess({ challengeId: data.id, factorId: body.factorId }, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
