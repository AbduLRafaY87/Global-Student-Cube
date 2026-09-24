import { TestsForm } from "@/components/profile/TestsForm";
import { ForbiddenState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/server/modules/profile/load";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Tests and result evidence" };

export default async function TestsPage({
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
      <h1 className="text-2xl font-semibold text-text">Tests and result evidence</h1>
      <TestsForm
        caseId={caseId}
        testsTaken={profile.testsTaken}
        tests={profile.tests}
        canWrite={profile.canWrite}
      />
    </div>
  );
}
