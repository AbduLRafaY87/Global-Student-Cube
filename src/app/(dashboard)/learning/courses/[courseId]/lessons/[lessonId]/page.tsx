import { LessonJump } from "@/components/learning/LessonJump";
import { LessonPlayer } from "@/components/learning/LessonPlayer";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { loadLearningCourse } from "@/server/modules/learning/load";
import { isUuid } from "@/server/modules/admin/http";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Lesson" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asCount(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  if (!isUuid(courseId) || !isUuid(lessonId)) {
    notFound();
  }
  const loaded = await loadLearningCourse(courseId);
  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        {loaded.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const lessons = Array.isArray(loaded.data.lessons) ? loaded.data.lessons : [];
  const index = lessons.findIndex((row) => asString((row as Record<string, unknown>).id) === lessonId);
  const lesson = index >= 0 ? (lessons[index] as Record<string, unknown>) : null;
  if (!lesson) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <EmptyState title="Lesson not found" message="This lesson is not in the published course." />
      </div>
    );
  }
  const progress =
    loaded.data.progress && typeof loaded.data.progress === "object"
      ? (loaded.data.progress as Record<string, unknown>)
      : {};
  const completed = Array.isArray(progress.completedLessonIds)
    ? progress.completedLessonIds.map((item) => asString(item))
    : [];
  const prerequisite = asString(lesson.prerequisiteId);
  const locked = Boolean(prerequisite) && !completed.includes(prerequisite);
  const next = lessons[index + 1] as Record<string, unknown> | undefined;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 min-[900px]:flex-row">
      <div className="min-w-0 flex-1 space-y-4">
        <p className="text-sm text-text-muted">
          {asString(loaded.data.title)} · {asString(loaded.data.author)}
        </p>
        <LessonPlayer
          courseId={courseId}
          lessonId={lessonId}
          title={asString(lesson.title)}
          body={asString(lesson.body)}
          format={asString(lesson.format)}
          mediaUrl={asString(lesson.mediaUrl)}
          mediaState={asString(lesson.mediaState)}
          captions={asString(lesson.captions)}
          transcript={asString(lesson.transcript)}
          resumeSeconds={asCount(progress.resumePositionSeconds)}
          nextHref={
            next ? `/learning/courses/${courseId}/lessons/${asString(next.id)}` : null
          }
          locked={locked}
        />
        <Link
          className="text-primary underline-offset-2 hover:underline"
          href="/learning/library"
        >
          Open resource library
        </Link>
      </div>
      <nav className="w-full min-[900px]:w-64">
        <LessonJump
          courseId={courseId}
          lessonId={lessonId}
          lessons={lessons.map((row) => {
            const item = row as Record<string, unknown>;
            return { id: asString(item.id), title: asString(item.title) };
          })}
        />
        <ul className="hidden space-y-2 text-sm min-[900px]:block">
          {lessons.map((row) => {
            const item = row as Record<string, unknown>;
            return (
              <li key={asString(item.id)}>
                <Link
                  className="text-primary underline-offset-2 hover:underline"
                  href={`/learning/courses/${courseId}/lessons/${asString(item.id)}`}
                >
                  {asString(item.title)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
