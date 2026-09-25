import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { loadCounselorHome } from "@/server/modules/counseling/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Counselor home" };

function asCount(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export default async function CounselorHomePage() {
  const result = await loadCounselorHome();
  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        {result.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const data = result.data;
  const next = data.nextAppointment as { id?: string; startsAt?: string; caseId?: string } | null;
  const followUps = Array.isArray(data.followUps)
    ? (data.followUps as Array<{ caseId: string; gscId: string | null; studentName: string }>)
    : [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Counselor dashboard</h1>
        <p className="mt-2 text-sm text-text-muted">
          You only see assigned cases. Disconnected calendar does not erase bookings.
        </p>
      </header>
      {asCount(data.activeCases) === 0 ? (
        <EmptyState
          title="No assigned students"
          message="Review your professional profile or availability. This screen does not look up arbitrary students."
          action={
            <Link className="text-primary underline-offset-2 hover:underline" href="/help">
              Request help
            </Link>
          }
        />
      ) : null}
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Next appointment</h2>
        {next?.id ? (
          <p className="mt-2 text-sm text-text">
            {next.startsAt ? new Date(next.startsAt).toLocaleString() : "Not provided"}
          </p>
        ) : (
          <p className="mt-2 text-sm text-text-muted">No upcoming session.</p>
        )}
        {next?.id ? (
          <Link
            className="mt-3 inline-flex h-12 items-center text-primary underline-offset-2 hover:underline"
            href={`/sessions/${next.id}`}
          >
            Prepare session
          </Link>
        ) : null}
      </section>
      <ul className="grid gap-3 min-[600px]:grid-cols-3">
        <li className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <p className="text-sm text-text-muted">Active cases</p>
          <p className="mt-2 text-3xl font-semibold">{asCount(data.activeCases)}</p>
        </li>
        <li className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <p className="text-sm text-text-muted">Overdue tasks</p>
          <p className="mt-2 text-3xl font-semibold">{asCount(data.overdueTasks)}</p>
        </li>
        <li className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <p className="text-sm text-text-muted">Reports due (24h)</p>
          <p className="mt-2 text-3xl font-semibold">{asCount(data.reportsDue)}</p>
        </li>
      </ul>
      <section>
        <h2 className="text-lg font-semibold text-text">Follow-up queue</h2>
        <ul className="mt-3 space-y-2">
          {followUps.map((item) => (
            <li key={item.caseId}>
              <Link
                className="block rounded-[var(--radius-card)] border border-border bg-surface p-4"
                href={`/counselor/students/${item.caseId}`}
              >
                {item.gscId ?? "Not provided"} · {item.studentName}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-sm text-text-muted">
        Private AI coaching is a staff-only screen. Manual summaries stay
        available when recording and AI are off.
      </p>
      <nav className="flex flex-col gap-3 min-[600px]:flex-row">
        <Link
          className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-surface"
          href="/counselor/students"
        >
          Manage students
        </Link>
        <Link
          className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] border border-control-border px-4"
          href="/counselor/coaching"
        >
          Private coaching
        </Link>
        <p className="text-sm text-text-muted">
          Professional profile, company affiliation and calendar availability
          screens are not built yet (COU-02–04).
        </p>
      </nav>
    </div>
  );
}
