export type AiJobPurpose =
  | "transcribe"
  | "advisory_draft"
  | "qa_coaching"
  | "catalog_extract";

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  costCents: number;
}

export interface AiCompletion {
  text: string;
  model: string;
  usage: AiUsage;
}

export interface TranscribeInput {
  audioUrl: string | null;
  languageHint?: string;
}

export interface DraftAdvisoryInput {
  wrappedTranscript: string;
  profileSummary: string;
}

export interface CoachCounselorInput {
  wrappedTranscript: string;
  shareableGuidance: string;
}

export interface AIProvider {
  readonly id: "sandbox" | "openai";
  transcribe(input: TranscribeInput): Promise<AiCompletion>;
  draftAdvisory(input: DraftAdvisoryInput): Promise<AiCompletion>;
  coachCounselor(input: CoachCounselorInput): Promise<AiCompletion>;
}
