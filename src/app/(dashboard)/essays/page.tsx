import { deleteEssay } from "@/app/(dashboard)/essays/actions";
import { enforceParkedRoute } from "@/server/legacy/parked";
import { EssayForm } from "@/components/forms/EssayForm";
import { createClient } from "@/lib/supabase/server";
import {
  ESSAY_STATUSES,
  type Essay,
  type EssayStatus,
  type University,
} from "@/types";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Essays",
};

interface EssayRow extends Essay {
  university_name: string | null;
}

function parseEssayStatus(value: unknown): EssayStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  for (const status of ESSAY_STATUSES) {
    if (status === value) {
      return status;
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

function toUniversityOption(row: {
  id: unknown;
  name: unknown;
  country: unknown;
}): Pick<University, "id" | "name" | "country"> | null {
  if (typeof row.id !== "string" || typeof row.name !== "string") {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    country: typeof row.country === "string" ? row.country : "",
  };
}

function countWords(content: string): number {
  const trimmed = content.trim();
  if (trimmed === "") {
    return 0;
  }

  return trimmed.split(/\s+/).filter((word) => word.length > 0).length;
}

function toEssayRow(row: {
  id: unknown;
  student_id: unknown;
  university_id: unknown;
  title: unknown;
  prompt: unknown;
  content: unknown;
  word_limit: unknown;
  status: unknown;
  created_at: unknown;
  updated_at: unknown;
  universities: unknown;
}): EssayRow | null {
  const status = parseEssayStatus(row.status);
  const wordLimit = toNumber(row.word_limit);

  if (
    typeof row.id !== "string" ||
    typeof row.student_id !== "string" ||
    typeof row.title !== "string" ||
    typeof row.prompt !== "string" ||
    typeof row.content !== "string" ||
    wordLimit === null ||
    !status
  ) {
    return null;
  }

  let universityName: string | null = null;
  if (
    typeof row.universities === "object" &&
    row.universities !== null &&
    !Array.isArray(row.universities) &&
    "name" in row.universities &&
    typeof row.universities.name === "string"
  ) {
    universityName = row.universities.name;
  }

  return {
    id: row.id,
    student_id: row.student_id,
    university_id: typeof row.university_id === "string" ? row.university_id : null,
    title: row.title,
    prompt: row.prompt,
    content: row.content,
    word_limit: wordLimit,
    status,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
    university_name: universityName,
  };
}

export default async function EssaysPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  enforceParkedRoute();
  const params = await searchParams;
  const editParam = params.edit;
  const editId = Array.isArray(editParam) ? editParam[0] : editParam;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const universities: Pick<University, "id" | "name" | "country">[] = [];
  const essays: EssayRow[] = [];

  const { data: universityRows } = await supabase
    .from("universities")
    .select("id, name, country")
    .order("name", { ascending: true });

  if (universityRows) {
    for (const row of universityRows) {
      const university = toUniversityOption(row);
      if (university) {
        universities.push(university);
      }
    }
  }

  if (user) {
    const { data: essayRows } = await supabase
      .from("essays")
      .select(
        "id, student_id, university_id, title, prompt, content, word_limit, status, created_at, updated_at, universities(name)",
      )
      .eq("student_id", user.id)
      .order("updated_at", { ascending: false });

    if (essayRows) {
      for (const row of essayRows) {
        const essay = toEssayRow(row);
        if (essay) {
          essays.push(essay);
        }
      }
    }
  }

  const editing = essays.find((essay) => essay.id === editId);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12">
      <header>
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Global Student Cube
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Essay manager
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Draft essays, track status, and stay within each prompt&apos;s word
          limit.
        </p>
      </header>

      <EssayForm universities={universities} essay={editing ?? null} />

      {essays.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No essays yet. Create one above.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {essays.map((essay) => {
            const wordCount = countWords(essay.content);
            const isOverLimit = wordCount > essay.word_limit;

            return (
              <li
                key={essay.id}
                className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  {essay.status}
                  {essay.university_name ? ` · ${essay.university_name}` : ""}
                </p>
                <h2 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  {essay.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {essay.prompt}
                </p>
                <p
                  className={
                    isOverLimit
                      ? "mt-4 text-sm font-medium text-red-600 dark:text-red-400"
                      : "mt-4 text-sm text-zinc-600 dark:text-zinc-400"
                  }
                >
                  {wordCount} / {essay.word_limit} words
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/essays?edit=${essay.id}`}
                    className="text-sm font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
                  >
                    Edit
                  </Link>
                  <form action={deleteEssay}>
                    <input type="hidden" name="id" value={essay.id} />
                    <button
                      type="submit"
                      className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
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
    </div>
  );
}
