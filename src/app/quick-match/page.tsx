import { PublicChrome } from "@/components/public/PublicChrome";
import { displayMoney, NOT_PROVIDED } from "@/domain/catalog/display";
import { guestMatchLimit } from "@/domain/recommendations/recommendations";
import {
  fetchPublishedPrograms,
  fetchPublishedScholarships,
  fetchPublishedUniversities,
} from "@/server/modules/catalog/public";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "60-second match",
  description:
    "Preview published universities and scholarships from country and subject only. No personal details are submitted.",
};

interface PageProps {
  searchParams: Promise<{ country?: string; subject?: string }>;
}

export default async function QuickMatchPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const country = (filters.country ?? "").trim().toUpperCase();
  const subject = (filters.subject ?? "").trim();
  const submitted = Boolean(country || subject);

  const [universities, programs, scholarships] = submitted
    ? await Promise.all([
        fetchPublishedUniversities(),
        fetchPublishedPrograms(),
        fetchPublishedScholarships(),
      ])
    : [[], [], []];

  const universityHits = universities.filter((university) => {
    const countryOk = !country || university.country === country;
    const subjectOk =
      !subject
      || university.name.toLowerCase().includes(subject.toLowerCase())
      || programs.some(
        (program) =>
          program.university_id === university.id
          && program.name.toLowerCase().includes(subject.toLowerCase()),
      );
    return countryOk && subjectOk;
  });
  const scholarshipHits = scholarships.filter((row) => {
    const countryOk = !country || row.country_codes.includes(country);
    const subjectOk = !subject || row.name.toLowerCase().includes(subject.toLowerCase());
    return countryOk && subjectOk;
  });
  const limits = guestMatchLimit(universityHits.length, scholarshipHits.length);
  const shownUniversities = universityHits.slice(0, limits.universities);
  const shownScholarships = scholarshipHits.slice(0, limits.scholarships);

  return (
    <PublicChrome>
      <h1 className="text-2xl font-semibold text-text">Guest course and university match</h1>
      <p className="text-sm text-text-muted">No personal details required.</p>
      <form method="get" className="grid gap-3 min-[768px]:grid-cols-3">
        <label className="text-sm text-text">
          Country
          <input
            name="country"
            defaultValue={country}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
            placeholder="GB"
          />
        </label>
        <label className="text-sm text-text">
          Subject
          <input
            name="subject"
            defaultValue={subject}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 font-medium text-surface min-[768px]:self-end"
        >
          <Sparkles className="size-5" aria-hidden />
          Show matches
        </button>
      </form>
      {submitted ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-text">
            {shownUniversities.length} universit{shownUniversities.length === 1 ? "y" : "ies"},{" "}
            {shownScholarships.length} scholarship{shownScholarships.length === 1 ? "" : "s"}
          </h2>
          {shownUniversities.length === 0 ? (
            <p className="text-sm text-text-muted">No matches. Change subject.</p>
          ) : (
            <ul className="grid gap-3 min-[768px]:grid-cols-2">
              {shownUniversities.map((university) => {
                const program = programs.find((row) => row.university_id === university.id);
                return (
                  <li
                    key={university.id}
                    className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
                  >
                    <p className="font-medium text-text">{university.name}</p>
                    <p className="mt-1 text-sm text-text-muted">
                      {university.city ?? NOT_PROVIDED}, {university.country}
                    </p>
                    <p className="mt-2 text-sm text-text">{program?.name ?? NOT_PROVIDED}</p>
                    <p className="mt-1 text-sm text-text">
                      Public fee range:{" "}
                      {program
                        ? displayMoney(program.annual_tuition_amount, program.annual_tuition_currency)
                        : "Not published"}
                    </p>
                    <Link
                      className="mt-3 inline-block text-sm text-primary underline-offset-2 hover:underline"
                      href={`/universities/${university.id}`}
                    >
                      View university
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {shownScholarships.length > 0 ? (
            <ul className="grid gap-3">
              {shownScholarships.map((row) => (
                <li key={row.id} className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
                  <p className="font-medium text-text">{row.name}</p>
                  <p className="text-sm text-text-muted">{row.provider_name}</p>
                  <Link
                    className="mt-2 inline-block text-sm text-primary underline-offset-2 hover:underline"
                    href={`/scholarships/${row.id}`}
                  >
                    View scholarship
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <Link
            className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-surface"
            href={`/register?country=${encodeURIComponent(country)}&subject=${encodeURIComponent(subject)}`}
          >
            Personalize my matches
          </Link>
        </section>
      ) : null}
    </PublicChrome>
  );
}
