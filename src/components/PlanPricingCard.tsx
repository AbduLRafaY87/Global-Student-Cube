import type { SubscriptionPlan, SubscriptionStatus } from "@/types";

export interface PlanPricingCardProps {
  plan: SubscriptionPlan;
  isCurrent: boolean;
  status: SubscriptionStatus | null;
  periodEnd: string | null;
}

function labelPlan(plan: SubscriptionPlan): string {
  if (plan === "counselor_pro") {
    return "Counselor Pro";
  }

  if (plan === "premium") {
    return "Premium";
  }

  return "Free";
}

function labelStatus(status: SubscriptionStatus): string {
  if (status === "past_due") {
    return "Past due";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusBadgeClass(status: SubscriptionStatus): string {
  if (status === "active") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  }

  if (status === "past_due") {
    return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
  }

  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";
}

function formatPeriodEnd(value: string): string {
  if (value.length >= 10) {
    return value.slice(0, 10);
  }

  return value;
}

export function PlanPricingCard({
  plan,
  isCurrent,
  status,
  periodEnd,
}: PlanPricingCardProps) {
  return (
    <article
      className={
        isCurrent
          ? "flex flex-col rounded-2xl border border-zinc-900 bg-white p-6 shadow-sm dark:border-zinc-100 dark:bg-zinc-950"
          : "flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          {plan === "free" ? "Included" : "Paid plan"}
        </p>
        {isCurrent && status ? (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium tracking-wide uppercase ${statusBadgeClass(status)}`}
          >
            {labelStatus(status)}
          </span>
        ) : null}
        {isCurrent ? (
          <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium tracking-wide text-white uppercase dark:bg-zinc-100 dark:text-zinc-900">
            Current tier
          </span>
        ) : null}
      </div>
      <h2 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        {labelPlan(plan)}
      </h2>
      {isCurrent && periodEnd ? (
        <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">
          Current period ends {formatPeriodEnd(periodEnd)}
        </p>
      ) : null}
    </article>
  );
}
