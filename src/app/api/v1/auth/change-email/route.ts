import { validateLoginEmail } from "@/domain/identity/email";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface ChangeEmailBody {
  email?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as ChangeEmailBody;
  const emailError = validateLoginEmail(body.email ?? "");

  if (emailError) {
    return NextResponse.json({ ok: false, error: emailError }, { status: 400 });
  }

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

  const { error } = await supabase.auth.updateUser({
    email: body.email,
  });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to change this email. Your previous address is unchanged.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
