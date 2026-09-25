import {
  clearAlerts,
  markAllNotificationsRead,
} from "@/app/(dashboard)/notifications/actions";
import { NotificationCard } from "@/components/NotificationCard";
import { createClient } from "@/lib/supabase/server";
import type { SystemNotification } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications",
};

function toSystemNotification(row: {
  id: unknown;
  user_id: unknown;
  title: unknown;
  message: unknown;
  is_read: unknown;
  link: unknown;
  created_at: unknown;
}): SystemNotification | null {
  if (
    typeof row.id !== "string" ||
    typeof row.user_id !== "string" ||
    typeof row.title !== "string" ||
    typeof row.message !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    message: row.message,
    is_read: row.is_read === true,
    link: typeof row.link === "string" ? row.link : "",
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  };
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const notifications: SystemNotification[] = [];

  if (user) {
    const { data } = await supabase
      .from("notifications")
      .select("id, user_id, title, message, is_read, link, created_at")
      .eq("user_id", user.id)
      .order("is_read", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      for (const row of data) {
        const notification = toSystemNotification(row);
        if (notification) {
          notifications.push(notification);
        }
      }
    }
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read,
  ).length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12">
      <header>
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Global Student Cube
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Notifications
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Review alerts, mark them as read, or clear them from your inbox.
        </p>
      </header>

      {notifications.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No notifications yet.
        </p>
      ) : (
        <>
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {unreadCount} unread
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {unreadCount > 0 ? (
                <form action={markAllNotificationsRead}>
                  <button
                    type="submit"
                    className="text-sm font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
                  >
                    Mark all as read
                  </button>
                </form>
              ) : null}
              <form action={clearAlerts}>
                <button
                  type="submit"
                  className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
                >
                  Clear all alerts
                </button>
              </form>
            </div>
          </section>

          <ul className="flex flex-col gap-4">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <NotificationCard notification={notification} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
