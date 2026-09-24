import type { FieldError } from "./education";

export const PROFILE_FILE_PURPOSES = [
  "transcript",
  "test_result",
  "award_evidence",
  "financial_proof",
  "introduction_media",
  "other",
] as const;

export type ProfileFilePurpose = (typeof PROFILE_FILE_PURPOSES)[number];

export const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const INTRODUCTION_MAX_BYTES = 100 * 1024 * 1024;
export const INTRODUCTION_MAX_SECONDS = 60;
export const SIGNED_DOWNLOAD_SECONDS = 60;
export const UPLOAD_AUTHORIZATION_SECONDS = 300;

export const DOCUMENT_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export const INTRODUCTION_MIMES = ["video/mp4"] as const;

export const FILE_STATES = [
  "pending",
  "quarantined",
  "clean",
  "rejected",
  "deleted",
] as const;
export type FileState = (typeof FILE_STATES)[number];

export const REJECTED_MIMES = [
  "text/html",
  "image/svg+xml",
  "application/xhtml+xml",
  "application/x-msdownload",
  "application/x-executable",
] as const;

export function isProfileFilePurpose(value: string): value is ProfileFilePurpose {
  return (PROFILE_FILE_PURPOSES as readonly string[]).includes(value);
}

export function fileSizeLimit(purpose: string): number {
  if (purpose === "profile_image" || purpose === "photo") {
    return PROFILE_IMAGE_MAX_BYTES;
  }
  if (purpose === "introduction_media") {
    return INTRODUCTION_MAX_BYTES;
  }
  return DOCUMENT_MAX_BYTES;
}

export function allowedMimes(purpose: string): readonly string[] {
  if (purpose === "profile_image" || purpose === "photo") {
    return IMAGE_MIMES;
  }
  if (purpose === "introduction_media") {
    return INTRODUCTION_MIMES;
  }
  return DOCUMENT_MIMES;
}

export function vaultGroup(purpose: string): "academics" | "tests" | "funding" | "other" {
  if (purpose === "transcript") {
    return "academics";
  }
  if (purpose === "test_result") {
    return "tests";
  }
  if (purpose === "financial_proof" || purpose === "award_evidence") {
    return "funding";
  }
  return "other";
}

export function validateFileUpload(input: {
  purpose: string;
  sizeBytes: number;
  mime: string;
  durationSeconds?: number | null;
}): FieldError[] {
  const errors: FieldError[] = [];
  if (!isProfileFilePurpose(input.purpose)) {
    errors.push({
      path: "purpose",
      code: "PURPOSE",
      message: "That file purpose is not allowed.",
    });
    return errors;
  }
  if ((REJECTED_MIMES as readonly string[]).includes(input.mime)) {
    errors.push({
      path: "mime",
      code: "REJECTED_TYPE",
      message: "HTML, SVG and executable files cannot be uploaded.",
    });
  }
  if (!allowedMimes(input.purpose).includes(input.mime)) {
    errors.push({
      path: "mime",
      code: "MIME",
      message: "Use PDF, JPEG, PNG or WebP for documents, or MP4 for introductions.",
    });
  }
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0) {
    errors.push({
      path: "sizeBytes",
      code: "SIZE",
      message: "File size must be greater than zero.",
    });
  } else if (input.sizeBytes > fileSizeLimit(input.purpose)) {
    errors.push({
      path: "sizeBytes",
      code: "SIZE_LIMIT",
      message:
        input.purpose === "introduction_media"
          ? "Introduction videos can be at most 100 MB and 60 seconds."
          : "Documents can be at most 20 MB.",
    });
  }
  if (
    input.purpose === "introduction_media" &&
    input.durationSeconds !== null &&
    input.durationSeconds !== undefined &&
    input.durationSeconds > INTRODUCTION_MAX_SECONDS
  ) {
    errors.push({
      path: "durationSeconds",
      code: "DURATION",
      message: "Introduction videos can be at most 60 seconds.",
    });
  }
  return errors;
}

export function canPreviewFile(state: string): boolean {
  return state === "clean";
}

export function leftoverDocumentPurpose(
  documentType: string,
): "transcript" | "passport" | "recommendation_letter" | "other" {
  if (documentType === "transcript") {
    return "transcript";
  }
  if (documentType === "passport") {
    return "passport";
  }
  if (documentType === "recommendation_letter") {
    return "recommendation_letter";
  }
  return "other";
}
