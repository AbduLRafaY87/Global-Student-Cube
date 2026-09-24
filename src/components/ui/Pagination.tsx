import { Button } from "@/components/ui/Button";

interface PaginationProps {
  page: number;
  pageSize?: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  pageSize = 20,
  hasMore,
  onPageChange,
}: PaginationProps) {
  return (
    <nav
      className="flex items-center justify-between gap-3"
      aria-label="Pagination"
    >
      <p className="text-sm text-text-muted">
        Page {page} · {pageSize} per page
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="min-w-0"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          className="min-w-0"
          disabled={!hasMore}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
