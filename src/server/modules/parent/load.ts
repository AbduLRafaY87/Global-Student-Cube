import { isActiveParentLink } from "@/domain/parent/access";
import { createClient } from "@/lib/supabase/server";
import { resolveAccessibleCase } from "@/server/modules/profile/load";

export interface StudentFamilyInvitation {
  id: string;
  targetHint: string;
  scopes: string[];
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

export interface StudentFamilyLink {
  id: string;
  parentId: string;
  kind: string;
  status: string;
  revokedAt: string | null;
  scopes: string[];
  active: boolean;
}

export interface StudentFamilyPayload {
  caseId: string;
  studentName: string;
  studentDob: string | null;
  links: StudentFamilyLink[];
  invitations: StudentFamilyInvitation[];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function loadStudentFamily(
  userId: string,
  requestedCaseId?: string,
): Promise<StudentFamilyPayload | null> {
  const caseRow = await resolveAccessibleCase(userId, requestedCaseId);
  if (!caseRow) {
    return null;
  }
  const supabase = await createClient();
  const [{ data: caseDetail }, { data: linkRows }, { data: inviteRows }, { data: grantRows }] =
    await Promise.all([
      supabase
        .from("cases")
        .select("id, student_name, student_dob, student_account_id")
        .eq("id", caseRow.id)
        .maybeSingle(),
      supabase
        .from("parent_links")
        .select("id, parent_id, kind, status, revoked_at")
        .eq("case_id", caseRow.id)
        .order("created_at"),
      supabase
        .from("parent_invitations")
        .select("id, scopes, expires_at, accepted_at, revoked_at")
        .eq("case_id", caseRow.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("case_grants")
        .select("account_id, scope, parent_link_id")
        .eq("case_id", caseRow.id)
        .is("revoked_at", null),
    ]);

  if (!caseDetail || caseDetail.student_account_id !== userId) {
    return null;
  }

  const scopesByLink = new Map<string, string[]>();
  for (const row of grantRows ?? []) {
    const linkId = asString(row.parent_link_id);
    if (!linkId) {
      continue;
    }
    const current = scopesByLink.get(linkId) ?? [];
    current.push(asString(row.scope));
    scopesByLink.set(linkId, current);
  }

  return {
    caseId: caseRow.id,
    studentName: asString(caseDetail.student_name),
    studentDob: typeof caseDetail.student_dob === "string" ? caseDetail.student_dob : null,
    links: (linkRows ?? []).flatMap((row) => {
      if (typeof row.id !== "string") {
        return [];
      }
      const revokedAt = typeof row.revoked_at === "string" ? row.revoked_at : null;
      return [
        {
          id: row.id,
          parentId: asString(row.parent_id),
          kind: asString(row.kind),
          status: asString(row.status),
          revokedAt,
          scopes: scopesByLink.get(row.id) ?? [],
          active: isActiveParentLink({ status: asString(row.status), revokedAt }),
        },
      ];
    }),
    invitations: (inviteRows ?? []).flatMap((row) => {
      if (typeof row.id !== "string") {
        return [];
      }
      return [
        {
          id: row.id,
          targetHint: "Invited by email or GSC ID",
          scopes: Array.isArray(row.scopes)
            ? row.scopes.filter((item): item is string => typeof item === "string")
            : [],
          expiresAt: asString(row.expires_at),
          acceptedAt: typeof row.accepted_at === "string" ? row.accepted_at : null,
          revokedAt: typeof row.revoked_at === "string" ? row.revoked_at : null,
        },
      ];
    }),
  };
}
