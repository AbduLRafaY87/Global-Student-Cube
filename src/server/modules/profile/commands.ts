import type { RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

interface CasePayload {
  caseId: string;
  completed?: boolean;
}

interface FileRegisterPayload {
  id: string;
  objectKey: string;
  bucket: string;
}

interface FileCompletePayload {
  id: string;
  state: string;
}

interface FileDownloadPayload {
  id: string;
  objectKey: string;
  bucket: string;
  purpose: string;
  state: string;
}

export async function saveAcademicHistoryCommand(
  context: RequestContext,
  caseId: string,
  payload: Record<string, unknown>,
): Promise<CasePayload> {
  const row = await queryCommand<{ payload: CasePayload }>(
    context,
    `SELECT commands.save_academic_history($1, $2::jsonb) AS payload`,
    [caseId, JSON.stringify(payload)],
  );
  return row.payload;
}

export async function saveTestResultsCommand(
  context: RequestContext,
  caseId: string,
  payload: Record<string, unknown>,
): Promise<CasePayload> {
  const row = await queryCommand<{ payload: CasePayload }>(
    context,
    `SELECT commands.save_test_results($1, $2::jsonb) AS payload`,
    [caseId, JSON.stringify(payload)],
  );
  return row.payload;
}

export async function savePreferencesCommand(
  context: RequestContext,
  caseId: string,
  payload: Record<string, unknown>,
): Promise<CasePayload> {
  const row = await queryCommand<{ payload: CasePayload }>(
    context,
    `SELECT commands.save_preferences($1, $2::jsonb) AS payload`,
    [caseId, JSON.stringify(payload)],
  );
  return row.payload;
}

export async function saveExperienceCommand(
  context: RequestContext,
  caseId: string,
  payload: Record<string, unknown>,
): Promise<CasePayload> {
  const row = await queryCommand<{ payload: CasePayload }>(
    context,
    `SELECT commands.save_experience($1, $2::jsonb) AS payload`,
    [caseId, JSON.stringify(payload)],
  );
  return row.payload;
}

export async function completeModule2Command(
  context: RequestContext,
  caseId: string,
): Promise<CasePayload> {
  const row = await queryCommand<{ payload: CasePayload }>(
    context,
    `SELECT commands.complete_module2($1) AS payload`,
    [caseId],
  );
  return row.payload;
}

export async function registerFileUploadCommand(
  context: RequestContext,
  input: { caseId: string; purpose: string; sizeBytes: number; mime: string },
): Promise<FileRegisterPayload> {
  const row = await queryCommand<{ payload: FileRegisterPayload }>(
    context,
    `SELECT commands.register_file_upload($1, $2, $3, $4) AS payload`,
    [input.caseId, input.purpose, input.sizeBytes, input.mime],
  );
  return row.payload;
}

export async function completeFileUploadCommand(
  context: RequestContext,
  input: {
    fileId: string;
    detectedMime: string | null;
    sha256: string | null;
    durationSeconds: number | null;
  },
): Promise<FileCompletePayload> {
  const row = await queryCommand<{ payload: FileCompletePayload }>(
    context,
    `SELECT commands.complete_file_upload($1, $2, $3, $4) AS payload`,
    [input.fileId, input.detectedMime, input.sha256, input.durationSeconds],
  );
  return row.payload;
}

export async function issueFileDownloadCommand(
  context: RequestContext,
  fileId: string,
): Promise<FileDownloadPayload> {
  const row = await queryCommand<{ payload: FileDownloadPayload }>(
    context,
    `SELECT commands.issue_file_download($1) AS payload`,
    [fileId],
  );
  return row.payload;
}
