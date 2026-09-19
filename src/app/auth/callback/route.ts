import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const USER_ROLES = new Set(["student", "parent", "counselor", "admin"]);

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const requestedRole = requestUrl.searchParams.get("role");
      const metadataRole = user?.user_metadata?.role;
      const role = USER_ROLES.has(requestedRole ?? "")
        ? requestedRole
        : USER_ROLES.has(metadataRole)
          ? metadataRole
          : "student";

      if (user?.email) {
        await supabase.from("users").upsert(
          { id: user.id, email: user.email, role },
          { onConflict: "id" },
        );
      }
    }
  }

  return NextResponse.redirect(new URL("/profile", requestUrl.origin));
}