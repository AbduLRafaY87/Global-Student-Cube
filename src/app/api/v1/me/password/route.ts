import { validatePassword } from "@/domain/identity/password";
import { createClient } from "@/lib/supabase/server";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";

const ALLOWED_KEYS = ["currentPassword", "newPassword"] as const;

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    if (typeof body.currentPassword !== "string" || typeof body.newPassword !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const passwordError = validatePassword(body.newPassword);
    if (passwordError) {
      throw new CommandError("VALIDATION_FAILED", passwordError);
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      throw new CommandError("AUTH_REQUIRED", "Sign in to continue.");
    }
    const current = await supabase.auth.signInWithPassword({
      email: user.email,
      password: body.currentPassword,
    });
    if (current.error) {
      throw new CommandError("VALIDATION_FAILED", "The current password is incorrect.");
    }
    const updated = await supabase.auth.updateUser({ password: body.newPassword });
    if (updated.error) {
      throw new CommandError("VALIDATION_FAILED", "The password could not be changed.");
    }
    return commandSuccess({ changed: true }, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
