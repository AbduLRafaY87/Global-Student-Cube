import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { AWAITING_DATE_LABEL } from "@/domain/counseling/tasks";
import { loadCaseTasks } from "@/server/modules/counseling/load";
import { TaskActions } from "@/app/(dashboard)/cases/[caseId]/tasks/TaskActions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Follow-up tasks" };

interface PageProps {
  params: Promise<{ caseId: string; taskId?: string[] }>;
}

export default async function CaseTasksPage({ params }: PageProps) {
  const { caseId, taskId } = await params;
  const selected = taskId?.[0] ?? null;
  const result = await loadCaseTasks(caseId);
  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        {result.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const counts = (result.data.counts ?? {}) as {
    open?: number;
    overdue?: number;
    completed?: number;
  };
  const items = Array.isArray(result.data.items)
    ? (result.data.items as Array<{
        id: string;
        title: string;
        description: string | null;
        ownerRole: string;
        status: string;
        dueAt: string | null;
        awaitingDate: boolean;
        extensions: Array<{ previousDueAt: string | null; nextDueAt: string; reason: string }>;
      }>)
    : [];
  const selectedTask = items.find((item) => item.id === selected) ?? items[0] ?? null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 min-[768px]:grid min-[768px]:grid-cols-[1fr_1fr]">
      <section>
        <h1 className="text-2xl font-semibold text-text">Follow-up tasks</h1>
        <p className="mt-2 text-sm text-text-muted">
          Open {counts.open ?? 0} · Overdue {counts.overdue ?? 0} · Completed{" "}
          {counts.completed ?? 0}
        </p>
        {items.length === 0 ? (
          <EmptyState title="No tasks" message="The assigned counselor can create a follow-up." />
        ) : (
          <ul className="mt-4 space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`/cases/${caseId}/tasks/${item.id}`}
                  className="block rounded-[var(--radius-card)] border border-border bg-surface p-3 text-sm"
                >
                  {item.title} · {item.ownerRole} · {item.status} ·{" "}
                  {item.awaitingDate ? AWAITING_DATE_LABEL : item.dueAt}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
      {selectedTask ? (
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold">{selectedTask.title}</h2>
          <p className="mt-2 text-sm text-text-muted">
            {selectedTask.description ?? "Not provided"}
          </p>
          <p className="mt-2 text-sm">
            Due: {selectedTask.awaitingDate ? AWAITING_DATE_LABEL : selectedTask.dueAt}
          </p>
          {selectedTask.extensions.length > 0 ? (
            <ul className="mt-3 text-sm text-text-muted">
              {selectedTask.extensions.map((extension, index) => (
                <li key={index}>
                  Extended from {extension.previousDueAt ?? AWAITING_DATE_LABEL} to{" "}
                  {extension.nextDueAt}: {extension.reason}
                </li>
              ))}
            </ul>
          ) : null}
          <TaskActions caseId={caseId} taskId={selectedTask.id} status={selectedTask.status} />
        </section>
      ) : null}
    </div>
  );
}
