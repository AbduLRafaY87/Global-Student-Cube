import {
  AI_SYSTEM_RULES,
  parseAdvisoryDraftJson,
  parseCoachingJson,
} from "@/domain/ai/safety";
import type {
  AIProvider,
  AiCompletion,
  CoachCounselorInput,
  DraftAdvisoryInput,
  TranscribeInput,
} from "@/domain/ai/provider";

const SANDBOX_MODEL = "sandbox-wp10";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions";

class SandboxAIProvider implements AIProvider {
  readonly id = "sandbox" as const;

  async transcribe(input: TranscribeInput): Promise<AiCompletion> {
    const text = input.audioUrl
      ? "[SYNTHETIC] Transcript placeholder. Counselor must review before any student text."
      : "[SYNTHETIC] No recording audio. Use the manual summary.";
    return completion(text);
  }

  async draftAdvisory(input: DraftAdvisoryInput): Promise<AiCompletion> {
    const guidance = input.profileSummary
      ? `Discuss documented preferences. ${input.profileSummary.slice(0, 240)}`
      : "Write the shareable guidance from the session notes. This is not an admission probability.";
    return completion(
      JSON.stringify({
        guidance,
        profileSummary: input.profileSummary,
        actionItems: ["Confirm documents the student already listed."],
        scholarshipSuggestions: [],
      }),
    );
  }

  async coachCounselor(): Promise<AiCompletion> {
    return completion(
      JSON.stringify({
        findings: ["Ask one clarifying question before recommending a program."],
        preparation: ["Review the case checklist before the next session."],
        transcriptRefs: [],
      }),
    );
  }
}

class OpenAIProvider implements AIProvider {
  readonly id = "openai" as const;

  constructor(private readonly apiKey: string) {}

  async transcribe(input: TranscribeInput): Promise<AiCompletion> {
    if (!input.audioUrl) {
      return completion("[SYNTHETIC] No recording audio. Use the manual summary.");
    }
    const audio = await fetch(input.audioUrl);
    if (!audio.ok) {
      throw new Error("AI_TRANSCRIBE_FETCH_FAILED");
    }
    const blob = await audio.blob();
    const form = new FormData();
    form.set("model", "gpt-4o-mini-transcribe");
    form.set("file", blob, "session.mp4");
    const response = await fetch(OPENAI_TRANSCRIBE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });
    if (!response.ok) {
      throw new Error("AI_TRANSCRIBE_FAILED");
    }
    const body = (await response.json()) as { text?: string };
    return completion(body.text ?? "", "gpt-4o-mini-transcribe");
  }

  async draftAdvisory(input: DraftAdvisoryInput): Promise<AiCompletion> {
    const text = await this.complete([
      { role: "system", content: AI_SYSTEM_RULES },
      {
        role: "user",
        content: `Draft shareable counseling guidance as JSON with guidance, profileSummary, actionItems, scholarshipSuggestions. ${input.wrappedTranscript}`,
      },
    ]);
    if (!parseAdvisoryDraftJson(text)) {
      throw new Error("AI_DRAFT_INVALID");
    }
    return completion(text, "gpt-4o-mini");
  }

  async coachCounselor(input: CoachCounselorInput): Promise<AiCompletion> {
    const text = await this.complete([
      { role: "system", content: AI_SYSTEM_RULES },
      {
        role: "user",
        content: `Private counselor coaching JSON with findings, preparation, transcriptRefs. Never address the student. Shareable text: ${input.shareableGuidance}\n${input.wrappedTranscript}`,
      },
    ]);
    if (!parseCoachingJson(text)) {
      throw new Error("AI_COACHING_INVALID");
    }
    return completion(text, "gpt-4o-mini");
  }

  private async complete(
    messages: Array<{ role: "system" | "user"; content: string }>,
  ): Promise<string> {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages,
      }),
    });
    if (!response.ok) {
      throw new Error("AI_COMPLETION_FAILED");
    }
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return body.choices?.[0]?.message?.content ?? "";
  }
}

function completion(text: string, model = SANDBOX_MODEL): AiCompletion {
  return {
    text,
    model,
    usage: { inputTokens: 0, outputTokens: 0, costCents: 0 },
  };
}

export function aiProviderFromConfig(
  provider = process.env.GSC_AI_PROVIDER,
  apiKey = process.env.OPENAI_API_KEY,
): AIProvider {
  if (provider === "openai" && apiKey) {
    return new OpenAIProvider(apiKey);
  }
  return new SandboxAIProvider();
}
