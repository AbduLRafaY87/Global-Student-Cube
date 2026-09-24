import { PublicChrome } from "@/components/public/PublicChrome";
import { resolveTourAudience, TOUR_AUDIENCES, TOUR_STEPS } from "@/domain/public/tour";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "App tour",
  description: "A role-aware walkthrough of Global Student Cube. Skipping never marks onboarding complete.",
};

interface PageProps {
  searchParams: Promise<{ audience?: string; step?: string; from?: string }>;
}

export default async function TourPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const resolved = resolveTourAudience(params.audience ?? null);
  const steps = TOUR_STEPS[resolved.audience];
  const stepIndex = Math.min(
    Math.max(Number(params.step ?? "0") || 0, 0),
    steps.length - 1,
  );
  const step = steps[stepIndex];
  const from = params.from && params.from.startsWith("/") ? params.from : "/";
  const query = (step: number) =>
    `/tour?audience=${resolved.audience}&step=${step}&from=${encodeURIComponent(from)}`;

  return (
    <PublicChrome>
      <div className="flex justify-end">
        <Link className="text-sm text-primary underline-offset-2 hover:underline" href={from}>
          Close
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-text">Role-aware tour</h1>
      {resolved.fellBack ? (
        <p className="text-sm text-text-muted">
          That audience is not available. Showing the overall tour.
        </p>
      ) : null}
      <form method="get" className="grid gap-3 min-[600px]:grid-cols-2">
        <input type="hidden" name="from" value={from} />
        <input type="hidden" name="step" value="0" />
        <label className="text-sm text-text">
          Audience
          <select
            name="audience"
            defaultValue={resolved.audience}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          >
            {TOUR_AUDIENCES.map((audience) => (
              <option key={audience} value={audience}>
                {audience}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="h-12 rounded-[var(--radius-control)] border border-control-border bg-surface px-4 text-sm font-medium min-[600px]:self-end"
        >
          Show this tour
        </button>
      </form>
      {step ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-text">{step.title}</h2>
          <div className="flex aspect-video max-w-[720px] items-center justify-center rounded-[var(--radius-card)] border border-border bg-surface text-sm text-text-muted">
            Demonstration video is not available. The text walkthrough below is complete.
          </div>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-text">
            {step.instructions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <p className="text-sm text-text-muted">
            Step {stepIndex + 1} of {steps.length}
          </p>
          <div className="flex flex-col gap-3 min-[600px]:flex-row">
            {stepIndex > 0 ? (
              <Link
                className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] border border-control-border px-4"
                href={query(stepIndex - 1)}
              >
                Previous
              </Link>
            ) : null}
            {stepIndex < steps.length - 1 ? (
              <Link
                className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-surface"
                href={query(stepIndex + 1)}
              >
                Next
              </Link>
            ) : (
              <Link
                className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-surface"
                href="/register"
              >
                Register
              </Link>
            )}
            <Link className="inline-flex h-12 items-center justify-center px-4 text-text" href={from}>
              Skip tour
            </Link>
          </div>
        </section>
      ) : null}
    </PublicChrome>
  );
}
