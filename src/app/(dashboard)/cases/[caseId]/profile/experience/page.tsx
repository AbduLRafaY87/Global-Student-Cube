import { ExperienceForm } from "@/components/profile/ExperienceForm";
import { ForbiddenState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/server/modules/profile/load";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Interests, achievements and introduction" };

export default async function ExperiencePage({
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
      <h1 className="text-2xl font-semibold text-text">Interests, achievements and introduction</h1>
      <ExperienceForm
        caseId={caseId}
        careerGoal={profile.careerGoal}
        activities={profile.activities}
        scholarshipReceived={profile.scholarshipReceived}
        scholarshipNotGranted={profile.scholarshipNotGranted}
        awards={profile.awards}
        relative={profile.relative}
        introFileId={profile.introFileId}
        canWrite={profile.canWrite}
      />
    </div>
  );
}
