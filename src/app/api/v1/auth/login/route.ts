import {
  GENERIC_LOGIN_ERROR,
  retryAfterMessage,
  SUSPENDED_ACCOUNT_MESSAGE,
} from "@/domain/identity/abuse";
import { normalizeEmail, validateLoginEmail } from "@/domain/identity/email";
import { isSuspended, type AccountStatus } from "@/domain/identity/account-status";
import { safeInternalPath } from "@/domain/identity/return-path";
import { bumpLoginAbuse, clientIp } from "@/server/commands/abuse";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface LoginBody {
  email?: string;
  password?: string;
  next?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as LoginBody;
  const emailError = validateLoginEmail(body.email ?? "");

  if (emailError || !body.password) {
    return NextResponse.json(
      { ok: false, error: GENERIC_LOGIN_ERROR },
      { status: 400 },
    );
  }

  const email = normalizeEmail(body.email ?? "");
  const abuse = await bumpLoginAbuse(clientIp(request), email);

  if (!abuse.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: retryAfterMessage(abuse.retryAfterSeconds),
        retryAfterSeconds: abuse.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: body.password,
  });

  if (error || !data.user) {
    return NextResponse.json(
      { ok: false, error: GENERIC_LOGIN_ERROR },
      { status: 401 },
    );
  }

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("accounts")
    .select("status")
    .eq("id", data.user.id)
    .maybeSingle();

  const status = (account?.status ?? null) as AccountStatus | null;

  if (isSuspended(status)) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { ok: false, error: SUSPENDED_ACCOUNT_MESSAGE },
      { status: 403 },
    );
  }

  if (!data.user.email_confirmed_at) {
    return NextResponse.json({ ok: true, redirectTo: "/verify-email" });
  }

  const next = safeInternalPath(body.next) ?? "/profile";
  return NextResponse.json({ ok: true, redirectTo: next });
}
