import { toAssuranceLevel } from "@/domain/identity/mfa";
import { createClient } from "@/lib/supabase/server";
import { CommandError } from "@/server/errors";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";

export async function GET() {
  const requestId = newRequestId();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new CommandError("AUTH_REQUIRED", "Sign in to continue.");
    }

    const [{ data: aal }, { data: factors }] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);

    const totp = (factors?.totp ?? []).map((factor) => ({
      id: factor.id,
      status: factor.status,
    }));

    return commandSuccess(
      {
        currentLevel: toAssuranceLevel(aal?.currentLevel ?? "aal1"),
        nextLevel: toAssuranceLevel(aal?.nextLevel ?? "aal1"),
        factors: totp,
      },
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
