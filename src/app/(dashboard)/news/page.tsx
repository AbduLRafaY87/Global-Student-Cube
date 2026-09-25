import { NewsActions } from "@/components/news/NewsActions";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import {
  NEWS_TOPIC_LABELS,
  NEWS_TOPICS,
  NEWS_TABS,
  isNewsTab,
  isNewsTopic,
} from "@/domain/news/news";
import { loadNewsFeed } from "@/server/modules/news/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "News" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function NewsFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; topic?: string; q?: string; page?: string }>;
}) {
  const filters = await searchParams;
  const tab = filters.tab && isNewsTab(filters.tab) ? filters.tab : "all";
  const topic = filters.topic && isNewsTopic(filters.topic) ? filters.topic : "";
  const search = filters.q?.trim() ?? "";
  const page = Number.parseInt(filters.page ?? "1", 10) || 1;
  const loaded = await loadNewsFeed(tab, topic, search, page);
  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        {loaded.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const items = Array.isArray(loaded.data.items) ? loaded.data.items : [];
  const followed = Array.isArray(loaded.data.followedTopics)
    ? loaded.data.followedTopics.map((item) => asString(item)).filter(Boolean)
    : [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">News</h1>
        <p className="mt-2 text-sm text-text-muted">
          Reviewed updates. Following a scholarship topic does not enroll WhatsApp
          notifications.
        </p>
      </header>
      <nav aria-label="News views" className="flex flex-wrap gap-3 text-sm">
        {NEWS_TABS.map((item) => (
          <Link
            key={item}
            className="text-primary underline-offset-2 hover:underline"
            href={`/news?tab=${item}${topic ? `&topic=${topic}` : ""}`}
          >
            {item === "all" ? "All" : item === "following" ? "Following" : "Saved"}
          </Link>
        ))}
        <Link
          className="text-primary underline-offset-2 hover:underline"
          href="/news?topic=new_scholarships"
        >
          Scholarship alerts
        </Link>
        <Link
          className="text-primary underline-offset-2 hover:underline"
          href="/stories"
        >
          Success stories
        </Link>
      </nav>
      <form className="grid gap-3 min-[600px]:grid-cols-3" method="get" action="/news">
        <input type="hidden" name="tab" value={tab} />
        <label className="text-sm text-text">
          Topic
          <select
            name="topic"
            defaultValue={topic}
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-control-border bg-surface px-3"
          >
            <option value="">All topics</option>
            {NEWS_TOPICS.map((item) => (
              <option key={item} value={item}>
                {NEWS_TOPIC_LABELS[item]}
              </option>
            ))}
          </select>
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
      {tab === "following" && followed.length === 0 ? (
        <EmptyState
          title="No followed topics"
          message="Choose a topic below a card to build your following filter."
        />
      ) : null}
      {items.length === 0 ? (
        <EmptyState
          title="No updates"
          message="No published updates match these filters. Unpublished items stay hidden."
        />
      ) : (
        <ul className="grid gap-3">
          {items.map((row) => {
            const item = row as Record<string, unknown>;
            const id = asString(item.id);
            return (
              <li
                key={id}
                className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
              >
                <p className="text-sm text-text-muted">
                  {NEWS_TOPIC_LABELS[item.topic as keyof typeof NEWS_TOPIC_LABELS] ??
                    asString(item.topic)}
                  {item.publishedAt
                    ? ` · ${new Date(asString(item.publishedAt)).toLocaleDateString()}`
                    : ""}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-text">{asString(item.title)}</h2>
                <p className="mt-2 text-sm text-text">{asString(item.summary)}</p>
                <Link
                  className="mt-3 inline-flex h-12 items-center text-primary underline-offset-2 hover:underline"
                  href={`/news/${id}`}
                >
                  Read update
                </Link>
                <div className="mt-3">
                  <NewsActions
                    id={id}
                    topic={asString(item.topic)}
                    shareUrl={`/news/${id}`}
                    saved={false}
                    liked={false}
                    following={followed.includes(asString(item.topic))}
                    signedIn
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
