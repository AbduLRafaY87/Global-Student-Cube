import { EmptyState } from "@/components/ui/States";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ToneChip } from "@/components/ui/Status";
import { createClient } from "@/lib/supabase/server";
import { loadStudentHome } from "@/server/modules/home/load";
import { Bell, GraduationCap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
  description: "What needs attention this week. Empty widgets stay empty until later modules ship.",
};

export default async function StudentHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const home = await loadStudentHome(user.id);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Hello, {home.greetingName}</h1>
          <p className="mt-1 text-sm text-text-muted">GSC ID {home.gscId}</p>
        </div>
        <Link
          href="/notifications"
          className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-control)] px-3 text-sm text-text hover:bg-neutral-100"
        >
          <Bell className="size-5" aria-hidden />
          Notifications
        </Link>
      </header>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Profile</h2>
        <ProgressBar label="Profile completion" value={home.profile.percent} />
        <p className="mt-2 text-sm text-text">
          Next: {home.profile.nextStepLabel}
        </p>
        <Link
          className="mt-3 inline-flex h-12 items-center text-sm font-medium text-primary underline-offset-2 hover:underline"
          href={home.profile.nextStepHref}
        >
          {home.profile.ctaLabel}
        </Link>
      </section>

      <div className="grid gap-4 min-[900px]:grid-cols-2">
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 min-[900px]:order-2">
          <h2 className="text-lg font-semibold text-text">Next session</h2>
          {home.session.empty ? (
            <EmptyState title="No upcoming session" message={home.session.emptyMessage} />
          ) : null}
          <Link className="mt-3 inline-flex text-sm text-primary underline-offset-2 hover:underline" href={home.session.href}>
            Counseling
          </Link>
        </section>

        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-text">This week</h2>
          <dl className="mt-3 grid gap-3 text-sm text-text min-[768px]:grid-cols-2">
            <div>
              <dt className="text-text-muted">Recommendations</dt>
              <dd>{home.recommendations.count === null ? "Not ready" : `${home.recommendations.count} / 10`}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Saved combinations</dt>
              <dd>{home.shortlist.savedCount} / 3</dd>
            </div>
            <div>
              <dt className="text-text-muted">Sessions</dt>
              <dd>0</dd>
            </div>
            <div>
              <dt className="text-text-muted">Tasks</dt>
              <dd>{home.tasks.count}</dd>
            </div>
          </dl>
          {home.recommendations.empty ? (
            <p className="mt-3 text-sm text-text-muted">{home.recommendations.emptyMessage}</p>
          ) : (
            <Link
              className="mt-3 inline-flex text-sm text-primary underline-offset-2 hover:underline"
              href={home.recommendations.href}
            >
              View recommendations
            </Link>
          )}
        </section>
      </div>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Next actions</h2>
        {home.nextActions.length === 0 ? (
          <EmptyState title="Nothing waiting" message="No next action is listed." />
        ) : (
          <ul className="mt-3 space-y-2">
            {home.nextActions.map((action) => (
              <li key={action.key}>
                <Link className="text-sm text-primary underline-offset-2 hover:underline" href={action.href}>
                  {action.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Upcoming deadlines</h2>
        {home.deadlines.empty ? (
          <EmptyState title="No deadlines" message={home.deadlines.emptyMessage} />
        ) : (
          <ul className="mt-3 space-y-3">
            {home.deadlines.items.map((item) => (
              <li key={item.key} className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-text">{item.label}</p>
                  <p className="text-sm text-text-muted">{item.when}</p>
                </div>
                <ToneChip tone={item.tone} label={item.toneLabel} />
              </li>
            ))}
          </ul>
        )}
        <Link className="mt-3 inline-flex text-sm text-primary underline-offset-2 hover:underline" href={home.deadlines.href}>
          Application groups
        </Link>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Saved combinations</h2>
        {home.shortlist.empty ? (
          <EmptyState title="No saved combinations" message={home.shortlist.emptyMessage} />
        ) : (
          <ul className="mt-3 space-y-2">
            {home.shortlist.items.map((item) => (
              <li key={item.id} className="text-sm text-text">
                {item.universityName} · {item.programName}
              </li>
            ))}
          </ul>
        )}
        <Link className="mt-3 inline-flex text-sm text-primary underline-offset-2 hover:underline" href={home.shortlist.href}>
          Open shortlist
        </Link>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Readiness</h2>
        {home.readiness.empty ? (
          <EmptyState title="Readiness unknown" message={home.readiness.message} />
        ) : (
          <ProgressBar
            label="Financial readiness"
            value={home.readiness.barValue}
            displayText={home.readiness.displayPercent ? `${home.readiness.displayPercent}%` : undefined}
          />
        )}
        <Link className="mt-3 inline-flex text-sm text-primary underline-offset-2 hover:underline" href={home.readiness.href}>
          Cost comparison
        </Link>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Incomplete documents</h2>
        {home.documents.empty ? (
          <EmptyState title="No document gaps" message={home.documents.emptyMessage} />
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-text">
            {home.documents.items.map((item) => (
              <li key={item.id}>{item.label}</li>
            ))}
          </ul>
        )}
        <Link className="mt-3 inline-flex text-sm text-primary underline-offset-2 hover:underline" href={home.documents.href}>
          Document vault
        </Link>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Counselor messages</h2>
        {home.messages.empty ? (
          <EmptyState title="No unanswered messages" message={home.messages.emptyMessage} />
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-text">
            {home.messages.items.map((item) => (
              <li key={item.conversationId}>
                <Link className="text-primary underline-offset-2 hover:underline" href={item.href}>
                  {item.preview}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link className="mt-3 inline-flex text-sm text-primary underline-offset-2 hover:underline" href={home.messages.href}>
          Messages
        </Link>
      </section>

      <div className="grid gap-4 min-[900px]:grid-cols-2">
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-text">
            <GraduationCap className="size-5" aria-hidden />
            Scholarships
          </h2>
          <EmptyState title="No selected awards" message={home.scholarships.emptyMessage} />
          <Link className="mt-3 inline-flex text-sm text-primary underline-offset-2 hover:underline" href={home.scholarships.href}>
            Scholarship directory
          </Link>
        </section>
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-text">Mentorship</h2>
          <EmptyState title="No mentors" message={home.mentorship.emptyMessage} />
          <Link className="mt-3 inline-flex text-sm text-primary underline-offset-2 hover:underline" href={home.mentorship.href}>
            Mentors
          </Link>
        </section>
      </div>

      <div className="grid gap-4 min-[900px]:grid-cols-2">
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-text">Learning and news</h2>
          <EmptyState title="No stories" message={home.news.emptyMessage} />
          <Link className="mt-3 inline-flex text-sm text-primary underline-offset-2 hover:underline" href={home.news.href}>
            News
          </Link>
        </section>
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-text">Private journey</h2>
          {home.journey.empty ? (
            <EmptyState title="No private milestones" message={home.journey.emptyMessage} />
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-text">
              {home.journey.items.map((item) => (
                <li key={item.id}>
                  {item.label} · {item.when}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-3">
            <Link className="inline-flex text-sm text-primary underline-offset-2 hover:underline" href={home.journey.href}>
              Private journey
            </Link>
            <Link className="inline-flex text-sm text-primary underline-offset-2 hover:underline" href={home.tasks.href}>
              Application roadmap
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
