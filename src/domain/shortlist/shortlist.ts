export const SAVED_PAIR_CAP = 3;
export const RECOMMENDATION_SLOT_CAP = 10;
export const CAP_REACHED_MESSAGE = "Remove a saved program first.";
export const SAVED_SET_LABEL = "Saved university + program combinations, 0–3";
export const RECOMMENDATION_NOT_SAVED_COPY =
  "Up to 10 recommendations, not saved slots.";

export interface SavedPairKey {
  universityId: string;
  programId: string;
}

export function pairKey(universityId: string, programId: string): string {
  return `${universityId}:${programId}`;
}

export function savedCount(pairs: readonly SavedPairKey[]): number {
  return new Set(pairs.map((row) => pairKey(row.universityId, row.programId))).size;
}

export function alreadySaved(
  pairs: readonly SavedPairKey[],
  universityId: string,
  programId: string,
): boolean {
  const key = pairKey(universityId, programId);
  return pairs.some((row) => pairKey(row.universityId, row.programId) === key);
}

export function canAllocateSavedSlot(
  currentCount: number,
  isExistingPair: boolean,
): boolean {
  if (isExistingPair) {
    return true;
  }
  return currentCount < SAVED_PAIR_CAP;
}

export function reviewFlagAllowed(isSavedPair: boolean): boolean {
  return isSavedPair;
}

export function saveControlState(input: {
  signedIn: boolean;
  module3Completed: boolean;
  canWrite: boolean;
  savedCount: number;
  alreadySaved: boolean;
}): {
  enabled: boolean;
  reason: string | null;
} {
  if (!input.signedIn) {
    return { enabled: false, reason: "Sign in to save a combination." };
  }
  if (!input.canWrite) {
    return { enabled: false, reason: "Saving is not shared with this account." };
  }
  if (!input.module3Completed) {
    return {
      enabled: false,
      reason: "Complete your financial-planning section to save a program.",
    };
  }
  if (input.alreadySaved) {
    return { enabled: false, reason: "This combination is already saved." };
  }
  if (input.savedCount >= SAVED_PAIR_CAP) {
    return { enabled: false, reason: CAP_REACHED_MESSAGE };
  }
  return { enabled: true, reason: null };
}
