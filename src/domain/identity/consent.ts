export const DATA_USE_POLICY_VERSION = "gsc-data-use-2026-09-19";

export const CONSENT_PURPOSES = {
  dataUse: "data_use",
  emailNotices: "email_notices",
  whatsappNotices: "whatsapp_notices",
} as const;

export interface ConsentDecisions {
  dataUse: boolean;
  emailNotices: boolean;
  whatsappNotices: boolean;
}

export function canonicalConsentPayload(
  actorId: string,
  decisions: ConsentDecisions,
  policyVersion: string,
  occurredAt: string,
): string {
  return JSON.stringify({
    actorId,
    emailNotices: decisions.emailNotices,
    dataUse: decisions.dataUse,
    occurredAt,
    policyVersion,
    whatsappNotices: decisions.whatsappNotices,
  });
}

export async function evidenceHash(
  payload: string,
  digest: (data: string) => Promise<string>,
): Promise<string> {
  return digest(payload);
}
