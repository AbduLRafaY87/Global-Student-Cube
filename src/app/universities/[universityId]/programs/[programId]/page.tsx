import { PublicChrome } from "@/components/public/PublicChrome";
import { SaveProgramButton } from "@/components/public/SaveProgramButton";
import { SourceList } from "@/components/public/SourceList";
import { EmptyState } from "@/components/ui/States";
import {
  displayDeadline,
  displayMoney,
  displayText,
  NOT_PROVIDED,
} from "@/domain/catalog/display";
import { alreadySaved } from "@/domain/shortlist/shortlist";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/server/modules/admin/http";
import { loadSaveContext } from "@/server/modules/shortlist/load";
import {
  fetchPublishedAccommodations,
  fetchPublishedCriteria,
  fetchPublishedIntakes,
  fetchPublishedPrograms,
  fetchPublishedScholarships,
  fetchPublishedSources,
  fetchPublishedUniversities,
} from "@/server/modules/catalog/public";
import { Calculator } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ universityId: string; programId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { programId } = await params;
  return {
    title: "Program",
    description:
      "Published program profile with separately labelled annual and full-course fees. Month-only deadlines stay a month.",
    robots: isUuid(programId) ? undefined : { index: false },
  };
}

export default async function ProgramDetailPage({ params }: PageProps) {
  const { universityId, programId } = await params;
  if (!isUuid(universityId) || !isUuid(programId)) {
    return (
      <PublicChrome>
        <EmptyState title="Program unavailable" message="That record is not a published program." />
      </PublicChrome>
    );
  }

  const [universities, programs, housing, scholarships, intakes, criteria, sources] =
    await Promise.all([
      fetchPublishedUniversities(),
      fetchPublishedPrograms(),
      fetchPublishedAccommodations(),
      fetchPublishedScholarships(),
      fetchPublishedIntakes(programId),
      fetchPublishedCriteria(programId),
      fetchPublishedSources("program", programId),
    ]);
  const university = universities.find((row) => row.id === universityId);
  const program = programs.find(
    (row) => row.id === programId && row.university_id === universityId,
  );
  if (!university || !program) {
    return (
      <PublicChrome>
        <EmptyState title="Program unavailable" message="Unpublished or withdrawn programs are not shown." />
      </PublicChrome>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const saveContext = user ? await loadSaveContext(user.id) : null;
  const universityHousing = housing.filter((row) => row.university_id === university.id);
  const relatedScholarships = scholarships.filter(
    (row) => row.university_id === university.id || row.field_ids.includes(program.field_id),
  );

  return (
    <PublicChrome>
      <nav className="text-sm text-text-muted">
        <Link className="text-primary underline-offset-2 hover:underline" href={`/universities/${university.id}`}>
          {university.name}
        </Link>
        <span> / </span>
        <span>{program.name}</span>
      </nav>
      <h1 className="text-2xl font-semibold break-words text-text">{program.name}</h1>
      <p className="text-sm text-text">
        {program.level} · duration {displayText(program.duration_value)} {displayText(program.duration_unit)} ·{" "}
        {program.study_modes.join(", ") || NOT_PROVIDED}
      </p>

      <section className="grid gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 min-[900px]:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold text-text">Fees</h2>
          <p className="mt-2 text-sm text-text">
            Annual tuition: {displayMoney(program.annual_tuition_amount, program.annual_tuition_currency)}
          </p>
          <p className="text-sm text-text">
            Full-course fee:{" "}
            {displayMoney(program.full_program_tuition_amount, program.full_program_tuition_currency)}
          </p>
        </div>
        <div className="space-y-3">
          <SaveProgramButton
            universityId={university.id}
            programId={program.id}
            caseId={saveContext?.caseId ?? null}
            module3Completed={Boolean(saveContext?.module3Completed)}
            canWrite={Boolean(saveContext?.canWrite)}
            savedCount={saveContext?.pairs.length ?? 0}
            alreadySaved={alreadySaved(saveContext?.pairs ?? [], university.id, program.id)}
          />
          <Link
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-control-border px-4 text-sm"
            href={
              saveContext
                ? `/cases/${saveContext.caseId}/costs?program=${program.id}`
                : "/register"
            }
          >
            <Calculator className="size-4" aria-hidden />
            Plan costs
          </Link>
          <Link
            className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] border border-control-border px-4 text-sm"
            href={
              saveContext
                ? `/cases/${saveContext.caseId}/assessment/${program.id}`
                : "/register"
            }
          >
            Check my requirements
          </Link>
          <p className="text-sm text-text-muted">
            Application steps stay locked until counseling is complete and this
            program is a chosen target.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text">Intakes and deadlines</h2>
        {intakes.length === 0 ? (
          <p className="text-sm text-text-muted">{NOT_PROVIDED}</p>
        ) : (
          <ul className="grid gap-3">
            {intakes.map((intake) => (
              <li key={intake.id} className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm text-text">
                {intake.intake_year}
                {intake.intake_month ? ` · month ${intake.intake_month}` : ""} · deadline{" "}
                {displayDeadline({
                  precision: intake.deadline_precision,
                  date: intake.deadline_date,
                  month: intake.deadline_month,
                })}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text">Entry requirements</h2>
        <p className="text-sm text-text-muted">
          Unknown data does not mean a requirement is waived.
        </p>
        {criteria.length === 0 ? (
          <p className="text-sm text-text-muted">{NOT_PROVIDED}</p>
        ) : (
          <ul className="grid gap-3">
            {criteria.map((row) => (
              <li key={row.id} className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm text-text">
                <p className="font-medium">
                  {row.criterion_key} · {row.kind} · {row.mandatory ? "mandatory" : "weighted"}
                </p>
                <p className="mt-1 text-text-muted">
                  {typeof row.requirement === "string"
                    ? row.requirement
                    : JSON.stringify(row.requirement)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text">Accommodation and scholarships</h2>
        <p className="text-sm text-text">
          Accommodation: {universityHousing.length === 0 ? NOT_PROVIDED : `${universityHousing.length} published rows`}
        </p>
        <p className="text-sm text-text">
          Scholarships: {relatedScholarships.length === 0 ? NOT_PROVIDED : `${relatedScholarships.length} published rows`}
        </p>
      </section>

      <p className="text-sm text-text">
        Public information:{" "}
        {program.general_url ? (
          <a className="text-primary underline-offset-2 hover:underline" href={program.general_url} rel="noreferrer" target="_blank">
            {program.general_url}
          </a>
        ) : (
          NOT_PROVIDED
        )}
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text">Sources</h2>
        <SourceList sources={sources} />
      </section>
    </PublicChrome>
  );
}
