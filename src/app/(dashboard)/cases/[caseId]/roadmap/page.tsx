import { RoadmapActions } from "@/components/journey/RoadmapActions";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { displayText, NOT_PROVIDED } from "@/domain/catalog/display";
import {
  missingDeadlineLabel,
  phaseFromSourceKey,
  ROADMAP_PHASE_LABELS,
  ROADMAP_PHASES,
  type RoadmapPhase,
} from "@/domain/journey/roadmap";
import { isUuid } from "@/server/modules/admin/http";
import { loadCaseRoadmap } from "@/server/modules/journey/load";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Selected-target application roadmap",
};

interface PageProps {
  params: Promise<{ caseId: string }>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

interface RoadmapTaskRow {
  id: string;
  title: string;
  description: string;
  status: string;
  ownerRole: string;
  dueAt: string | null;
  sourceKey: string;
  evidenceId: string | null;
  phase: RoadmapPhase;
}

export default async function CaseRoadmapPage({ params }: PageProps) {
  const { caseId } = await params;
  if (!isUuid(caseId)) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <EmptyState title="Case unavailable" message="That case is not available." />
      </div>
    );
  }

  const result = await loadCaseRoadmap(caseId);
  if (!result.ok) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        {result.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }

  const data = result.data;
  const unlocked = data.unlocked === true;
  const target = asRecord(data.target);
  const officialUrl = asText(target?.officialUrl);
  const savedTargets = Array.isArray(data.savedTargets) ? data.savedTargets : [];
  const tasks: RoadmapTaskRow[] = (Array.isArray(data.tasks) ? data.tasks : []).flatMap((item) => {
    const row = asRecord(item);
    if (!row || typeof row.id !== "string") {
      return [];
    }
    return [
      {
        id: row.id,
        title: asText(row.title) || "Untitled task",
        description: asText(row.description),
        status: asText(row.status) || "open",
        ownerRole: asText(row.ownerRole) || "Student",
        dueAt: typeof row.dueAt === "string" ? row.dueAt : null,
        sourceKey: asText(row.sourceKey),
        evidenceId: typeof row.evidenceId === "string" ? row.evidenceId : null,
        phase: phaseFromSourceKey(asText(row.sourceKey)),
      },
    ];
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Selected-target application roadmap</h1>
        <p className="mt-2 text-sm text-text-muted">
          Tasks come from the selected program’s published criteria and the
          application-system model. Opening an official site does not mark
          submission complete.
        </p>
      </header>

      {!unlocked ? (
        <EmptyState
          title="Roadmap is locked"
          message={
            asText(data.lockReason) ||
            "Application actions unlock after completed counseling and an explicit target selection."
          }
        />
      ) : (
        <>
          <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
            <h2 className="text-lg font-semibold text-text">Saved targets</h2>
            {savedTargets.length === 0 ? (
              <p className="mt-2 text-sm text-text-muted">No saved university and program pairs.</p>
            ) : (
              <ul className="mt-3 space-y-4">
                {savedTargets.map((item) => {
                  const row = asRecord(item);
                  if (!row || typeof row.programId !== "string") {
                    return null;
                  }
                  const selected = asText(target?.programId) === row.programId;
                  return (
                    <li
                      key={row.programId}
                      className="rounded-[var(--radius-card)] border border-border p-3"
                    >
                      <p className="text-sm font-medium text-text">
                        {displayText(asText(row.universityName))} ·{" "}
                        {displayText(asText(row.programName))}
                        {selected ? " · Current target" : ""}
                      </p>
                      <div className="mt-3">
                        <RoadmapActions caseId={caseId} programId={row.programId} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 text-sm text-text-muted">
              Choosing another target rebuilds the draft roadmap. Earlier tasks stay
              in history.
            </p>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-12 items-center text-sm text-primary underline-offset-2 hover:underline"
              href={`/cases/${caseId}/visa`}
            >
              Destination visa guidance
            </Link>
            {officialUrl ? (
              <a
                className="inline-flex h-12 items-center gap-2 text-sm text-primary underline-offset-2 hover:underline"
                href={officialUrl}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink className="size-4" aria-hidden />
                Official application site
              </a>
            ) : (
              <p className="inline-flex h-12 items-center text-sm text-text-muted">
                Official application URL {NOT_PROVIDED}
              </p>
            )}
          </div>
        </>
      )}

      {unlocked && tasks.length === 0 ? (
        <EmptyState
          title="No derived tasks yet"
          message="Choose a saved target to generate the draft roadmap from its criteria and application system."
        />
      ) : null}

      {unlocked && tasks.length > 0 ? (
        <div className="flex flex-col gap-4 min-[900px]:flex-row min-[900px]:overflow-x-auto">
          {ROADMAP_PHASES.map((phase) => {
            const phaseTasks = tasks.filter((task) => task.phase === phase);
            return (
              <section
                key={phase}
                className="min-w-0 rounded-[var(--radius-card)] border border-border bg-surface p-4 min-[900px]:min-w-[16rem] min-[900px]:flex-1"
              >
                <h2 className="text-lg font-semibold text-text">
                  {ROADMAP_PHASE_LABELS[phase]}
                </h2>
                {phaseTasks.length === 0 ? (
                  <p className="mt-2 text-sm text-text-muted">{NOT_PROVIDED}</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {phaseTasks.map((task) => (
                      <li
                        key={task.id}
                        className="rounded-[var(--radius-card)] border border-border p-3"
                      >
                        <p className="text-sm font-medium text-text">{task.title}</p>
                        <p className="mt-1 text-sm text-text-muted">
                          {task.description || NOT_PROVIDED}
                        </p>
                        <dl className="mt-2 grid gap-1 text-sm text-text">
                          <div>
                            <dt className="text-text-muted">Owner</dt>
                            <dd>{task.ownerRole}</dd>
                          </div>
                          <div>
                            <dt className="text-text-muted">Status</dt>
                            <dd>{task.status.replaceAll("_", " ")}</dd>
                          </div>
                          <div>
                            <dt className="text-text-muted">Due</dt>
                            <dd>{task.dueAt ?? missingDeadlineLabel()}</dd>
                          </div>
                          <div>
                            <dt className="text-text-muted">Evidence</dt>
                            <dd>
                              {task.evidenceId ? "Evidence attached" : "No evidence attached"}
                            </dd>
                          </div>
                        </dl>
                        <Link
                          className="mt-2 inline-flex text-sm text-primary underline-offset-2 hover:underline"
                          href={`/cases/${caseId}/tasks/${task.id}`}
                        >
                          Open task
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
