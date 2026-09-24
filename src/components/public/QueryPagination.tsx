import Link from "next/link";

interface QueryPaginationProps {
  pathname: string;
  query: Record<string, string | undefined>;
  offset: number;
  pageSize: number;
  hasMore: boolean;
}

function href(
  pathname: string,
  query: Record<string, string | undefined>,
  offset: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value);
    }
  }
  params.set("offset", String(offset));
  return `${pathname}?${params.toString()}`;
}

export function QueryPagination({
  pathname,
  query,
  offset,
  pageSize,
  hasMore,
}: QueryPaginationProps) {
  const page = Math.floor(offset / pageSize) + 1;
  return (
    <nav className="flex items-center justify-between gap-3 text-sm" aria-label="Pagination">
      {offset > 0 ? (
        <Link
          className="text-primary underline-offset-2 hover:underline"
          href={href(pathname, query, Math.max(offset - pageSize, 0))}
        >
          Previous
        </Link>
      ) : (
        <span className="text-text-muted">Previous</span>
      )}
      <p className="text-text-muted">Page {page}</p>
      {hasMore ? (
        <Link
          className="text-primary underline-offset-2 hover:underline"
          href={href(pathname, query, offset + pageSize)}
        >
          Next
        </Link>
      ) : (
        <span className="text-text-muted">Next</span>
      )}
    </nav>
  );
}
