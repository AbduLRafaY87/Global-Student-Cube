import { AssessmentForm } from "@/components/assessment/AssessmentForm";
import { EmptyState, ForbiddenState } from "@/components/ui/States";
import { SELF_REPORTED_DISCLAIMER } from "@/domain/assessment/assessment";
import { createClient } from "@/lib/supabase/server";
import { loadAssessmentPage } from "@/server/modules/assessment/load";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Program self-assessment",
  description: SELF_REPORTED_DISCLAIMER,
};

interface PageProps {
  params: Promise<{ caseId: string; programId: string }>;
}

export default async function ProgramAssessmentPage({ params }: PageProps) {
  const { caseId, programId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const model = await loadAssessmentPage(caseId, programId, user.id);
  if (!model) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <ForbiddenState message="This self-check is not shared with this account." />
      </div>
    );
  }

  if (model.criteria.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
        <h1 className="text-2xl font-semibold text-text">Program self-assessment</h1>
        <p className="text-sm font-medium text-text">{SELF_REPORTED_DISCLAIMER}</p>
        <EmptyState
          title="No published criteria"
          message="Unknown data does not mean a requirement is waived."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <AssessmentForm
        caseId={model.caseId}
        programId={model.programId}
        universityId={model.universityId}
        universityName={model.universityName}
        programName={model.programName}
        canWrite={model.canWrite}
        criteria={model.criteria}
        initialClaims={model.claims}
        evidence={model.evidence}
        files={model.files}
        needsReassessment={model.needsReassessment}
      />
    </div>
  );
}
