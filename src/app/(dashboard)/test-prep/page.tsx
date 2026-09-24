import { resolveAccessibleCase } from "@/server/modules/profile/load";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Tests" };

export default async function RetiredTestPrepPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const caseRow = await resolveAccessibleCase(user.id);
  redirect(caseRow ? `/cases/${caseRow.id}/profile/tests` : "/profile");
}
