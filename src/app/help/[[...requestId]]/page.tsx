import { HelpForm } from "@/components/privacy/HelpForm";
import { PublicChrome } from "@/components/public/PublicChrome";
import { EmptyState } from "@/components/ui/States";
import { createClient } from "@/lib/supabase/server";
import { loadHelpWorkspace } from "@/server/modules/privacy/load";
import { Flag, LifeBuoy } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Help and safety" };

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

interface PageProps {
  params: Promise<{ requestId?: string[] }>;
}

export default async function HelpPage({ params }: PageProps) {
  const { requestId } = await params;
  const selectedId = requestId?.[0] ?? null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const workspace = user ? await loadHelpWorkspace(selectedId) : null;
  const items =
    workspace?.ok && Array.isArray(workspace.data.list.items)
      ? workspace.data.list.items
      : [];
  const selected =
    workspace?.ok && workspace.data.selected
      ? workspace.data.selected
      : null;

  return (
    <PublicChrome>
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 py-8">
        <header>
          <LifeBuoy className="size-8 text-primary" aria-hidden />
          <h1 className="mt-2 text-2xl font-semibold text-text">Help</h1>
          <p className="mt-2 text-sm text-text-muted">
            Search the FAQs or send a request. Protected safety complaints are
            visible only to the designated safety admin.
          </p>
        </header>
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-text">FAQs</h2>
          <ul className="mt-3 space-y-3 text-sm text-text">
            <li>Export and deletion are requested from Privacy. Export excludes other people’s private notes.</li>
            <li>Phone verification is not login MFA.</li>
            <li>A lawful hold can delay deletion without promising immediate erasure.</li>
          </ul>
          <Link
            className="mt-3 inline-flex text-sm text-primary underline-offset-2 hover:underline"
            href="/tour"
          >
            Take app tour
          </Link>
        </section>
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-text">
            <Flag className="size-5" aria-hidden />
            Contact support
          </h2>
          <div className="mt-4">
            <HelpForm signedIn={Boolean(user)} />
          </div>
        </section>
        {user ? (
          <section>
            <h2 className="text-lg font-semibold text-text">Your requests</h2>
            {items.length === 0 ? (
              <EmptyState title="No requests" message="Submitted requests appear here with a reference." />
            ) : (
              <ul className="mt-3 space-y-2">
                {items.map((item) => {
                  const row = item as Record<string, unknown>;
                  return (
                    <li key={asText(row.id)}>
                      <Link
                        className="text-sm text-primary underline-offset-2 hover:underline"
                        href={`/help/${asText(row.id)}`}
                      >
                        {asText(row.reference)} · {asText(row.category)} · {asText(row.state)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {selected ? (
              <article className="mt-4 rounded-[var(--radius-card)] border border-border bg-surface p-4">
                <h3 className="text-base font-semibold text-text">
                  {asText(selected.reference)}
                </h3>
                <p className="mt-2 text-sm text-text-muted">
                  {asText(selected.category)} · {asText(selected.state)}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm text-text">
                  {asText(selected.description) || "Not provided"}
                </p>
              </article>
            ) : null}
          </section>
        ) : null}
      </div>
    </PublicChrome>
  );
}
