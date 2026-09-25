export function counselorReceivesFullSafetyComplaint(): boolean {
  return false;
}

export function canReadProtectedSafetyComplaint(args: {
  isProtected: boolean;
  hasSafetyPermission: boolean;
}): boolean {
  if (!args.isProtected) {
    return true;
  }
  return args.hasSafetyPermission;
}

export function safetyIntakeVisibleToRoutineModerator(): boolean {
  return false;
}
