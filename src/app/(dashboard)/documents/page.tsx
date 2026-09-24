import { resolveAccessibleCase } from "@/server/modules/profile/load";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Documents" };

export default async function RetiredDocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const caseRow = await resolveAccessibleCase(user.id);
  redirect(caseRow ? `/cases/${caseRow.id}/profile` : "/profile");
}
