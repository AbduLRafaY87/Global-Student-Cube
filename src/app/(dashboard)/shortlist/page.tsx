import { EmptyState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/server";
import { resolveAccessibleCase } from "@/server/modules/profile/load";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Saved shortlist" };

export default async function ShortlistRedirectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const caseRow = await resolveAccessibleCase(user.id);
  if (!caseRow) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <EmptyState
          title="No student case yet"
          message="A case is required before university and program combinations can be saved."
        />
      </div>
    );
  }

  redirect(`/cases/${caseRow.id}/shortlist`);
}
