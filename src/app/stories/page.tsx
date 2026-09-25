import { PublicChrome } from "@/components/public/PublicChrome";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { SHARED_WITH_PERMISSION, STORY_UNAVAILABLE_COPY } from "@/domain/news/news";
import { loadPublicStories, loadPublicStory } from "@/server/modules/news/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Success stories",
  description: "Reviewed stories shared with permission. Withdrawn stories leave this wall.",
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function StoriesWallPage({
  searchParams,
}: {
  searchParams: Promise<{ story?: string; country?: string; topic?: string; q?: string }>;
}) {
  const filters = await searchParams;
  const storyId = filters.story?.trim() ?? "";
  const country = filters.country?.trim().toUpperCase() ?? "";
  const topic = filters.topic?.trim() ?? "";
  const search = filters.q?.trim() ?? "";
  const list = await loadPublicStories(country, topic, search);
  const detail = storyId ? await loadPublicStory(storyId) : null;

  return (
    <PublicChrome>
      <h1 className="text-2xl font-semibold text-text">Success stories</h1>
      <p className="mt-2 text-sm text-text-muted">{SHARED_WITH_PERMISSION}</p>
      <form className="mt-4 grid gap-3 min-[768px]:grid-cols-3" method="get" action="/stories">
        <label className="text-sm text-text">
          Country
          <input
            name="country"
            defaultValue={country}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          />
        </label>
        <label className="text-sm text-text">
          Topic
          <input
            name="topic"
            defaultValue={topic}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          />
        </label>
        <label className="text-sm text-text">
          Search
          <input
            name="q"
            defaultValue={search}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          />
        </label>
        <button
          type="submit"
          className="h-12 self-end rounded-[var(--radius-control)] border border-control-border px-4 text-sm"
        >
          Apply filters
        </button>
      </form>
      {detail && detail.ok && detail.data.unavailable === true ? (
        <EmptyState title="Unavailable" message={asString(detail.data.message) || STORY_UNAVAILABLE_COPY} />
      ) : null}
      {detail && detail.ok && detail.data.unavailable !== true ? (
        <article className="mt-6 max-w-[720px] rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <p className="text-sm text-text-muted">
            {detail.data.spotlight === true ? "Spotlight · " : ""}
            {detail.data.publishedAt
              ? new Date(asString(detail.data.publishedAt)).toLocaleDateString()
              : ""}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-text">{asString(detail.data.title)}</h2>
          {asString(detail.data.attribution) ? (
            <p className="mt-2 text-sm text-text-muted">{asString(detail.data.attribution)}</p>
          ) : null}
          <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-text">
            {asString(detail.data.body)}
          </p>
          <Link className="mt-4 inline-flex text-primary underline-offset-2 hover:underline" href="/stories">
            Back to stories
          </Link>
        </article>
      ) : null}
      {!list.ok ? (
        <ErrorState />
      ) : !Array.isArray(list.data.items) || list.data.items.length === 0 ? (
        <EmptyState
          title="No published stories"
          message="When a reviewed story is published with the subject’s consent, it will appear here. No sample achievements are invented."
        />
      ) : (
        <ul className="mt-6 grid gap-3 min-[768px]:grid-cols-2 min-[1440px]:grid-cols-3">
          {(list.data.items as unknown[]).map((row) => {
            const item = row as Record<string, unknown>;
            const id = asString(item.id);
            return (
              <li
                key={id}
                className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
              >
                {item.spotlight === true ? (
                  <p className="text-sm text-text-muted">Spotlight</p>
                ) : null}
                <h2 className="text-lg font-semibold text-text">{asString(item.title)}</h2>
                <p className="mt-2 text-sm text-text">{asString(item.excerpt)}</p>
                {asString(item.attribution) ? (
                  <p className="mt-2 text-sm text-text-muted">{asString(item.attribution)}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    className="inline-flex h-12 items-center text-primary underline-offset-2 hover:underline"
                    href={`/stories?story=${id}`}
                  >
                    Read story
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-8 text-sm text-text">
        <Link className="text-primary underline-offset-2 hover:underline" href="/stories/submit">
          Share your journey
        </Link>
      </p>
    </PublicChrome>
  );
}
