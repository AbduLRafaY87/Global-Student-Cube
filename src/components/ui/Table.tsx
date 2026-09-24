import type { ReactNode } from "react";

interface TableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  cell: (row: T) => ReactNode;
}

interface TableProps<T> {
  caption: string;
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
}

export function Table<T>({
  caption,
  columns,
  rows,
  rowKey,
  empty,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="hidden w-full min-w-[32rem] border-collapse text-sm min-[600px]:table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border text-left text-text-muted">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-3 py-2 font-medium ${column.align === "right" ? "text-right" : "text-left"}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-6 text-text-muted" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-border">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-3 py-3 ${column.align === "right" ? "text-right" : "text-left"}`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <ul className="flex flex-col gap-3 min-[600px]:hidden">
        {rows.length === 0 ? (
          <li className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm text-text-muted">
            {empty}
          </li>
        ) : (
          rows.map((row) => (
            <li
              key={rowKey(row)}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
            >
              {columns.map((column) => (
                <div
                  key={column.key}
                  className="flex justify-between gap-3 py-1 text-sm"
                >
                  <span className="text-text-muted">{column.header}</span>
                  <span className="text-right text-text">{column.cell(row)}</span>
                </div>
              ))}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
