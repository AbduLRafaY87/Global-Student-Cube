export const RECORDING_AI_FLAG = "recording_ai";

export function isRecordingFeatureEnabled(flag: string | undefined): boolean {
  return flag === "1" || flag === "true";
}
