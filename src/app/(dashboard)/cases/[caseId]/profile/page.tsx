import { CompleteProfileActions } from "@/components/profile/CompleteProfileActions";
import { DocumentVault } from "@/components/profile/DocumentVault";
import { ForbiddenState } from "@/components/ui/States";
import { displayText } from "@/domain/catalog/display";
import { profileStepHref } from "@/domain/profile/completion";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/server/modules/profile/load";
import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { profileMetrics } from "./_lib";

export const metadata: Metadata = { title: "Complete profile and document vault" };

export default async function ProfileReviewPage({
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

  const { data: published } = await supabase
    .from("universities")
    .select("country")
    .eq("publication_state", "published")
    .limit(500);
  const supportedCountryCount = new Set(
    (published ?? []).map((row) => (typeof row.country === "string" ? row.country : "")),
  ).size;
  const metrics = profileMetrics(profile, supportedCountryCount, null);
  const complete = Boolean(profile.caseRow.module2CompletedAt) && metrics.report.complete;

  return (
    <div className="space-y-6 min-[900px]:grid min-[900px]:grid-cols-2 min-[900px]:gap-6 min-[900px]:space-y-0">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-text">Complete profile</h1>
        <p className="text-sm text-text-muted">
          {profile.caseRow.studentName}. Last actor{" "}
          {profile.lastActor ?? "Not provided"}. Completion is computed on the server.
        </p>
        {profile.canReadProfile ? (
        <>
        <article className="rounded-[var(--radius-card)] border border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">Education</h2>
            <Link href={profileStepHref(caseId, "education")} className="inline-flex min-h-12 items-center gap-2">
              <Pencil aria-hidden className="size-4" />
              Edit
            </Link>
          </div>
          <p className="mt-2 text-sm text-text">
            {displayText(profile.level)} · {profile.records.length} institution
            {profile.records.length === 1 ? "" : "s"}
          </p>
        </article>
        <article className="rounded-[var(--radius-card)] border border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">Tests</h2>
            <Link href={profileStepHref(caseId, "tests")} className="inline-flex min-h-12 items-center gap-2">
              <Pencil aria-hidden className="size-4" />
              Edit
            </Link>
          </div>
          <p className="mt-2 text-sm text-text">
            {profile.testsTaken === false
              ? "No standardized tests"
              : `${profile.tests.length} result${profile.tests.length === 1 ? "" : "s"}`}
          </p>
        </article>
        <article className="rounded-[var(--radius-card)] border border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">Preferences</h2>
            <Link href={profileStepHref(caseId, "preferences")} className="inline-flex min-h-12 items-center gap-2">
              <Pencil aria-hidden className="size-4" />
              Edit
            </Link>
          </div>
          <p className="mt-2 text-sm text-text">
            {displayText(profile.targetLevel)} ·{" "}
            {profile.countries.map((row) => row.countryCode).join(", ") || "Not provided"}
          </p>
        </article>
        <article className="rounded-[var(--radius-card)] border border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">Experience</h2>
            <Link href={profileStepHref(caseId, "experience")} className="inline-flex min-h-12 items-center gap-2">
              <Pencil aria-hidden className="size-4" />
              Edit
            </Link>
          </div>
          <p className="mt-2 text-sm text-text">
            {profile.activities.length} activit{profile.activities.length === 1 ? "y" : "ies"}
          </p>
        </article>
        </>
        ) : null}
        <article className="rounded-[var(--radius-card)] border border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">Finances</h2>
            {profile.canReadFinance ? (
              <Link href={`/cases/${caseId}/profile/finances`} className="inline-flex min-h-12 items-center gap-2">
                <Pencil aria-hidden className="size-4" />
                Edit
              </Link>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-text">
            {profile.canReadFinance
              ? profile.caseRow.module3CompletedAt
                ? "Financial section complete."
                : "Financial section not complete."
              : "Not shared"}
          </p>
        </article>
        <article className="rounded-[var(--radius-card)] border border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">Family access</h2>
            <Link href="/family-links" className="inline-flex min-h-12 items-center text-sm font-medium text-primary underline">
              Manage family access
            </Link>
          </div>
          <p className="mt-2 text-sm text-text-muted">
            Parents see only the scopes you grant. Revoking finance ends access immediately.
          </p>
        </article>
        {profile.canReadProfile && metrics.report.missing.length > 0 ? (
          <div className="rounded-[var(--radius-card)] border border-warning bg-warning-bg p-4">
            <h2 className="text-lg font-semibold text-text">Still required</h2>
            <ul className="mt-2 list-disc pl-5 text-sm text-text">
              {metrics.report.missing.slice(0, 12).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <CompleteProfileActions
          caseId={caseId}
          complete={complete}
          firstHref={profileStepHref(caseId, metrics.report.firstIncompleteStep)}
          canWrite={profile.canWrite}
        />
      </section>
      <section>
        <h2 className="text-lg font-semibold text-text">Document vault</h2>
        <p className="mt-1 text-sm text-text-muted">
          Private storage. Downloads use a short-lived signed URL.
        </p>
        <div className="mt-4">
          <DocumentVault files={profile.files} canReadFinance={profile.canReadFinance} />
        </div>
      </section>
    </div>
  );
}
