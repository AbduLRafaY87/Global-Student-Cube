export const REDEMPTION_STATES = [
  "draft",
  "requested",
  "reserved",
  "fulfilling",
  "fulfilled",
  "failed",
  "cancelled",
  "released",
] as const;
export type RedemptionState = (typeof REDEMPTION_STATES)[number];

export const CATALOG_CATEGORIES = ["recognition", "gift_card", "donation"] as const;
export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number];

export const RECOGNITION_PACK_CODE = "recognition-pack-500";
export const RECOGNITION_PACK_COST = 500;

export type RedemptionActor = "member" | "admin" | "worker";

export function canTransitionRedemption(
  from: RedemptionState,
  to: RedemptionState,
  actor: RedemptionActor,
): boolean {
  if (from === "draft" && to === "requested" && actor === "member") {
    return true;
  }
  if (from === "requested" && to === "reserved" && actor === "member") {
    return true;
  }
  if (from === "reserved" && to === "fulfilling" && (actor === "admin" || actor === "worker")) {
    return true;
  }
  if (from === "fulfilling" && to === "fulfilled" && (actor === "admin" || actor === "worker")) {
    return true;
  }
  if (from === "fulfilling" && to === "failed" && (actor === "admin" || actor === "worker")) {
    return true;
  }
  if (from === "failed" && to === "released" && (actor === "admin" || actor === "worker")) {
    return true;
  }
  if ((from === "reserved" || from === "requested") && to === "cancelled" && actor === "member") {
    return true;
  }
  if (from === "cancelled" && to === "released" && (actor === "member" || actor === "worker")) {
    return true;
  }
  return false;
}

export function giftCardCanActivate(args: {
  featureEnabled: boolean;
  funded: boolean;
  inventory: number;
}): boolean {
  return args.featureEnabled && args.funded && args.inventory > 0;
}

export function fulfillmentNeverInstant(estimate: string): boolean {
  return !estimate.toLowerCase().includes("instant");
}

export function releaseAfterFailure(state: RedemptionState): boolean {
  return state === "failed" || state === "cancelled";
}
