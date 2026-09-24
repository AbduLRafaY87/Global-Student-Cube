import { ProgressBar } from "@/components/ui/ProgressBar";
import { profileStepHref, type Module2Step } from "@/domain/profile/completion";
import Link from "next/link";

const STEPS: { id: Module2Step; label: string }[] = [
  { id: "education", label: "Education" },
  { id: "tests", label: "Tests" },
  { id: "preferences", label: "Preferences" },
  { id: "experience", label: "Experience" },
  { id: "review", label: "Review" },
];

interface ProfileProgressProps {
  caseId: string;
  studentName: string;
  current: Module2Step;
  percent: number;
  completed: boolean;
}

export function ProfileProgress({
  caseId,
  studentName,
  current,
  percent,
  completed,
}: ProfileProgressProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Case for {studentName}. {completed ? "Academic profile complete." : "Academic profile in progress."}
      </p>
      <ProgressBar value={percent} label="Module 2 progress" />
      <nav aria-label="Profile sections" className="flex flex-wrap gap-2">
        {STEPS.map((step) => (
          <Link
            key={step.id}
            href={profileStepHref(caseId, step.id)}
            className={`inline-flex min-h-12 items-center rounded-[var(--radius-control)] px-3 text-sm ${
              current === step.id
                ? "bg-primary text-surface"
                : "border border-control-border bg-surface text-text"
            }`}
          >
            {step.label}
          </Link>
        ))}
        <Link
          href={`/cases/${caseId}/profile/finances`}
          className="inline-flex min-h-12 items-center rounded-[var(--radius-control)] border border-control-border bg-surface px-3 text-sm text-text"
        >
          Finances
        </Link>
        <Link
          href={`/family-links?caseId=${caseId}`}
          className="inline-flex min-h-12 items-center rounded-[var(--radius-control)] border border-control-border bg-surface px-3 text-sm text-text"
        >
          Family
        </Link>
      </nav>
    </div>
  );
}
