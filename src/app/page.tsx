import { FeatureCard } from "@/components/FeatureCard";
import { LandingHeader } from "@/components/LandingHeader";
import { PlanPricingCard } from "@/components/PlanPricingCard";
import { SUBSCRIPTION_PLANS } from "@/types";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Global Student Cube",
  description:
    "Plan applications, compare universities, and manage admissions in one workspace.",
};

const FEATURES = [
  {
    title: "University directory",
    description:
      "Search schools by country, tuition, and GPA, then save the ones that fit.",
  },
  {
    title: "Application tracker",
    description:
      "Log deadlines, essays, documents, and recommendations in one checklist.",
  },
  {
    title: "Scholarships and aid",
    description:
      "Filter awards and compare offer tuition against financial aid.",
  },
  {
    title: "Counselor support",
    description:
      "Message your assigned counselor and keep parents in the loop.",
  },
  {
    title: "Visa and housing",
    description:
      "Track immigration documents and browse housing for saved universities.",
  },
] as const;

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-black">
      <LandingHeader />

      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-16 sm:py-24">
          <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
            Global Student Cube
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl dark:text-zinc-50">
            Your admissions workspace, from first search to deposit.
          </h1>
          <p className="max-w-2xl text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
            Students, parents, and counselors plan applications, compare
            universities, and stay on top of essays, aid, and visas in one
            place.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-white dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Sign in
            </Link>
          </div>
        </section>

        <section
          id="features"
          className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-16"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Features
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <li key={feature.title}>
                <FeatureCard
                  title={feature.title}
                  description={feature.description}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="border-y border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-16 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                University directory
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Preview published universities by country and city after you
                create an account. Missing facts stay Not provided.
              </p>
            </div>
            <Link
              href="/signup"
              className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Browse universities
            </Link>
          </div>
        </section>

        <section
          id="pricing"
          className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-16"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Pricing
          </h2>
          <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Start on Free, or choose Premium or Counselor Pro when you need a
            higher tier.
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <li key={plan}>
                <PlanPricingCard
                  plan={plan}
                  isCurrent={false}
                  status={null}
                  periodEnd={null}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-4 pb-24">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Ready to plan your next application?
          </h2>
          <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Create a free account to save universities, track deadlines, and
            work with your counselor.
          </p>
          <Link
            href="/signup"
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Sign up
          </Link>
        </section>
      </main>
    </div>
  );
}
