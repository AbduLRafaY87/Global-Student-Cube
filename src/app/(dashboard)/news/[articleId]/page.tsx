import { NewsActions } from "@/components/news/NewsActions";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { DEADLINE_DISCLAIMER, NEWS_TOPIC_LABELS, UNAVAILABLE_COPY } from "@/domain/news/news";
import { loadNewsArticle } from "@/server/modules/news/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "News detail" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  const loaded = await loadNewsArticle(articleId);
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
        <EmptyState title="Unavailable" message={asString(loaded.data.message) || UNAVAILABLE_COPY} />
        <Link className="mt-4 inline-flex text-primary underline-offset-2 hover:underline" href="/news">
          Back to feed
        </Link>
      </div>
    );
  }

  const topic = asString(loaded.data.topic);
  const universityId = asString(loaded.data.relatedUniversityId);
  const scholarshipId = asString(loaded.data.relatedScholarshipId);

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <p className="text-sm text-text-muted">
        {NEWS_TOPIC_LABELS[topic as keyof typeof NEWS_TOPIC_LABELS] ?? topic}
        {loaded.data.publishedAt
          ? ` · ${new Date(asString(loaded.data.publishedAt)).toLocaleDateString()}`
          : ""}
      </p>
      <h1 className="text-2xl font-semibold text-text">{asString(loaded.data.title)}</h1>
      <p className="text-sm text-text-muted">
        {asString(loaded.data.author)}
        {asString(loaded.data.sourceUrl)
          ? ` · Source ${asString(loaded.data.sourceUrl)}`
          : ""}
      </p>
      <p className="text-sm text-text-muted">{DEADLINE_DISCLAIMER}</p>
      <div className="max-w-[720px] whitespace-pre-wrap text-base leading-7 text-text">
        {asString(loaded.data.body)}
      </div>
      {asString(loaded.data.captions) ? (
        <p className="text-sm text-text-muted">Captions: {asString(loaded.data.captions)}</p>
      ) : null}
      <div className="flex flex-wrap gap-3 text-sm">
        {universityId ? (
          <Link
            className="text-primary underline-offset-2 hover:underline"
            href={`/universities/${universityId}`}
          >
            Open related university
          </Link>
        ) : null}
        {scholarshipId ? (
          <Link
            className="text-primary underline-offset-2 hover:underline"
            href={`/scholarships/${scholarshipId}`}
          >
            Open related scholarship
          </Link>
        ) : null}
      </div>
      <NewsActions
        id={asString(loaded.data.id)}
        topic={topic}
        shareUrl={asString(loaded.data.shareUrl) || `/news/${articleId}`}
        saved={loaded.data.saved === true}
        liked={loaded.data.liked === true}
        following={loaded.data.following === true}
        signedIn
      />
      <Link className="text-primary underline-offset-2 hover:underline" href="/news">
        Back to feed
      </Link>
    </article>
  );
}
