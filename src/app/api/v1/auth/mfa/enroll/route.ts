import { createClient } from "@/lib/supabase/server";
import { CommandError } from "@/server/errors";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";

export async function POST() {
  const requestId = newRequestId();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new CommandError("AUTH_REQUIRED", "Sign in to continue.");
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator",
    });

    if (error || !data.totp) {
      throw new CommandError(
        "VALIDATION_FAILED",
        "Unable to start authenticator setup.",
      );
    }

    return commandSuccess(
      {
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      },
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
