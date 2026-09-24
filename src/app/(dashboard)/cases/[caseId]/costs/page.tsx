import { CostCompareForm, moneyOrUnavailable } from "@/components/costs/CostCompareForm";
import { EmptyState, ForbiddenState } from "@/components/ui/States";
import { displayText } from "@/domain/catalog/display";
import { createClient } from "@/lib/supabase/server";
import { resolveRequestContext } from "@/server/context";
import { loadCostPage } from "@/server/modules/costs/load";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Cost comparison and financial readiness" };

interface PageProps {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ program?: string }>;
}

export default async function CostComparisonPage({ params, searchParams }: PageProps) {
  const { caseId } = await params;
  const { program } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  let context = null;
  try {
    context = await resolveRequestContext();
  } catch {
    context = null;
  }

  const model = await loadCostPage(caseId, user.id, program ?? null, context);
  if (!model) {
    return <ForbiddenState message="Cost details are not shared with this account." />;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Cost comparison</h1>
        <p className="mt-2 text-sm text-text-muted">
          Case for {model.studentName}. Target{" "}
          {displayText(model.programName ?? model.universityName)}. Horizon starts at the first
          academic year.
        </p>
      </header>
      {!model.module3Completed ? (
        <EmptyState
          title="Personalization waits for Module 3"
          message="Complete parent and financial information to compare savings against this estimate."
        />
      ) : null}
      <CostCompareForm
        caseId={model.caseId}
        version={model.version}
        canWrite={model.canWrite}
        horizon={model.horizon}
        nightsPerMonth={model.nightsPerMonth}
        lines={model.broader.lines.filter((line) => line.kind !== "application_fees")}
        parentLinks={model.parentLinks}
        readiness={model.readiness}
        annualLabel={model.annualComparison.label}
        annualOriginal={moneyOrUnavailable(
          model.annualComparison.amount,
          model.annualComparison.currency,
        )}
        annualUsd={
          model.annualComparison.usd === null
            ? "Not provided"
            : `${model.annualComparison.usd.toFixed(2)} USD`
        }
        broaderOriginal={moneyOrUnavailable(model.broader.total, model.broader.currency)}
        applicationNote={model.applicationFees.note}
        fxStale={model.fx.stale}
        fxAvailable={model.fx.available}
        fxCapturedAt={model.fx.capturedAt}
      />
    </div>
  );
}
