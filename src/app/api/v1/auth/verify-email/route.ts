import {
  EMAIL_RESEND_COOLDOWN_SECONDS,
  EMAIL_RESEND_MAX_PER_HOUR,
  resendWaitMessage,
  retryAfterMessage,
} from "@/domain/identity/abuse";
import { bumpAbuse } from "@/server/commands/abuse";
import { createClient } from "@/lib/supabase/server";
import { actorContext } from "@/server/context";
import { activateAfterEmailVerifiedSql } from "@/server/modules/identity/sql-commands";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json(
      { ok: false, error: "Sign in again to continue." },
      { status: 401 },
    );
  }

  if (user.email_confirmed_at) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const cooldown = await bumpAbuse(
    `email-resend-wait:${user.id}`,
    EMAIL_RESEND_COOLDOWN_SECONDS,
    1,
  );

  if (!cooldown.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: resendWaitMessage(cooldown.retryAfterSeconds),
        retryAfterSeconds: cooldown.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  const hourly = await bumpAbuse(
    `email-resend-hour:${user.id}`,
    60 * 60,
    EMAIL_RESEND_MAX_PER_HOUR,
  );

  if (!hourly.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: retryAfterMessage(hourly.retryAfterSeconds),
        retryAfterSeconds: hourly.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  const origin = new URL(request.url).origin;
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: user.email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Unable to resend just now. Try again shortly." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    retryAfterSeconds: EMAIL_RESEND_COOLDOWN_SECONDS,
  });
}

export async function PUT() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Sign in again to continue." },
      { status: 401 },
    );
  }

  const { data: refreshed } = await supabase.auth.getUser();
  const confirmed = Boolean(refreshed.user?.email_confirmed_at);

  if (!confirmed) {
    return NextResponse.json({
      ok: false,
      verified: false,
      error: "We have not received a verification yet.",
    });
  }

  let status: string;
  try {
    status = await activateAfterEmailVerifiedSql(
      actorContext(user.id),
      user.id,
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to update your account status." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    verified: true,
    status,
    redirectTo: "/home",
  });
}
