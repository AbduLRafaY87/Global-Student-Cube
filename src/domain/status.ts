export type SemanticTone = "critical" | "warning" | "positive" | "neutral";

export interface ToneStyle {
  tone: SemanticTone;
  label: string;
}

export function deadlineTone(
  deadline: string | null | undefined,
  nowMs: number,
): ToneStyle {
  if (typeof deadline !== "string" || deadline.trim() === "") {
    return { tone: "neutral", label: "Not provided" };
  }

  const parsed = Date.parse(deadline);
  if (Number.isNaN(parsed)) {
    return { tone: "neutral", label: "Not provided" };
  }

  const days = (parsed - nowMs) / (1000 * 60 * 60 * 24);

  if (days < 0) {
    return { tone: "critical", label: "Overdue" };
  }

  if (days <= 3) {
    return { tone: "critical", label: "Due soon" };
  }

  if (days <= 14) {
    return { tone: "warning", label: "Upcoming" };
  }

  return { tone: "neutral", label: "Scheduled" };
}

export function applicationStatusTone(status: string): ToneStyle {
  switch (status) {
    case "accepted":
      return { tone: "positive", label: "Accepted" };
    case "rejected":
      return { tone: "critical", label: "Rejected" };
    case "submitted":
      return { tone: "warning", label: "Submitted" };
    case "draft":
      return { tone: "neutral", label: "Draft" };
    default:
      return { tone: "neutral", label: status };
  }
}

export function offerStatusTone(status: string): ToneStyle {
  switch (status) {
    case "accepted":
      return { tone: "positive", label: "Accepted" };
    case "declined":
      return { tone: "critical", label: "Declined" };
    case "pending":
      return { tone: "warning", label: "Pending" };
    default:
      return { tone: "neutral", label: status };
  }
}

export function capProgressPercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.min(100, value);
}
