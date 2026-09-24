import { ShortlistBoard } from "@/components/shortlist/ShortlistBoard";
import { EmptyState, ForbiddenState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/server";
import { loadShortlistPage } from "@/server/modules/shortlist/load";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Saved shortlist" };

interface PageProps {
  params: Promise<{ caseId: string }>;
}

export default async function ShortlistPage({ params }: PageProps) {
  const { caseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const model = await loadShortlistPage(caseId, user.id);
  if (!model) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <ForbiddenState message="This shortlist is not shared with this account." />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <p className="text-sm text-text-muted">Case for {model.studentName}.</p>
      {!model.module3Completed ? (
        <EmptyState
          title="Saving waits for Module 3"
          message="Complete parent and financial information to save up to three university and program combinations."
        />
      ) : null}
      <ShortlistBoard
        caseId={model.caseId}
        canWrite={model.canWrite && model.module3Completed}
        cards={model.cards}
        recommendationCount={model.recommendationCount}
      />
    </div>
  );
}
