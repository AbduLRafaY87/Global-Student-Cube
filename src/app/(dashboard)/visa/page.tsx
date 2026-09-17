import { toggleVisaChecklistItem } from "@/app/(dashboard)/visa/actions";
import { VisaRequirementForm } from "@/components/forms/VisaRequirementForm";
import { createClient } from "@/lib/supabase/server";
import type { VisaChecklistItem } from "@/types";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Visa",
};

interface CountryChecklist {
  country: string;
  items: VisaChecklistItem[];
  completedCount: number;
}

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function toVisaChecklistItem(row: {
  id: unknown;
  student_id: unknown;
  country: unknown;
  document_name: unknown;
  is_completed: unknown;
  notes: unknown;
  created_at: unknown;
}): VisaChecklistItem | null {
  if (
    typeof row.id !== "string" ||
    typeof row.student_id !== "string" ||
    typeof row.country !== "string" ||
    typeof row.document_name !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    student_id: row.student_id,
    country: row.country,
    document_name: row.document_name,
    is_completed: row.is_completed === true,
    notes: typeof row.notes === "string" ? row.notes : "",
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  };
}

function groupByCountry(items: VisaChecklistItem[]): CountryChecklist[] {
  const groups = new Map<string, VisaChecklistItem[]>();

  for (const item of items) {
    const current = groups.get(item.country) ?? [];
    current.push(item);
    groups.set(item.country, current);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([country, countryItems]) => ({
      country,
      items: countryItems,
      completedCount: countryItems.filter((item) => item.is_completed).length,
    }));
}

export default async function VisaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const countryFilter = firstParam(params.country).trim();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const items: VisaChecklistItem[] = [];

  if (user) {
    const { data } = await supabase
      .from("visa_checklists")
      .select(
        "id, student_id, country, document_name, is_completed, notes, created_at",
      )
      .eq("student_id", user.id)
      .order("country", { ascending: true })
      .order("is_completed", { ascending: true })
      .order("document_name", { ascending: true });

    if (data) {
      for (const row of data) {
        const item = toVisaChecklistItem(row);
        if (item) {
          items.push(item);
        }
      }
    }
  }

  const allChecklists = groupByCountry(items);
  const countries = allChecklists.map((checklist) => checklist.country);
  const checklists = countryFilter
    ? allChecklists.filter((checklist) => checklist.country === countryFilter)
    : allChecklists;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12">
      <header>
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Global Student Cube
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Visa and immigration
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Track country-specific documents and mark each requirement complete as
          you go.
        </p>
      </header>

      <VisaRequirementForm defaultCountry={countryFilter} />

      {countries.length > 0 ? (
        <nav
          className="flex flex-wrap gap-2"
          aria-label="Country visa checklists"
        >
          <Link
            href="/visa"
            className={
              countryFilter
                ? "rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                : "rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            }
          >
            All countries
          </Link>
          {countries.map((country) => {
            const isActive = countryFilter === country;

            return (
              <Link
                key={country}
                href={`/visa?country=${encodeURIComponent(country)}`}
                className={
                  isActive
                    ? "rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                }
              >
                {country}
              </Link>
            );
          })}
        </nav>
      ) : null}

      {checklists.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {countryFilter
            ? "No documents for this country yet."
            : "No visa requirements yet. Add a country document above."}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {checklists.map((checklist) => (
            <section
              key={checklist.country}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  {checklist.country}
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {checklist.completedCount} of {checklist.items.length}{" "}
                  complete
                </p>
              </header>

              <ul className="mt-4 space-y-3">
                {checklist.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <form action={toggleVisaChecklistItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <button
                        type="submit"
                        aria-pressed={item.is_completed}
                        aria-label={
                          item.is_completed
                            ? `Mark ${item.document_name} incomplete`
                            : `Mark ${item.document_name} complete`
                        }
                        className={
                          item.is_completed
                            ? "mt-0.5 flex h-5 w-5 items-center justify-center rounded border border-zinc-900 bg-zinc-900 text-xs text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                            : "mt-0.5 h-5 w-5 rounded border border-zinc-400 bg-white dark:border-zinc-600 dark:bg-zinc-950"
                        }
                      >
                        {item.is_completed ? "✓" : null}
                      </button>
                    </form>
                    <div className="min-w-0">
                      <p
                        className={
                          item.is_completed
                            ? "font-medium text-zinc-500 line-through"
                            : "font-medium text-zinc-950 dark:text-zinc-50"
                        }
                      >
                        {item.document_name}
                      </p>
                      {item.notes ? (
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                          {item.notes}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
