import type { UserProfile } from "@/types";

export interface CounselorProfileCardProps {
  kicker: string;
  profile: Pick<UserProfile, "first_name" | "last_name" | "phone" | "role">;
  email: string | null;
  assignedAt: string;
}

function displayName(
  profile: Pick<UserProfile, "first_name" | "last_name">,
): string {
  const name = `${profile.first_name} ${profile.last_name}`.trim();
  return name === "" ? "Unnamed profile" : name;
}

export function CounselorProfileCard({
  kicker,
  profile,
  email,
  assignedAt,
}: CounselorProfileCardProps) {
  const name = displayName(profile);

  return (
    <article className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        {kicker}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        {name}
      </h2>
      <dl className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
        <div className="flex justify-between gap-4">
          <dt>Role</dt>
          <dd className="font-medium capitalize">{profile.role}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Phone</dt>
          <dd className="font-medium">{profile.phone ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Assigned</dt>
          <dd className="font-medium">{assignedAt || "—"}</dd>
        </div>
      </dl>
      {email ? (
        <a
          href={`mailto:${email}`}
          className="mt-4 text-sm font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
        >
          Contact {email}
        </a>
      ) : (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          No contact email on file.
        </p>
      )}
    </article>
  );
}
