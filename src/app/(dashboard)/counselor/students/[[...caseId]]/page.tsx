import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { OpenCounselorConversation } from "@/app/(dashboard)/messages/_components/OpenCounselorConversation";
import { loadCounselorCaseload } from "@/server/modules/counseling/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Caseload" };

interface PageProps {
  params: Promise<{ caseId?: string[] }>;
}

export default async function CounselorStudentsPage({ params }: PageProps) {
  const { caseId: parts } = await params;
  const selected = parts?.[0] ?? null;
  const result = await loadCounselorCaseload(selected);

  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        {result.forbidden ? (
          <ForbiddenState message="This case is not on your caseload." />
        ) : (
          <ErrorState />
        )}
      </div>
    );
  }

  const data = result.data;
  const cases = Array.isArray(data.cases)
    ? (data.cases as Array<{ caseId: string; gscId: string | null; studentName: string }>)
    : [];
  const sessions = Array.isArray(data.sessions)
    ? (data.sessions as Array<{
        id: string;
        startsAt: string;
        sessionState: string;
        advisoryStatus: string | null;
      }>)
    : [];
  const tasks = Array.isArray(data.tasks)
    ? (data.tasks as Array<{ id: string; title: string; status: string }>)
    : [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 min-[1440px]:grid min-[1440px]:grid-cols-[280px_1fr]">
      <section>
        <h1 className="text-2xl font-semibold text-text">Caseload</h1>
        {cases.length === 0 && !selected ? (
          <EmptyState
            title="No assigned students"
            message="Access is only through an active assignment grant."
          />
        ) : (
          <ul className="mt-4 space-y-2">
            {cases.map((item) => (
              <li key={item.caseId}>
                <Link
                  href={`/counselor/students/${item.caseId}`}
                  className="block rounded-[var(--radius-card)] border border-border bg-surface p-3 text-sm"
                >
                  {item.gscId ?? "Not provided"} · {item.studentName}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {selected ? (
        <section className="space-y-6">
          <p className="text-sm text-text-muted">
            Changing case clears the previous financial pane. Private notes never
            enter a shareable advisory automatically.
          </p>
          <nav className="flex flex-wrap gap-3 text-sm">
            <OpenCounselorConversation caseId={selected} />
            <Link className="text-primary underline-offset-2 hover:underline" href={`/cases/${selected}/profile`}>
              Academic
            </Link>
            <Link className="text-primary underline-offset-2 hover:underline" href={`/cases/${selected}/costs`}>
              Finance
            </Link>
            <Link className="text-primary underline-offset-2 hover:underline" href={`/cases/${selected}/shortlist`}>
              Shortlist
            </Link>
            <Link className="text-primary underline-offset-2 hover:underline" href={`/cases/${selected}/tasks`}>
              Tasks
            </Link>
          </nav>
          <div>
            <h2 className="text-lg font-semibold">Sessions and reports</h2>
            <ul className="mt-3 space-y-2">
              {sessions.map((session) => (
                <li key={session.id} className="rounded-[var(--radius-card)] border border-border p-3 text-sm">
                  <Link className="text-primary underline-offset-2 hover:underline" href={`/sessions/${session.id}`}>
                    {new Date(session.startsAt).toLocaleString()} · {session.sessionState}
                  </Link>
                  <span className="block text-text-muted">
                    Advisory: {session.advisoryStatus ?? "awaiting_summary"}
                  </span>
                  <Link
                    className="mt-2 inline-flex h-12 items-center text-primary underline-offset-2 hover:underline"
                    href={`/counselor/sessions/${session.id}/report`}
                  >
                    Draft advisory
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Tasks</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {tasks.map((task) => (
                <li key={task.id}>
                  {task.title} · {task.status}
                </li>
              ))}
            </ul>
            <Link
              className="mt-3 inline-flex h-12 items-center text-primary underline-offset-2 hover:underline"
              href={`/cases/${selected}/tasks`}
            >
              Create follow-up task
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
