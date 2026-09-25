"use client";

import { useRouter } from "next/navigation";

interface LessonJumpProps {
  courseId: string;
  lessonId: string;
  lessons: Array<{ id: string; title: string }>;
}

export function LessonJump({ courseId, lessonId, lessons }: LessonJumpProps) {
  const router = useRouter();
  return (
    <label className="block text-sm text-text min-[900px]:hidden" htmlFor="lesson-jump">
      Lessons
      <select
        id="lesson-jump"
        className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
        value={lessonId}
        onChange={(event) =>
          router.push(`/learning/courses/${courseId}/lessons/${event.target.value}`)
        }
      >
        {lessons.map((lesson) => (
          <option key={lesson.id} value={lesson.id}>
            {lesson.title}
          </option>
        ))}
      </select>
    </label>
  );
}
