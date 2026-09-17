import { removeTestScore } from "@/app/(dashboard)/test-prep/actions";
import { TestScoreForm } from "@/components/forms/TestScoreForm";
import { createClient } from "@/lib/supabase/server";
import { TEST_TYPES, type TestScoreLog, type TestType } from "@/types";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Test prep",
};

interface SuperscoreSummary {
  test_type: TestType;
  overall: number | null;
  official: number | null;
}

function parseTestType(value: unknown): TestType | null {
  if (typeof value !== "string") {
    return null;
  }

  for (const type of TEST_TYPES) {
    if (type === value) {
      return type;
    }
  }

  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function toDateOnly(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    return "";
  }

  return value.slice(0, 10);
}

function toTestScoreLog(row: {
  id: unknown;
  student_id: unknown;
  test_type: unknown;
  score: unknown;
  test_date: unknown;
  is_official: unknown;
  created_at: unknown;
}): TestScoreLog | null {
  const testType = parseTestType(row.test_type);
  const score = toNumber(row.score);

  if (
    typeof row.id !== "string" ||
    typeof row.student_id !== "string" ||
    !testType ||
    score === null
  ) {
    return null;
  }

  return {
    id: row.id,
    student_id: row.student_id,
    test_type: testType,
    score,
    test_date: toDateOnly(row.test_date),
    is_official: row.is_official === true,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  };
}

function buildSuperscores(logs: TestScoreLog[]): SuperscoreSummary[] {
  const summaries: SuperscoreSummary[] = [];

  for (const testType of TEST_TYPES) {
    const matching = logs.filter((log) => log.test_type === testType);
    if (matching.length === 0) {
      continue;
    }

    let overall = matching[0].score;
    let official: number | null = null;

    for (const log of matching) {
      if (log.score > overall) {
        overall = log.score;
      }
      if (log.is_official && (official === null || log.score > official)) {
        official = log.score;
      }
    }

    summaries.push({
      test_type: testType,
      overall,
      official,
    });
  }

  return summaries;
}

export default async function TestPrepPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const editParam = params.edit;
  const editId = Array.isArray(editParam) ? editParam[0] : editParam;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const logs: TestScoreLog[] = [];

  if (user) {
    const { data } = await supabase
      .from("test_scores_log")
      .select(
        "id, student_id, test_type, score, test_date, is_official, created_at",
      )
      .eq("student_id", user.id)
      .order("test_date", { ascending: false });

    if (data) {
      for (const row of data) {
        const log = toTestScoreLog(row);
        if (log) {
          logs.push(log);
        }
      }
    }
  }

  const editing = logs.find((log) => log.id === editId);
  const superscores = buildSuperscores(logs);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12">
      <header>
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Global Student Cube
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Test score tracker
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Log practice and official scores. Superscores use the highest result
          per test type.
        </p>
      </header>

      <TestScoreForm score={editing ?? null} />

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Superscores
        </h2>
        {superscores.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            No scores yet. Log a result to see superscores.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {superscores.map((summary) => (
              <li
                key={summary.test_type}
                className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  {summary.test_type}
                </p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                  {summary.overall}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Official: {summary.official ?? "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <table className="min-w-full text-left text-sm">
          <caption className="sr-only">Test score history</caption>
          <thead className="border-b border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Test</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-6 text-zinc-600 dark:text-zinc-400"
                  colSpan={5}
                >
                  No scores logged yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="px-4 py-3 font-medium text-zinc-950 dark:text-zinc-50">
                    {log.test_type}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {log.score}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {log.test_date || "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {log.is_official ? "Official" : "Practice"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/test-prep?edit=${log.id}`}
                        className="text-xs font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
                      >
                        Edit
                      </Link>
                      <form action={removeTestScore}>
                        <input type="hidden" name="id" value={log.id} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
