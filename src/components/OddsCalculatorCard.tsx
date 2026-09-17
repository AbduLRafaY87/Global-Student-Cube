import type { AdmissionOddsCategory, ApplicationStatus } from "@/types";

export interface OddsCalculatorCardProps {
  universityName: string;
  country: string;
  applicationStatus: ApplicationStatus;
  studentGpa: number;
  minimumGpa: number;
  acceptanceRate: number;
  category: AdmissionOddsCategory;
}

const CATEGORIES: AdmissionOddsCategory[] = ["Reach", "Match", "Safety"];

function badgeClass(
  category: AdmissionOddsCategory,
  isActive: boolean,
): string {
  const base =
    "rounded-full px-2.5 py-1 text-xs font-medium tracking-wide uppercase";

  if (!isActive) {
    return `${base} bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500`;
  }

  if (category === "Reach") {
    return `${base} bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300`;
  }

  if (category === "Match") {
    return `${base} bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300`;
  }

  return `${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300`;
}

function formatRate(acceptanceRate: number): string {
  const percent = acceptanceRate > 1 ? acceptanceRate : acceptanceRate * 100;
  return `${percent}%`;
}

function formatGpa(value: number): string {
  return value.toFixed(2);
}

function listLabel(status: ApplicationStatus): string {
  return status === "draft" ? "Saved" : "Applied";
}

export function OddsCalculatorCard({
  universityName,
  country,
  applicationStatus,
  studentGpa,
  minimumGpa,
  acceptanceRate,
  category,
}: OddsCalculatorCardProps) {
  const gpaGap = studentGpa - minimumGpa;

  return (
    <article className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        {listLabel(applicationStatus)}
        {country ? ` · ${country}` : ""}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        {universityName}
      </h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {CATEGORIES.map((entry) => (
          <span
            key={entry}
            className={badgeClass(entry, entry === category)}
            aria-current={entry === category ? "true" : undefined}
          >
            {entry}
          </span>
        ))}
      </div>

      <dl className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
        <div className="flex justify-between gap-4">
          <dt>Your GPA</dt>
          <dd className="font-medium">{formatGpa(studentGpa)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Minimum GPA</dt>
          <dd className="font-medium">{formatGpa(minimumGpa)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>GPA difference</dt>
          <dd className="font-medium">
            {gpaGap >= 0 ? "+" : ""}
            {formatGpa(gpaGap)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Acceptance rate</dt>
          <dd className="font-medium">{formatRate(acceptanceRate)}</dd>
        </div>
      </dl>
    </article>
  );
}
