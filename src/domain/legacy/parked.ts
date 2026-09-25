export const PARKED_MODULE_MESSAGE = "This module is parked.";

export const PARKED_MODULE_PATHS = [
  "/essays",
  "/recommendations",
  "/interviews",
  "/offers",
  "/billing",
] as const;

export function isParkedModuleEnabled(flag: string | undefined): boolean {
  return flag === "1" || flag === "true";
}
