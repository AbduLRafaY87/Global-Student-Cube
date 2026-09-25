import { toAssuranceLevel, type AssuranceLevel } from "@/domain/identity/mfa";
import { resolveUserRole } from "@/domain/roles";
import { createClient } from "@/lib/supabase/server";
import { CommandError } from "@/server/errors";
import { newRequestId } from "@/server/http/envelope";
import type { UserRole } from "@/types";

export interface RequestContext {
  requestId: string;
  accountId: string;
  role: UserRole;
  caseGrantIds: string[];
  sessionId: string | null;
  assurance: AssuranceLevel;
}

export interface GuestContext {
  requestId: string;
  accountId: null;
  role: null;
  caseGrantIds: [];
  sessionId: null;
  assurance: "none";
}

export function guestContext(requestId = newRequestId()): GuestContext {
  return {
    requestId,
    accountId: null,
    role: null,
    caseGrantIds: [],
    sessionId: null,
    assurance: "none",
  };
}

export async function resolveRequestContext(
  requestId = newRequestId(),
): Promise<RequestContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new CommandError("AUTH_REQUIRED", "Sign in to continue.");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const emailAssurance = user.email_confirmed_at ? "aal1" : "none";
  let assurance: AssuranceLevel = toAssuranceLevel(emailAssurance);
  try {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    assurance = toAssuranceLevel(data?.currentLevel ?? emailAssurance);
  } catch {
    // Keep email-derived assurance if MFA lookup is unavailable.
  }

  return {
    requestId,
    accountId: user.id,
    role: resolveUserRole(profile?.role),
    caseGrantIds: [],
    sessionId: user.id,
    assurance,
  };
}

export async function resolveOptionalContext(
  requestId = newRequestId(),
): Promise<RequestContext | GuestContext> {
  try {
    return await resolveRequestContext(requestId);
  } catch (error) {
    if (error instanceof CommandError && error.code === "AUTH_REQUIRED") {
      return guestContext(requestId);
    }
    throw error;
  }
}

export function actorContext(
  accountId: string,
  requestId = newRequestId(),
): RequestContext {
  return {
    requestId,
    accountId,
    role: "student",
    caseGrantIds: [],
    sessionId: accountId,
    assurance: "aal1",
  };
}
