import { EmptyState } from "@/components/ui/States";
import { profileStepHref } from "@/domain/profile/completion";
import { createClient } from "@/lib/supabase/server";
import { loadProfile, resolveAccessibleCase } from "@/server/modules/profile/load";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { profileMetrics } from "../cases/[caseId]/profile/_lib";

export const metadata: Metadata = {
  title: "Student profile",
};

export default async function ProfileRedirectPage() {
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
          message="Leftover profile rows are kept. A case is created at registration and is required for the academic profile."
        />
      </div>
    );
  }

  const profile = await loadProfile(caseRow.id, user.id);
  if (!profile) {
    redirect(`/cases/${caseRow.id}/profile`);
  }
  const { data: published } = await supabase
    .from("universities")
    .select("country")
    .eq("publication_state", "published");
  const supportedCountryCount = new Set(
    (published ?? []).map((row) => (typeof row.country === "string" ? row.country : "")),
  ).size;
  const metrics = profileMetrics(profile, supportedCountryCount, null);
  if (profile.caseRow.module2CompletedAt) {
    redirect(`/cases/${caseRow.id}/profile`);
  }
  redirect(profileStepHref(caseRow.id, metrics.report.firstIncompleteStep));
}
