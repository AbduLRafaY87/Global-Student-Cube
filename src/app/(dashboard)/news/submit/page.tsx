import { CounselorNewsForm } from "@/components/news/CounselorNewsForm";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { loadCounselorNews } from "@/server/modules/news/load";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Submit news" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function CounselorNewsSubmitPage() {
  const loaded = await loadCounselorNews();
  if (!loaded.ok) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {loaded.forbidden ? <ForbiddenState /> : <ErrorState />}
      </div>
    );
  }
  const items = Array.isArray(loaded.data.items) ? loaded.data.items : [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Submit an update</h1>
        <p className="mt-2 text-sm text-text-muted">
          Counselor drafts stay pending until a publisher reviews them. University-origin
          material uses the verified editorial workflow.
        </p>
      </header>
      <CounselorNewsForm
        initial={{
          title: "",
          summary: "",
          topic: "new_scholarships",
          body: "",
          sourceUrl: "",
          captions: "",
          rightsDeclaration: "",
          state: "draft",
          revisionReason: "",
        }}
      />
      <section>
        <h2 className="text-lg font-semibold text-text">Your drafts</h2>
        {items.length === 0 ? (
          <EmptyState title="No drafts" message="Save a draft to see review history here." />
        ) : (
          <ul className="mt-3 grid gap-3">
            {items.map((row) => {
              const item = row as Record<string, unknown>;
              const id = asString(item.id);
              return (
                <li key={id}>
                  <Link
                    className="block rounded-[var(--radius-card)] border border-border bg-surface p-4"
                    href={`/news/submit/${id}`}
                  >
                    <p className="font-medium text-text">{asString(item.title)}</p>
                    <p className="mt-1 text-sm text-text-muted">{asString(item.state)}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
