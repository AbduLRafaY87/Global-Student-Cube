import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { loadLearningCourse } from "@/server/modules/learning/load";
import { isUuid } from "@/server/modules/admin/http";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Course" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asCount(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  if (!isUuid(courseId)) {
    notFound();
  }
  const loaded = await loadLearningCourse(courseId);
  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        {loaded.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const lessons = Array.isArray(loaded.data.lessons) ? loaded.data.lessons : [];
  const first = lessons[0] as Record<string, unknown> | undefined;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">{asString(loaded.data.title)}</h1>
        <p className="mt-2 text-sm text-text-muted">
          {asString(loaded.data.author)} · {asCount(loaded.data.durationMinutes)} minutes. Learning
          completion does not claim an accredited award.
        </p>
      </header>
      <p className="text-sm text-text">{asString(loaded.data.summary)}</p>
      {loaded.data.updatedContentAvailable === true ? (
        <p className="text-sm text-warning" role="status">
          Updated content available. New required lessons are not a failed assessment.
        </p>
      ) : null}
      {first ? (
        <Link
          className="inline-flex h-12 items-center text-primary underline-offset-2 hover:underline"
          href={`/learning/courses/${courseId}/lessons/${asString(first.id)}`}
        >
          Start course
        </Link>
      ) : (
        <EmptyState title="No lessons yet" message="This course has no published lessons." />
      )}
      <ol className="space-y-2">
        {lessons.map((row) => {
          const item = row as Record<string, unknown>;
          return (
            <li key={asString(item.id)}>
              <Link
                className="text-primary underline-offset-2 hover:underline"
                href={`/learning/courses/${courseId}/lessons/${asString(item.id)}`}
              >
                {asCount(item.sortOrder)}. {asString(item.title)}
                {item.completed === true ? " · complete" : ""}
              </Link>
            </li>
          );
        })}
      </ol>
      <Link className="text-primary underline-offset-2 hover:underline" href="/learning">
        Back to learning
      </Link>
    </div>
  );
}
