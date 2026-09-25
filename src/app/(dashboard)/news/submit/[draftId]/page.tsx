import { CounselorNewsForm } from "@/components/news/CounselorNewsForm";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { loadNewsArticle } from "@/server/modules/news/load";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit news draft" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function CounselorNewsDraftPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;
  const loaded = await loadNewsArticle(draftId);
  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {loaded.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  if (loaded.data.unavailable === true) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <EmptyState title="Unavailable" message="That draft is not available." />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold text-text">Edit draft</h1>
      <CounselorNewsForm
        id={draftId}
        initial={{
          title: asString(loaded.data.title),
          summary: asString(loaded.data.summary),
          topic: asString(loaded.data.topic),
          body: asString(loaded.data.body),
          sourceUrl: asString(loaded.data.sourceUrl),
          captions: asString(loaded.data.captions),
          rightsDeclaration: "",
          state: asString(loaded.data.state),
          revisionReason: "",
        }}
      />
    </div>
  );
}
