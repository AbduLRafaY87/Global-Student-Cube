import { guestContext, resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  adminRewardsQueueSql,
  getCertificateSql,
  getRedemptionSql,
  issueReferralCodeSql,
  listMyCertificatesSql,
  listMyRedemptionsSql,
  listMyReferralsSql,
  listRewardCatalogSql,
  rewardHomeSql,
  visitReferralSql,
} from "./commands";

export type RewardsLoad<T> =
  | { ok: true; data: T }
  | { ok: false; forbidden: boolean };

async function wrap<T>(run: () => Promise<T>): Promise<RewardsLoad<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    if (
      error instanceof CommandError &&
      (error.code === "FORBIDDEN" ||
        error.code === "AUTH_REQUIRED" ||
        error.code === "NOT_FOUND" ||
        error.code === "MFA_REQUIRED")
    ) {
      return { ok: false, forbidden: error.code !== "NOT_FOUND" };
    }
    return { ok: false, forbidden: false };
  }
}

export async function loadRewardHome() {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return rewardHomeSql(context);
  });
}

export async function loadRewardCatalog(giftCards: boolean) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    const [catalog, redemptions, home] = await Promise.all([
      listRewardCatalogSql(context, giftCards),
      listMyRedemptionsSql(context),
      rewardHomeSql(context),
    ]);
    return { catalog, redemptions, home };
  });
}

export async function loadRedemption(id: string) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return getRedemptionSql(context, id);
  });
}

export async function loadReferrals() {
  return wrap(async () => {
    const context = await resolveRequestContext();
    const [code, items] = await Promise.all([
      issueReferralCodeSql(context),
      listMyReferralsSql(context),
    ]);
    return { code, items };
  });
}

export async function loadCertificates(certificateId: string | null) {
  return wrap(async () => {
    const context = await resolveRequestContext();
    const items = await listMyCertificatesSql(context);
    const selected = certificateId ? await getCertificateSql(context, certificateId) : null;
    return { items, selected };
  });
}

export async function loadAdminRewards() {
  return wrap(async () => {
    const context = await resolveRequestContext();
    return adminRewardsQueueSql(context);
  });
}

export async function loadReferralVisit(code: string) {
  return wrap(async () => {
    return visitReferralSql(guestContext(), code);
  });
}
