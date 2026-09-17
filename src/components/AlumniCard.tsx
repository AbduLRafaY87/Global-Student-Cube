import type { AlumniProfile } from "@/types";

export interface AlumniCardProps {
  alumni: AlumniProfile;
  universityName: string;
  country: string;
}

export function AlumniCard({
  alumni,
  universityName,
  country,
}: AlumniCardProps) {
  return (
    <article className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        Class of {alumni.graduation_year}
        {country ? ` · ${country}` : ""}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        {alumni.name}
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {universityName}
      </p>
      <dl className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
        <div className="flex justify-between gap-4">
          <dt>Company</dt>
          <dd className="font-medium">{alumni.current_company}</dd>
        </div>
      </dl>
      <a
        href={alumni.linkedin_url}
        target="_blank"
        rel="noreferrer"
        className="mt-4 text-sm font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
      >
        View LinkedIn
      </a>
    </article>
  );
}
