import { FamilyLinkActions } from "@/components/parent/FamilyLinkActions";
import { EmptyState, ForbiddenState } from "@/components/ui/States";
import { isActiveParentLink } from "@/domain/parent/access";
import { resolveUserRole } from "@/domain/roles";
import { createClient } from "@/lib/supabase/server";
import { loadParentFamilyOrNull } from "@/server/modules/parent/commands";
import { loadStudentFamily } from "@/server/modules/parent/load";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Permission review" };

interface PageProps {
  params: Promise<{ linkId: string }>;
}

export default async function FamilyLinkDetailPage({ params }: PageProps) {
  const { linkId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = resolveUserRole(profile?.role);

  if (role === "parent") {
    const family = await loadParentFamilyOrNull();
    if (!family) {
      redirect("/login");
    }
    const link = family.links.find((item) => item.id === linkId);
    if (!link) {
      return <ForbiddenState />;
    }
    const active = isActiveParentLink({ status: link.status, revokedAt: link.revokedAt });
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-semibold text-text">Permission review</h1>
        <p className="text-sm text-text-muted">
          {link.studentName}. {link.kind} · {link.status}.
        </p>
        <p className="text-sm text-text">
          {active
            ? `Live scopes: ${link.scopes.join(", ") || "none"}.`
            : "Pending or revoked links show status only."}
        </p>
        <FamilyLinkActions
          linkId={link.id}
          currentScopes={link.scopes}
          canEditScopes={false}
          canRevoke
        />
        <Link href="/family-links" className="inline-flex min-h-12 items-center text-primary underline">
          Back to family links
        </Link>
      </div>
    );
  }

  const family = await loadStudentFamily(user.id);
  const link = family?.links.find((item) => item.id === linkId);
  if (!family || !link) {
    return (
      <EmptyState
        title="Link not found"
        message="That family relationship is not on this case."
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold text-text">Permission review</h1>
      <p className="text-sm text-text-muted">
        {family.studentName}. {link.kind} · {link.status}.
      </p>
      <FamilyLinkActions
        linkId={link.id}
        currentScopes={link.scopes}
        canEditScopes={link.active}
        canRevoke={link.status !== "revoked"}
      />
      <Link href="/family-links" className="inline-flex min-h-12 items-center text-primary underline">
        Back to family links
      </Link>
    </div>
  );
}
