export const REFERRAL_STATES = [
  "issued",
  "visited",
  "attributed",
  "onboarding",
  "qualified",
  "credited",
  "ineligible",
  "review_hold",
] as const;
export type ReferralState = (typeof REFERRAL_STATES)[number];

export const REFERRAL_CHANNELS = [
  "whatsapp",
  "email",
  "sms",
  "copy_link",
  "qr",
] as const;
export type ReferralChannel = (typeof REFERRAL_CHANNELS)[number];

export type ReferralActor = "visitor" | "registration" | "system" | "admin";

export function canTransitionReferral(
  from: ReferralState,
  to: ReferralState,
  actor: ReferralActor,
): boolean {
  if (from === "issued" && to === "visited" && actor === "visitor") {
    return true;
  }
  if ((from === "issued" || from === "visited") && to === "attributed" && actor === "registration") {
    return true;
  }
  if (from === "attributed" && to === "onboarding" && actor === "system") {
    return true;
  }
  if (from === "onboarding" && to === "qualified" && actor === "system") {
    return true;
  }
  if (from === "qualified" && to === "credited" && actor === "system") {
    return true;
  }
  if (to === "ineligible" && (actor === "system" || actor === "admin")) {
    return from !== "credited";
  }
  if (to === "review_hold" && actor === "admin") {
    return from !== "credited";
  }
  if (from === "review_hold" && (to === "ineligible" || to === "onboarding" || to === "qualified") && actor === "admin") {
    return true;
  }
  return false;
}

export function referralIneligible(args: {
  selfReferral: boolean;
  existingAccount: boolean;
  duplicateIdentity: boolean;
  parentInvitingLinkedChild: boolean;
}): boolean {
  return (
    args.selfReferral ||
    args.existingAccount ||
    args.duplicateIdentity ||
    args.parentInvitingLinkedChild
  );
}

export function referralQualifies(args: {
  studentApproved: boolean;
  module2Complete: boolean;
  module3Complete: boolean;
  financeDeclined: boolean;
  financeComplete: boolean;
}): boolean {
  if (!args.studentApproved || !args.module2Complete || !args.module3Complete) {
    return false;
  }
  return args.financeComplete || args.financeDeclined;
}

export function sharingAwardsPoints(): boolean {
  return false;
}

export function isReferralState(value: string): value is ReferralState {
  return (REFERRAL_STATES as readonly string[]).includes(value);
}

export function displayReferralStatus(state: ReferralState): string {
  switch (state) {
    case "issued":
    case "visited":
      return "invited";
    case "attributed":
    case "onboarding":
      return "onboarding";
    case "qualified":
      return "qualified";
    case "credited":
      return "awarded";
    case "ineligible":
    case "review_hold":
      return "not eligible";
    default:
      return "invited";
  }
}
