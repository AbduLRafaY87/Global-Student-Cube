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
import { actorContext, guestContext } from "@/server/context";
import { registerStudentAccountSql } from "@/server/modules/identity/sql-commands";
import { attributeReferralSql } from "@/server/modules/rewards/commands";
import { cookies } from "next/headers";

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
  await registerStudentAccountSql(actorContext(userId), {
    accountId: userId,
    emailNormalized: value.emailNormalized,
    fullName: value.fullName,
    familyName: value.familyName,
    parentSpouseName: value.parentSpouseName || null,
    gender: value.gender,
    dob: value.dob,
    nationality: value.nationality,
    residenceCountry: value.residenceCountry,
    city: value.city,
    address: value.address,
    phoneCipher: Buffer.from(phone.cipherHex, "hex"),
    phoneHash: phone.hash,
    whatsappCipher: whatsapp
      ? Buffer.from(whatsapp.cipherHex, "hex")
      : null,
    socialUrls: value.socialUrls,
    passportStatus: value.passportStatus,
    ageBand: value.ageBand,
    policyVersion: value.consent.policyVersion,
    evidenceHash: hash,
    consentEmail: value.consent.emailNotices,
    consentWhatsapp: value.consent.whatsappNotices,
  });
  const referralCode = (await cookies()).get("gsc_referral")?.value?.trim() ?? "";
  if (referralCode) {
    try {
      await attributeReferralSql(guestContext(), referralCode, userId);
    } catch {
      // Attribution is optional; self/duplicate referrals stay ineligible.
    }
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
