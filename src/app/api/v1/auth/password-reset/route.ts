import { GENERIC_RESET_CONFIRMATION, retryAfterMessage } from "@/domain/identity/abuse";
import { normalizeEmail, validateLoginEmail } from "@/domain/identity/email";
import { PASSWORD_RESET_COOLDOWN_SECONDS } from "@/domain/identity/abuse";
import { bumpAbuse, clientIp } from "@/server/commands/abuse";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface ResetRequestBody {
  email?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as ResetRequestBody;
  const emailError = validateLoginEmail(body.email ?? "");
  const origin = new URL(request.url).origin;

  if (!emailError) {
    const email = normalizeEmail(body.email ?? "");
    const abuse = await bumpAbuse(
      `password-reset:${clientIp(request)}:${email}`,
      PASSWORD_RESET_COOLDOWN_SECONDS,
      1,
    );

    if (!abuse.allowed) {
      return NextResponse.json(
        {
          ok: true,
          message: GENERIC_RESET_CONFIRMATION,
          notice: retryAfterMessage(abuse.retryAfterSeconds),
        },
      );
    }

    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/password-reset`,
    });
  }

  return NextResponse.json({
    ok: true,
    message: GENERIC_RESET_CONFIRMATION,
  });
}
