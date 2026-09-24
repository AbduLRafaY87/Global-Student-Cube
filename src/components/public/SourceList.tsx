import { formatVerified, NOT_PROVIDED } from "@/domain/catalog/display";
import type { PublicSourceFact } from "@/server/modules/catalog/public";

interface SourceListProps {
  sources: PublicSourceFact[];
}

export function SourceList({ sources }: SourceListProps) {
  if (sources.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        Source, last verified and next review: {NOT_PROVIDED}.
      </p>
    );
  }

  return (
    <ul className="grid gap-3">
      {sources.map((source) => (
        <li
          key={`${source.entity_id}-${source.field_path}-${source.canonical_url}`}
          className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm text-text"
        >
          <p className="font-medium">{source.field_path}</p>
          <p className="mt-1 break-all">
            <a
              className="text-primary underline-offset-2 hover:underline"
              href={source.canonical_url}
              rel="noreferrer"
              target="_blank"
            >
              {source.canonical_url}
            </a>
          </p>
          <p className="mt-1 text-text-muted">
            {source.source_type}. Retrieved {new Date(source.retrieved_at).toLocaleDateString()}.{" "}
            {formatVerified(source.verified_at, source.next_review_at)}
          </p>
        </li>
      ))}
    </ul>
  );
}
