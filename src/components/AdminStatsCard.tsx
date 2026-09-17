interface AdminStatsCardProps {
  label: string;
  value: number;
}

export function AdminStatsCard({ label, value }: AdminStatsCardProps) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
        {value}
      </p>
    </article>
  );
}
