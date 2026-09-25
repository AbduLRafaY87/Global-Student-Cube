import { EmptyState } from "@/components/ui/States";
import Link from "next/link";

export function RewardsRulesOnly() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <EmptyState
        title="Rewards for verified mentors"
        message="25 points are awarded once after an approved mentoring session or a qualified referred student who completed Modules 2 and 3. Clients never submit point totals. Tiers count unique verified mentees at 5, 10, 15 and 25."
        action={
          <Link className="text-primary underline-offset-2 hover:underline" href="/mentors">
            Mentor community
          </Link>
        }
      />
    </div>
  );
}
