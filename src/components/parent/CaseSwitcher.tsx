import Link from "next/link";

interface CaseOption {
  caseId: string;
  studentName: string;
}

interface CaseSwitcherProps {
  cases: CaseOption[];
  selectedCaseId: string | null;
}

export function CaseSwitcher({ cases, selectedCaseId }: CaseSwitcherProps) {
  if (cases.length === 0) {
    return null;
  }
  return (
    <div className="w-full min-[900px]:w-60">
      <p className="text-sm font-medium text-text">Student case</p>
      <div className="mt-2 flex min-h-12 flex-col gap-2">
        {cases.map((item) => (
          <Link
            key={item.caseId}
            href={`/parent/home?caseId=${item.caseId}`}
            className={`inline-flex min-h-12 items-center rounded-[var(--radius-control)] px-3 text-sm ${
              item.caseId === selectedCaseId
                ? "bg-primary text-surface"
                : "border border-control-border bg-surface text-text"
            }`}
          >
            {item.studentName}
          </Link>
        ))}
      </div>
      <p className="mt-2 text-sm">
        <Link href="/parent/cases" className="font-medium text-primary underline">
          All authorized cases
        </Link>
      </p>
    </div>
  );
}
