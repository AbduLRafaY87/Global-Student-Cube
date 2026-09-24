import type { RegistrationDraft } from "@/domain/identity/registration";
import { registerStudentCommand } from "@/server/commands/register-student";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const draft = (await request.json()) as RegistrationDraft;
  const origin = new URL(request.url).origin;
  const result = await registerStudentCommand(draft, origin);

  if (!result.ok) {
    if (result.code === "duplicate") {
      return NextResponse.json(
        {
          ok: false,
          code: "duplicate",
          error: "If you already have an account, log in.",
        },
        { status: 409 },
      );
    }

    if (result.code === "validation") {
      return NextResponse.json(
        { ok: false, code: "validation", step: result.step },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Unable to create your account. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json(result);
}
