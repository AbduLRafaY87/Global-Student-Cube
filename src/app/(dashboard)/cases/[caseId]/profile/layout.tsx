import { ProfileProgress } from "@/components/profile/ProfileProgress";
import { ForbiddenState } from "@/components/ui/States";
import type { Module2Step } from "@/domain/profile/completion";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/server/modules/profile/load";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { profileMetrics } from "./_lib";

function stepFromPath(pathname: string): Module2Step {
  if (pathname.endsWith("/education")) {
    return "education";
  }
  if (pathname.endsWith("/tests")) {
    return "tests";
  }
  if (pathname.endsWith("/preferences")) {
    return "preferences";
  }
  if (pathname.endsWith("/experience")) {
    return "experience";
  }
  return "review";
}

export default async function ProfileSectionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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
    return <ForbiddenState message="This case is not available to your account." />;
  }

  const { count } = await supabase
    .from("universities")
    .select("id", { count: "exact", head: true })
    .eq("publication_state", "published");
  const metrics = profileMetrics(profile, count ?? 0, null);
  const pathname = (await headers()).get("x-gsc-pathname") ?? "";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      <ProfileProgress
        caseId={caseId}
        studentName={profile.caseRow.studentName}
        current={stepFromPath(pathname)}
        percent={metrics.percent}
        completed={Boolean(profile.caseRow.module2CompletedAt)}
      />
      {children}
    </div>
  );
}
