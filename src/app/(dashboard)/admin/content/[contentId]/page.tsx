import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { ContentEditor } from "@/app/(dashboard)/admin/content/ContentEditor";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/States";
import { resolveRequestContext } from "@/server/context";
import { isUuid } from "@/server/modules/admin/http";
import { loadAdminContentItem } from "@/server/modules/learning/load";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit content" };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function AdminContentItemPage({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const { contentId } = await params;
  if (!isUuid(contentId)) {
    notFound();
  }
  const context = await resolveRequestContext();
  const loaded = await loadAdminContentItem(contentId);

  return (
    <AdminChrome
      title="Edit content"
      description="Phone preview sits below the fields. Media processing blocks publication."
    >
      {!loaded.ok ? (
        loaded.forbidden ? (
          <ForbiddenState />
        ) : (
          <ErrorState />
        )
      ) : !loaded.data.id ? (
        <EmptyState title="Not found" message="This item is not available." />
      ) : (
        <div className="grid gap-6 min-[1440px]:grid-cols-[minmax(0,1fr)_20rem]">
          <ContentEditor
            id={contentId}
            canPublish={context.role === "admin"}
            initial={{
              kind: asString(loaded.data.kind) || "course",
              title: asString(loaded.data.title),
              topic: asString(loaded.data.topic),
              category: asString(loaded.data.category),
              audience: asString(loaded.data.audience) || "overall",
              summary: asString(loaded.data.summary),
              body: asString(loaded.data.body),
              author: asString(loaded.data.authorAttribution),
              captions: asString(loaded.data.captions),
              transcript: asString(loaded.data.transcript),
              mediaUrl: asString(loaded.data.mediaUrl),
              libraryType: asString(loaded.data.libraryType),
              eventInformation: asString(loaded.data.eventInformation),
              consentEvidence: asString(loaded.data.consentEvidence),
              namedConsent: loaded.data.namedPeopleConsent === true,
              universitySupplied: loaded.data.universitySupplied === true,
              provenanceVerified: loaded.data.provenanceVerified === true,
              state: asString(loaded.data.publicationState),
            }}
          />
          <aside className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
            <h2 className="text-sm font-medium text-text">Phone preview</h2>
            <p className="mt-2 text-lg font-semibold text-text">{asString(loaded.data.title)}</p>
            <p className="mt-2 text-sm text-text">{asString(loaded.data.summary)}</p>
          </aside>
        </div>
      )}
    </AdminChrome>
  );
}
