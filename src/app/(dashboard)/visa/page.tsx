import { createClient } from "@/lib/supabase/server";
import { resolveAccessibleCase } from "@/server/modules/profile/load";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Destination visa",
};

export default async function LeftoverVisaRedirectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const caseRow = await resolveAccessibleCase(user.id);
  if (caseRow) {
    redirect(`/cases/${caseRow.id}/visa`);
  }
  redirect("/counselor");
}
