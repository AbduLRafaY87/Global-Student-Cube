import {
  clearNotification,
  markNotificationRead,
} from "@/app/(dashboard)/notifications/actions";
import type { SystemNotification } from "@/types";
import Link from "next/link";

interface NotificationCardProps {
  notification: SystemNotification;
}

function formatTimestamp(value: string): string {
  if (value.length >= 16) {
    return `${value.slice(0, 10)} ${value.slice(11, 16)}`;
  }

  return value || "—";
}

function isInternalLink(link: string): boolean {
  return link.startsWith("/");
}

export function NotificationCard({ notification }: NotificationCardProps) {
  const link = notification.link.trim();

  return (
    <article
      className={
        notification.is_read
          ? "flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          : "flex flex-col rounded-2xl border border-zinc-900 bg-white p-6 shadow-sm dark:border-zinc-100 dark:bg-zinc-950"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          {formatTimestamp(notification.created_at)}
        </p>
        {notification.is_read ? null : (
          <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium tracking-wide text-white uppercase dark:bg-zinc-100 dark:text-zinc-900">
            Unread
          </span>
        )}
      </div>
      <h2 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        {notification.title}
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {notification.message}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {link ? (
          isInternalLink(link) ? (
            <Link
              href={link}
              className="text-sm font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
            >
              Open
            </Link>
          ) : (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
            >
              Open
            </a>
          )
        ) : null}
        {notification.is_read ? null : (
          <form action={markNotificationRead}>
            <input type="hidden" name="id" value={notification.id} />
            <button
              type="submit"
              className="text-sm font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
            >
              Mark as read
            </button>
          </form>
        )}
        <form action={clearNotification}>
          <input type="hidden" name="id" value={notification.id} />
          <button
            type="submit"
            className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
          >
            Clear
          </button>
        </form>
      </div>
    </article>
  );
}
