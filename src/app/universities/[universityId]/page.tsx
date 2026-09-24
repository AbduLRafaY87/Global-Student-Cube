import { PublicChrome } from "@/components/public/PublicChrome";
import { SaveProgramButton } from "@/components/public/SaveProgramButton";
import { SourceList } from "@/components/public/SourceList";
import { EmptyState } from "@/components/ui/States";
import { displayText, NOT_PROVIDED } from "@/domain/catalog/display";
import { alreadySaved } from "@/domain/shortlist/shortlist";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/server/modules/admin/http";
import { loadSaveContext } from "@/server/modules/shortlist/load";
import {
  fetchPublishedAccommodations,
  fetchPublishedPrograms,
  fetchPublishedRankings,
  fetchPublishedSources,
  fetchPublishedUniversities,
} from "@/server/modules/catalog/public";
import { ExternalLink, MapPin } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ universityId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { universityId } = await params;
  return {
    title: "University",
    description: "Published university profile. Application URLs are not included.",
    robots: isUuid(universityId) ? undefined : { index: false },
  };
}

export default async function UniversityDetailPage({ params }: PageProps) {
  const { universityId } = await params;
  if (!isUuid(universityId)) {
    return (
      <PublicChrome>
        <EmptyState title="University unavailable" message="That record is not a published university." />
      </PublicChrome>
    );
  }

  const [universities, programs, housing, rankings, sources] = await Promise.all([
    fetchPublishedUniversities(),
    fetchPublishedPrograms(),
    fetchPublishedAccommodations(),
    fetchPublishedRankings(),
    fetchPublishedSources("university", universityId),
  ]);
  const university = universities.find((row) => row.id === universityId);
  if (!university) {
    return (
      <PublicChrome>
        <EmptyState title="University unavailable" message="Unpublished or withdrawn universities are not shown." />
      </PublicChrome>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const saveContext = user ? await loadSaveContext(user.id) : null;
  const universityPrograms = programs.filter((row) => row.university_id === university.id);
  const universityHousing = housing.filter((row) => row.university_id === university.id);
  const universityRankings = rankings.filter((row) => row.university_id === university.id);
  const ratio = universityPrograms
    .map((row) => row.international_ratio)
    .find((value) => value !== null);

  return (
    <PublicChrome>
      <Link className="text-sm text-primary underline-offset-2 hover:underline" href="/explore/universities">
        Back to discovery
      </Link>
      <header className="flex items-start gap-4">
        <div
          aria-hidden
          className="flex size-16 shrink-0 items-center justify-center rounded-[var(--radius-card)] border border-border bg-surface text-sm text-text-muted max-[360px]:size-12"
        >
          Logo
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-text">{university.name}</h1>
          <p className="text-sm text-text-muted">
            {university.aliases.length > 0 ? university.aliases.join(", ") : NOT_PROVIDED}
          </p>
          <p className="mt-1 text-sm text-text">
            {displayText(university.type)} · {displayText(university.city)}, {university.country}
          </p>
        </div>
      </header>

      <dl className="grid gap-3 text-sm text-text min-[768px]:grid-cols-2">
        <div>
          <dt className="text-text-muted">Course rank</dt>
          <dd>
            {universityRankings[0]
              ? `${universityRankings[0].rank_min ?? NOT_PROVIDED} · ${universityRankings[0].publisher} · ${universityRankings[0].edition_year}`
              : NOT_PROVIDED}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">International-student ratio</dt>
          <dd>{ratio === null || ratio === undefined ? NOT_PROVIDED : `${ratio}`}</dd>
        </div>
      </dl>

      <section id="programs" className="space-y-3">
        <h2 className="text-lg font-semibold text-text">Programs</h2>
        {universityPrograms.length === 0 ? (
          <p className="text-sm text-text-muted">No published programs.</p>
        ) : (
          <ul className="grid gap-3">
            {universityPrograms.map((program) => (
              <li key={program.id} className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
                <p className="font-medium text-text">{program.name}</p>
                <p className="text-sm text-text-muted">{program.level}</p>
                <div className="mt-3 flex flex-col gap-2 min-[600px]:flex-row">
                  <Link
                    className="text-sm text-primary underline-offset-2 hover:underline"
                    href={`/universities/${university.id}/programs/${program.id}`}
                  >
                    Browse programs
                  </Link>
                  <SaveProgramButton
                    universityId={university.id}
                    programId={program.id}
                    caseId={saveContext?.caseId ?? null}
                    module3Completed={Boolean(saveContext?.module3Completed)}
                    canWrite={Boolean(saveContext?.canWrite)}
                    savedCount={saveContext?.pairs.length ?? 0}
                    alreadySaved={alreadySaved(
                      saveContext?.pairs ?? [],
                      university.id,
                      program.id,
                    )}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text">Accommodation</h2>
        {universityHousing.length === 0 ? (
          <p className="text-sm text-text-muted">{NOT_PROVIDED}</p>
        ) : (
          <ul className="grid gap-3">
            {universityHousing.map((row) => (
              <li key={row.id} className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm text-text">
                {row.name} · {row.type} · {row.basis} · {row.amount ?? NOT_PROVIDED} {row.currency ?? ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text">Location and official information</h2>
        {university.website_url ? (
          <a
            className="inline-flex items-center gap-2 text-sm text-primary underline-offset-2 hover:underline"
            href={university.website_url}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink className="size-4" aria-hidden />
            Official information
          </a>
        ) : (
          <p className="text-sm text-text-muted">Official information: {NOT_PROVIDED}</p>
        )}
        {university.city ? (
          <a
            className="inline-flex items-center gap-2 text-sm text-primary underline-offset-2 hover:underline"
            href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${university.city} ${university.country}`)}`}
            rel="noreferrer"
            target="_blank"
          >
            <MapPin className="size-4" aria-hidden />
            Directions
          </a>
        ) : null}
        <p className="text-sm text-text-muted">
          Campus tour: {university.virtual_tour_url ?? university.tour_video_url ?? NOT_PROVIDED}
        </p>
        <p className="text-sm text-text-muted">
          Official contacts are not published on this page. Application URLs are excluded.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text">Sources</h2>
        <SourceList sources={sources} />
      </section>
    </PublicChrome>
  );
}
