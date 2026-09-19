import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile) {
          await supabase.from("user_profiles").insert({
            id: user.id,
            first_name: typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name.split(" ")[0]
              : "",
            last_name: typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name.split(" ").slice(1).join(" ")
              : "",
            role: "student",
          });
        }
      }
    }
  }

  return NextResponse.redirect(new URL("/profile", requestUrl.origin));
}