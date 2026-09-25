import {
  deleteApplication,
  updateApplicationStatus,
} from "@/app/(dashboard)/applications/actions";
import { ApplicationForm } from "@/components/forms/ApplicationForm";
import { EmptyState } from "@/components/ui/States";
import { ToneChip } from "@/components/ui/Status";
import { resolveRequestContext } from "@/server/context";
import { loadApplicationWorkspace } from "@/server/modules/applications/load";
import { fetchPublishedUniversities } from "@/server/modules/catalog/public";
import { resolveAccessibleCase } from "@/server/modules/profile/load";
import type { Application, ApplicationStatus } from "@/types";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Applications",
};

export default async function ApplicationsPage() {
  const context = await resolveRequestContext();
  const [groups, universities, caseRow] = await Promise.all([
    loadApplicationWorkspace(context),
    fetchPublishedUniversities(),
    resolveAccessibleCase(context.accountId),
  ]);
  const universityOptions = universities.map((row) => ({
    id: row.id,
    name: row.name,
    country: row.country,
  }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Application groups</h1>
        <p className="mt-2 max-w-3xl text-sm text-text-muted">
          An application is a choice inside a group. A group belongs to one
          platform. System deadlines are listed once. Shared certifications stay
          one item. Adding a row opens a direct institution-portal group, not a
          named platform. The selected-target roadmap is a separate screen.
        </p>
        {caseRow ? (
          <Link
            className="mt-3 inline-flex text-sm text-primary underline-offset-2 hover:underline"
            href={`/cases/${caseRow.id}/roadmap`}
          >
            Open selected-target roadmap
          </Link>
        ) : null}
      </header>

      <ApplicationForm universities={universityOptions} application={null} />

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Deadline view</h2>
        {groups.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">No sourced application deadlines yet.</p>
        ) : (
          <ul className="mt-4 space-y-6">
            {groups.map((group) => (
                <li key={group.id}>
                  <p className="font-medium text-text">{group.systemName}</p>
                  <p className="text-sm text-text-muted">
                    {group.choices.length} choice{group.choices.length === 1 ? "" : "s"} ·{" "}
                    {group.state}
                  </p>
                  {group.deadlines.length === 0 ? (
                    <p className="mt-2 text-sm text-text-muted">Not provided</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {group.deadlines.map((row) => (
                        <li key={row.key} className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm text-text">{row.sourceLabel}</p>
                            <p className="text-sm text-text-muted">{row.when}</p>
                          </div>
                          <ToneChip tone={row.tone} label={row.toneLabel} />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
            ))}
          </ul>
        )}
      </section>

      {groups.length === 0 ? (
        <EmptyState
          title="No application groups"
          message="Existing leftover rows stay on legacy_unmapped. New rows open a direct group. UCAS or Common App membership is never inferred from a country."
        />
      ) : (
        <ul className="grid gap-4">
          {groups.map((group) => (
            <li
              key={group.id}
              className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
            >
              <div>
                <h2 className="text-lg font-semibold text-text">{group.systemName}</h2>
                <p className="text-sm text-text-muted">
                  {group.choiceModel || "Not provided"} · group {group.state}
                  {group.migrationSource ? ` · ${group.migrationSource}` : ""}
                </p>
              </div>

              <section>
                <h3 className="text-sm font-medium text-text">Cost to apply</h3>
                <p className="mt-1 text-sm text-text">{group.fees.label}</p>
                <p className="text-sm text-text-muted">
                  One subtotal per system. Missing amounts stay Not provided, not 0.
                </p>
              </section>

              <section>
                <h3 className="text-sm font-medium text-text">Shared documents</h3>
                {group.documents.length === 0 ? (
                  <p className="mt-1 text-sm text-text-muted">
                    No document requirements are published for this system.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm text-text">
                    {group.documents.map((item) => (
                      <li key={item.key}>
                        {item.purpose}
                        {item.sharedOnce
                          ? " · certified once for the group"
                          : ` · ${item.copies} cop${item.copies === 1 ? "y" : "ies"}`}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="text-sm font-medium text-text">Choices</h3>
                {group.choices.length === 0 ? (
                  <p className="mt-1 text-sm text-text-muted">No choices in this group.</p>
                ) : (
                  <ul className="mt-2 space-y-3">
                    {group.choices.map((choice) => {
                      const leftover: Application = {
                        id: choice.id,
                        student_id: context.accountId,
                        university_id: choice.universityId,
                        status: choice.status as ApplicationStatus,
                        deadline: "",
                        version: choice.version,
                        created_at: "",
                        updated_at: "",
                      };
                      return (
                        <li
                          key={choice.id}
                          className="flex flex-col gap-3 rounded-[var(--radius-control)] border border-border p-3 min-[768px]:flex-row min-[768px]:items-center min-[768px]:justify-between"
                        >
                          <div>
                            <p className="font-medium text-text">{choice.universityName}</p>
                            <p className="text-sm text-text-muted">
                              {choice.preferenceOrder !== null
                                ? `Preference ${choice.preferenceOrder}`
                                : "Unordered choice"}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <form
                              action={async (formData) => {
                                await updateApplicationStatus(null, formData);
                              }}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <input type="hidden" name="id" value={choice.id} />
                              <input type="hidden" name="version" value={choice.version} />
                              <input type="hidden" name="university_id" value={choice.universityId} />
                              <label className="sr-only" htmlFor={`status-${choice.id}`}>
                                Status
                              </label>
                              <select
                                id={`status-${choice.id}`}
                                name="status"
                                defaultValue={choice.status}
                                className="h-12 rounded-[var(--radius-control)] border border-control-border bg-surface px-3 text-sm"
                              >
                                <option value="draft">Draft</option>
                                <option value="submitted">Submitted</option>
                                <option value="accepted">Accepted</option>
                                <option value="rejected">Rejected</option>
                              </select>
                              <button
                                type="submit"
                                className="h-12 rounded-[var(--radius-control)] border border-control-border px-3 text-sm"
                              >
                                Update
                              </button>
                            </form>
                            <form action={deleteApplication}>
                              <input type="hidden" name="id" value={leftover.id} />
                              <input type="hidden" name="version" value={leftover.version} />
                              <button
                                type="submit"
                                className="h-12 text-sm font-medium text-critical"
                              >
                                Delete
                              </button>
                            </form>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
