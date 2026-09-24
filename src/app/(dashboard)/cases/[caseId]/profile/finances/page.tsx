import { FinancesForm } from "@/components/profile/FinancesForm";
import { ForbiddenState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/server";
import { loadFinance } from "@/server/modules/finance/load";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Parent and financial information" };

export default async function FinancesPage({
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
  const finance = await loadFinance(caseId, user.id);
  if (!finance) {
    return (
      <ForbiddenState message="Financial details are not shared with this account." />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-text">Parent and financial information</h1>
      <p className="text-sm text-text-muted">Case for {finance.studentName}.</p>
      <FinancesForm
        caseId={caseId}
        version={finance.version}
        canWrite={finance.canWrite}
        module3Completed={Boolean(finance.module3CompletedAt)}
        initial={{
          occupation: finance.occupation,
          income: finance.income,
          incomeCurrency: finance.incomeCurrency,
          incomeDeclined: finance.incomeDeclined,
          savings: finance.savings,
          savingsCurrency: finance.savingsCurrency,
          savingsDeclined: finance.savingsDeclined,
          housing: finance.housing,
          sponsorAvailable: finance.sponsorAvailable,
          incomeProofAvailable: finance.incomeProofAvailable,
        }}
      />
    </div>
  );
}
