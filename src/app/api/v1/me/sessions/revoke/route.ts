import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";

const ALLOWED_KEYS = ["scope"] as const;

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    if (body.scope !== "others" && body.scope !== "all") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new CommandError("AUTH_REQUIRED", "Sign in to continue.");
    }
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.signOut(
      user.id,
      body.scope === "all" ? "global" : "others",
    );
    if (error) {
      throw new CommandError("INTERNAL_ERROR", "Other sessions could not be revoked.");
    }
    return commandSuccess({ revoked: body.scope }, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
