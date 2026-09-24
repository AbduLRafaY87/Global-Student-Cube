import {
  applicationStatusTone,
  deadlineTone,
  offerStatusTone,
  type SemanticTone,
} from "@/domain/status";
import { CheckCircle } from "lucide-react";

const TONE_CLASS: Record<SemanticTone, string> = {
  critical: "bg-critical-bg text-critical",
  warning: "bg-warning-bg text-warning",
  positive: "bg-positive-bg text-positive",
  neutral: "bg-neutral-bg text-neutral",
};

export function ToneChip({
  tone,
  label,
  showCheck = false,
}: {
  tone: SemanticTone;
  label: string;
  showCheck?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs leading-[18px] font-medium ${TONE_CLASS[tone]}`}
    >
      {showCheck ? (
        <CheckCircle className="size-4" aria-hidden />
      ) : null}
      {label}
    </span>
  );
}

export function DeadlineChip({
  deadline,
  nowMs,
}: {
  deadline: string | null | undefined;
  nowMs: number;
}) {
  const { tone, label } = deadlineTone(deadline, nowMs);
  return <ToneChip tone={tone} label={label} />;
}

export function ApplicationStatusBadge({ status }: { status: string }) {
  const { tone, label } = applicationStatusTone(status);
  return (
    <ToneChip tone={tone} label={label} showCheck={tone === "positive"} />
  );
}

export function OfferStatusBadge({ status }: { status: string }) {
  const { tone, label } = offerStatusTone(status);
  return (
    <ToneChip tone={tone} label={label} showCheck={tone === "positive"} />
  );
}
