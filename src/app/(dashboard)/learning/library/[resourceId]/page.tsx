import { SaveResourceButton } from "@/components/learning/SaveResourceButton";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { loadLearningResource } from "@/server/modules/learning/load";
import { isUuid } from "@/server/modules/admin/http";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Resource" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "Not provided";
}

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ resourceId: string }>;
}) {
  const { resourceId } = await params;
  if (!isUuid(resourceId)) {
    notFound();
  }
  const loaded = await loadLearningResource(resourceId);
  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {loaded.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const item = loaded.data;
  if (!item.id) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <EmptyState title="Resource not found" message="Unpublished files stay unavailable." />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold text-text">{asString(item.title)}</h1>
      <p className="text-sm text-text-muted">
        {asString(item.author)} · version {typeof item.version === "number" ? item.version : asString(item.version)} · {asString(item.libraryType)} ·{" "}
        {asString(item.fileFormat)} · {asString(item.fileSizeLabel)}
      </p>
      <p className="text-sm text-text">{asString(item.summary)}</p>
      <pre className="whitespace-pre-wrap rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm text-text">
        {asString(item.body)}
      </pre>
      <a
        className="inline-flex h-12 items-center text-primary underline-offset-2 hover:underline"
        href={`/api/v1/learning/library/${resourceId}/download`}
      >
        Download resource
      </a>
      <SaveResourceButton id={resourceId} />
      <Link className="text-primary underline-offset-2 hover:underline" href="/learning">
        Related lessons
      </Link>
    </div>
  );
}
