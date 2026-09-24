import { safeInternalPath } from "@/domain/identity/return-path";
import { createClient } from "@/lib/supabase/server";
import { actorContext } from "@/server/context";
import { activateAfterEmailVerifiedSql } from "@/server/modules/identity/sql-commands";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeInternalPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    if (next === "/password-reset") {
      return NextResponse.redirect(
        new URL("/password-reset?error=expired", requestUrl.origin),
      );
    }
    return NextResponse.redirect(
      new URL("/verify-email?error=expired", requestUrl.origin),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  if (next === "/password-reset") {
    return NextResponse.redirect(
      new URL("/password-reset?state=new", requestUrl.origin),
    );
  }

  if (!user.email_confirmed_at) {
    return NextResponse.redirect(new URL("/verify-email", requestUrl.origin));
  }

  try {
    await activateAfterEmailVerifiedSql(actorContext(user.id), user.id);
  } catch {
    // Account row may not exist yet for legacy users.
  }

  return NextResponse.redirect(new URL("/profile", requestUrl.origin));
}
