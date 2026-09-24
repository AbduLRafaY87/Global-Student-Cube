import { sha256Hex } from "@/domain/identity/hash";
import { isResetTokenReuseError } from "@/domain/identity/password-reset";
import {
  validatePassword,
  validatePasswordConfirmation,
} from "@/domain/identity/password";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { actorContext } from "@/server/context";
import { consumeResetTokenSql } from "@/server/modules/identity/sql-commands";
import { NextResponse } from "next/server";

interface ConfirmBody {
  password?: string;
  passwordConfirmation?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as ConfirmBody;
  const passwordError = validatePassword(body.password ?? "");
  const confirmError = validatePasswordConfirmation(
    body.password ?? "",
    body.passwordConfirmation ?? "",
  );

  if (passwordError || confirmError) {
    return NextResponse.json(
      { ok: false, error: passwordError ?? confirmError },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return NextResponse.json(
      { ok: false, code: "expired", error: "This reset link has expired. Request a new one." },
      { status: 401 },
    );
  }

  const tokenHash = await sha256Hex(`reset:${session.access_token}`);
  let consumed = false;
  try {
    consumed = await consumeResetTokenSql(
      actorContext(session.user.id),
      tokenHash,
      session.user.id,
    );
  } catch {
    consumed = false;
  }

  if (consumed === false) {
    return NextResponse.json(
      {
        ok: false,
        code: "expired",
        error: "This reset link has already been used. Request a new one.",
      },
      { status: 409 },
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: body.password,
  });

  if (error) {
    const reuse = isResetTokenReuseError(error.message);
    return NextResponse.json(
      {
        ok: false,
        code: reuse ? "expired" : "server",
        error: reuse
          ? "This reset link has expired. Request a new one."
          : "Unable to save a new password. Request a new link.",
      },
      { status: reuse ? 409 : 400 },
    );
  }

  const admin = createAdminClient();
  await admin.auth.admin.signOut(session.user.id, "global");

  return NextResponse.json({ ok: true, redirectTo: "/login" });
}
