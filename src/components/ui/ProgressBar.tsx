import { capProgressPercent } from "@/domain/status";

const WIDTH_CLASS: Record<number, string> = {
  0: "w-0",
  5: "w-[5%]",
  10: "w-[10%]",
  15: "w-[15%]",
  20: "w-1/5",
  25: "w-1/4",
  30: "w-[30%]",
  35: "w-[35%]",
  40: "w-[40%]",
  45: "w-[45%]",
  50: "w-1/2",
  55: "w-[55%]",
  60: "w-3/5",
  65: "w-[65%]",
  70: "w-[70%]",
  75: "w-3/4",
  80: "w-4/5",
  85: "w-[85%]",
  90: "w-[90%]",
  95: "w-[95%]",
  100: "w-full",
};

interface ProgressBarProps {
  value: number;
  label: string;
  displayText?: string;
}

export function ProgressBar({ value, label, displayText }: ProgressBarProps) {
  const width = capProgressPercent(value);
  const bucket = Math.round(width / 5) * 5;
  const fillClass = WIDTH_CLASS[bucket] ?? "w-full";
  const display = displayText ?? (Number.isFinite(value) ? `${Math.round(value)}%` : "0%");

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="text-sm text-text-muted">{display}</p>
      </div>
      <div
        className="mt-2 h-3 overflow-hidden rounded-full bg-neutral-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={width}
        aria-valuetext={display}
        aria-label={label}
      >
        <div className={`h-full rounded-full bg-primary ${fillClass}`} />
      </div>
    </div>
  );
}
