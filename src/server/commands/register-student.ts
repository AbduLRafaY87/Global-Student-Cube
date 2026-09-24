import { canonicalConsentPayload } from "@/domain/identity/consent";
import { sha256Hex } from "@/domain/identity/hash";
import type { ValidatedRegistration } from "@/domain/identity/registration";
import { validateRegistrationSubmission } from "@/domain/identity/registration";
import type { RegistrationDraft } from "@/domain/identity/registration";
import {
  contactEncryptionSecret,
  encryptContactValue,
} from "@/lib/crypto/contact";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type RegisterCommandResult =
  | { ok: true; redirectTo: "/verify-email" }
  | { ok: false; code: "validation" | "duplicate" | "server"; step?: string };

export async function registerStudentCommand(
  draft: RegistrationDraft,
  origin: string,
  today = new Date(),
): Promise<RegisterCommandResult> {
  const parsed = validateRegistrationSubmission(draft, today);

  if (!parsed.ok) {
    return { ok: false, code: "validation", step: parsed.step };
  }

  const value = parsed.value;
  const supabase = await createClient();
  const redirectTo = `${origin}/auth/callback`;
  const { data, error } = await supabase.auth.signUp({
    email: value.emailNormalized,
    password: value.password,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) {
    const duplicate =
      error.message.toLowerCase().includes("already") ||
      error.message.toLowerCase().includes("registered");
    return { ok: false, code: duplicate ? "duplicate" : "server" };
  }

  const userId = data.user?.id;
  if (!userId) {
    return { ok: false, code: "duplicate" };
  }

  try {
    await persistIdentity(userId, value);
  } catch (persistError) {
    const message =
      persistError instanceof Error ? persistError.message.toLowerCase() : "";
    if (message.includes("accounts_email_normalized_key")) {
      return { ok: false, code: "duplicate" };
    }
    await rollbackAuthUser(userId);
    throw persistError;
  }

  return { ok: true, redirectTo: "/verify-email" };
}

async function persistIdentity(
  userId: string,
  value: ValidatedRegistration,
): Promise<void> {
  const secret = contactEncryptionSecret();
  const phone = await encryptContactValue(value.phoneE164, secret);
  const whatsapp = value.whatsappE164
    ? await encryptContactValue(value.whatsappE164, secret)
    : null;
  const occurredAt = new Date().toISOString();
  const payload = canonicalConsentPayload(
    userId,
    {
      dataUse: true,
      emailNotices: value.consent.emailNotices,
      whatsappNotices: value.consent.whatsappNotices,
    },
    value.consent.policyVersion,
    occurredAt,
  );
  const hash = await sha256Hex(payload);
  const admin = createAdminClient();
  const { error } = await admin.rpc("register_student_account", {
    p_account_id: userId,
    p_email_normalized: value.emailNormalized,
    p_full_name: value.fullName,
    p_family_name: value.familyName,
    p_parent_spouse_name: value.parentSpouseName,
    p_gender: value.gender,
    p_dob: value.dob,
    p_nationality: value.nationality,
    p_residence_country: value.residenceCountry,
    p_city: value.city,
    p_address: value.address,
    p_phone_cipher_hex: phone.cipherHex,
    p_phone_hash: phone.hash,
    p_whatsapp_cipher_hex: whatsapp?.cipherHex ?? null,
    p_social_urls: value.socialUrls,
    p_passport_status: value.passportStatus,
    p_age_band: value.ageBand,
    p_policy_version: value.consent.policyVersion,
    p_evidence_hash: hash,
    p_consent_email: value.consent.emailNotices,
    p_consent_whatsapp: value.consent.whatsappNotices,
  });

  if (error) {
    throw error;
  }
}

async function rollbackAuthUser(userId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(userId);
  } catch {
    // Reconciliation via registration_intents is out of this slice.
  }
}
