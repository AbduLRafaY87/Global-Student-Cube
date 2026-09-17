import { ChatWindow } from "@/components/forms/ChatWindow";
import { createClient } from "@/lib/supabase/server";
import {
  USER_ROLES,
  type CounselorAssignment,
  type Message,
  type UserRole,
} from "@/types";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages",
};

interface ContactRecord {
  id: string;
  name: string;
}

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parseUserRole(value: unknown): UserRole | null {
  if (typeof value !== "string") {
    return null;
  }

  for (const role of USER_ROLES) {
    if (role === value) {
      return role;
    }
  }

  return null;
}

function toCounselorAssignment(row: {
  id: unknown;
  student_id: unknown;
  counselor_id: unknown;
  assigned_at: unknown;
}): CounselorAssignment | null {
  if (
    typeof row.id !== "string" ||
    typeof row.student_id !== "string" ||
    typeof row.counselor_id !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    student_id: row.student_id,
    counselor_id: row.counselor_id,
    assigned_at: typeof row.assigned_at === "string" ? row.assigned_at : "",
  };
}

function toContact(
  row: {
    id: unknown;
    first_name: unknown;
    last_name: unknown;
  },
): ContactRecord | null {
  if (
    typeof row.id !== "string" ||
    typeof row.first_name !== "string" ||
    typeof row.last_name !== "string"
  ) {
    return null;
  }

  const name = `${row.first_name} ${row.last_name}`.trim();

  return {
    id: row.id,
    name: name === "" ? "Unnamed profile" : name,
  };
}

function toMessage(row: {
  id: unknown;
  sender_id: unknown;
  receiver_id: unknown;
  content: unknown;
  read: unknown;
  created_at: unknown;
}): Message | null {
  if (
    typeof row.id !== "string" ||
    typeof row.sender_id !== "string" ||
    typeof row.receiver_id !== "string" ||
    typeof row.content !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    sender_id: row.sender_id,
    receiver_id: row.receiver_id,
    content: row.content,
    read: row.read === true,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  };
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedWith = firstParam(params.with);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isCounselor = false;
  const assignments: CounselorAssignment[] = [];
  const contacts: ContactRecord[] = [];
  const messages: Message[] = [];

  if (user) {
    const { data: ownProfile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    isCounselor = parseUserRole(ownProfile?.role) === "counselor";

    const assignmentQuery = supabase
      .from("counselor_assignments")
      .select("id, student_id, counselor_id, assigned_at")
      .order("assigned_at", { ascending: false });

    const { data: assignmentRows } = isCounselor
      ? await assignmentQuery.eq("counselor_id", user.id)
      : await assignmentQuery.eq("student_id", user.id).maybeSingle();

    const rows = Array.isArray(assignmentRows)
      ? assignmentRows
      : assignmentRows
        ? [assignmentRows]
        : [];

    for (const row of rows) {
      const assignment = toCounselorAssignment(row);
      if (assignment) {
        assignments.push(assignment);
      }
    }

    const contactIds = [
      ...new Set(
        assignments.map((assignment) =>
          isCounselor ? assignment.student_id : assignment.counselor_id,
        ),
      ),
    ];

    if (contactIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name")
        .in("id", contactIds);

      if (profileRows) {
        for (const row of profileRows) {
          const contact = toContact(row);
          if (contact) {
            contacts.push(contact);
          }
        }
      }
    }
  }

  const counterpart =
    contacts.find((contact) => contact.id === requestedWith) ??
    contacts[0] ??
    null;

  if (user && counterpart) {
    const { data: messageRows } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, content, read, created_at")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${counterpart.id}),and(sender_id.eq.${counterpart.id},receiver_id.eq.${user.id})`,
      )
      .order("created_at", { ascending: true });

    if (messageRows) {
      for (const row of messageRows) {
        const message = toMessage(row);
        if (message) {
          messages.push(message);
        }
      }
    }
  }

  const emptyMessage = isCounselor
    ? "No students assigned yet."
    : "No counselor assigned yet.";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12">
      <header>
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Global Student Cube
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Messages
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Chat with your assigned {isCounselor ? "students" : "counselor"}.
        </p>
      </header>

      {!user || !counterpart ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{emptyMessage}</p>
      ) : (
        <div
          className={
            isCounselor && contacts.length > 1
              ? "grid gap-4 lg:grid-cols-[16rem_1fr]"
              : undefined
          }
        >
          {isCounselor && contacts.length > 1 ? (
            <nav className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Students
              </p>
              <ul className="mt-3 space-y-1">
                {contacts.map((contact) => {
                  const isActive = contact.id === counterpart.id;

                  return (
                    <li key={contact.id}>
                      <Link
                        href={`/messages?with=${contact.id}`}
                        className={
                          isActive
                            ? "block rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "block rounded-lg px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                        }
                      >
                        {contact.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : null}

          <ChatWindow
            key={counterpart.id}
            currentUserId={user.id}
            counterpartId={counterpart.id}
            counterpartName={counterpart.name}
            initialMessages={messages}
          />
        </div>
      )}
    </div>
  );
}
