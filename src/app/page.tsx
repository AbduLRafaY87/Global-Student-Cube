import { PublicChrome } from "@/components/public/PublicChrome";
import { fetchCoverage, fetchPublishedScholarships } from "@/server/modules/catalog/public";
import { ArrowRight, GraduationCap, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your pathway to global education",
  description:
    "Your Pathway to global education, where dreams meet directions. Published university coverage, a 30-minute counseling introduction, and guest tools that never create a private profile.",
};

export default async function PublicHomePage() {
  const coverage = await fetchCoverage();
  const scholarships = await fetchPublishedScholarships();

  return (
    <PublicChrome>
      <section className="grid gap-6 min-[900px]:grid-cols-[2fr_1fr]">
        <div>
          <h1 className="text-3xl font-semibold text-text min-[900px]:text-4xl">
            Your pathway to global education
          </h1>
          <p className="mt-3 text-base leading-6 text-text-muted">
            Your Pathway to global education, where dreams meet directions
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/register"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 font-medium text-surface"
          >
            <ArrowRight className="size-5" aria-hidden />
            Start my journey
          </Link>
          <Link
            href="/quick-match"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-control-border bg-surface px-4 font-medium text-text"
          >
            <Sparkles className="size-5" aria-hidden />
            Try a 60-second match
          </Link>
          <Link
            href="/tour"
            className="inline-flex h-12 items-center justify-center px-4 font-medium text-text underline-offset-2 hover:underline"
          >
            Take the tour
          </Link>
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-text">Published coverage</h2>
        <p className="mt-2 text-sm text-text-muted">
          {coverage.universityCount === 0
            ? "Coverage updating. Zero published universities are listed, and no example rows are invented."
            : `${coverage.universityCount} published universities across ${coverage.countryCount} countries.`}
        </p>
        <p className="mt-3 text-sm text-text">
          The first counseling session is a 30-minute virtual meeting. Choosing a
          teaser never creates a private profile.
        </p>
      </section>

      <section aria-labelledby="public-features">
        <h2 id="public-features" className="text-lg font-semibold text-text">
          Explore
        </h2>
        <ul className="mt-3 grid gap-3 min-[768px]:grid-cols-2">
          {[
            { href: "/quick-match", title: "Match", body: "Country and subject only. No name or contact." },
            { href: "/explore/universities", title: "Universities", body: "Public catalog with sourced fees when published." },
            {
              href: "/preview/scholarships",
              title: "Scholarships",
              body: `${scholarships.length} preview rows. Applications stay on provider websites.`,
              icon: true,
            },
            { href: "/tour?audience=counselor", title: "Counselors", body: "Invited counselor accounts. MFA required." },
            { href: "/stories", title: "Success stories", body: "Reviewed stories shared with permission. Withdrawn items leave this wall." },
            { href: "/news", title: "News", body: "Reviewed updates. Sign in to save, like, or follow topics." },
            { href: "/preview/mentors/unavailable", title: "Alumni/Parent Mentors", body: "Published teasers only. None are listed yet." },
            { href: "/tour?audience=student", title: "Roadmap", body: "Application steps after counseling and a chosen target." },
            { href: "/tour?audience=mentor", title: "Rewards", body: "Verified activity later. Not a live marketing claim." },
          ].map((item) => (
            <li key={item.title}>
              <Link
                href={item.href}
                className="block rounded-[var(--radius-card)] border border-border bg-surface p-4"
              >
                <p className="flex items-center gap-2 font-medium text-text">
                  {item.icon ? <GraduationCap className="size-5" aria-hidden /> : null}
                  {item.title}
                </p>
                <p className="mt-2 text-sm text-text-muted">{item.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text">Preparation checklist</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-text">
          <li>Gather academic evidence you already hold.</li>
          <li>Decide whether a parent will be invited later.</li>
          <li>Optional finances stay optional until you save a program.</li>
        </ol>
      </section>
    </PublicChrome>
  );
}
