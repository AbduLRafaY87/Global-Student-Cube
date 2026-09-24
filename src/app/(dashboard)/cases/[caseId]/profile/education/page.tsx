import { EducationForm } from "@/components/profile/EducationForm";
import { ForbiddenState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/server/modules/profile/load";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Academic history" };

export default async function EducationPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const profile = await loadProfile(caseId, user.id);
  if (!profile) {
    return <ForbiddenState />;
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-text">Academic history</h1>
      <EducationForm
        caseId={caseId}
        level={profile.level}
        educationYears={profile.educationYears}
        records={profile.records}
        canWrite={profile.canWrite}
      />
    </div>
  );
}
