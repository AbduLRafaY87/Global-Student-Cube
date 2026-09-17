import { PlanPricingCard } from "@/components/PlanPricingCard";
import { createClient } from "@/lib/supabase/server";
import {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUSES,
  type SubscriptionPlan,
  type SubscriptionStatus,
  type UserSubscription,
} from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing",
};

function parseSubscriptionPlan(value: unknown): SubscriptionPlan | null {
  if (typeof value !== "string") {
    return null;
  }

  for (const plan of SUBSCRIPTION_PLANS) {
    if (plan === value) {
      return plan;
    }
  }

  return null;
}

function parseSubscriptionStatus(value: unknown): SubscriptionStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  for (const status of SUBSCRIPTION_STATUSES) {
    if (status === value) {
      return status;
    }
  }

  return null;
}

function toUserSubscription(row: {
  id: unknown;
  user_id: unknown;
  plan: unknown;
  status: unknown;
  current_period_end: unknown;
  created_at: unknown;
}): UserSubscription | null {
  const plan = parseSubscriptionPlan(row.plan);
  const status = parseSubscriptionStatus(row.status);

  if (
    typeof row.id !== "string" ||
    typeof row.user_id !== "string" ||
    typeof row.current_period_end !== "string" ||
    !plan ||
    !status
  ) {
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    plan,
    status,
    current_period_end: row.current_period_end,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  };
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

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let subscription: UserSubscription | null = null;

  if (user) {
    const { data } = await supabase
      .from("subscriptions")
      .select("id, user_id, plan, status, current_period_end, created_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      subscription = toUserSubscription(data);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12">
      <header>
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Global Student Cube
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Billing
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Compare plans and review the tier currently on your account.
        </p>
        {subscription ? (
          <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <span>Current plan</span>
            <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium tracking-wide text-white uppercase dark:bg-zinc-100 dark:text-zinc-900">
              {labelPlan(subscription.plan)}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium tracking-wide uppercase ${statusBadgeClass(subscription.status)}`}
            >
              {labelStatus(subscription.status)}
            </span>
          </p>
        ) : (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            No subscription on file yet.
          </p>
        )}
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <li key={plan}>
            <PlanPricingCard
              plan={plan}
              isCurrent={subscription?.plan === plan}
              status={
                subscription?.plan === plan ? subscription.status : null
              }
              periodEnd={
                subscription?.plan === plan
                  ? subscription.current_period_end
                  : null
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
