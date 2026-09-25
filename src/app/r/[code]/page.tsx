import { loadReferralVisit } from "@/server/modules/rewards/load";
import { cookies } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Referral invitation" };
export const dynamic = "force-dynamic";

export default async function ReferralVisitPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const trimmed = code.trim();
  if (trimmed) {
    const jar = await cookies();
    jar.set("gsc_referral", trimmed, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    await loadReferralVisit(trimmed);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold text-text">You were invited</h1>
      <p className="text-sm text-text-muted">
        Opening this link or creating an account does not award points. A referral credits 25
        points only after the referred student is approved and completes Modules 2 and 3.
      </p>
      <Link
        className="inline-flex h-12 items-center text-primary underline-offset-2 hover:underline"
        href="/register"
      >
        Create an account
      </Link>
    </div>
  );
}
