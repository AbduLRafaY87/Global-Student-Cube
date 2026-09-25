import { createHash } from "node:crypto";
import { advisoryDeliveryNotice } from "@/domain/ai/delivery";
import { exceedsCostCap } from "@/domain/ai/jobs";
import type { AIProvider } from "@/domain/ai/provider";
import {
  AI_PROMPT_VERSION,
  parseAdvisoryDraftJson,
  parseCoachingJson,
  processUntrustedTranscript,
  wrapUntrusted,
} from "@/domain/ai/safety";
import { guestContext } from "@/server/context";
import { sendMinimalLinkEmail } from "@/lib/email/outbox-resend";
import {
  claimAiJobsSql,
  completeAiJobSql,
  expireMediaSql,
  pendingAdvisoryNoticesSql,
} from "./commands";

export async function processMediaAiTick(provider: AIProvider): Promise<{
  expired: { recordings: number; transcripts: number };
  jobs: number;
}> {
  const context = guestContext();
  const expired = await expireMediaSql(context);
  const jobs = await claimAiJobsSql(context, 5);
  for (const job of jobs) {
    await processOneJob(provider, job);
  }
  return { expired, jobs: jobs.length };
}

async function processOneJob(
  provider: AIProvider,
  job: { id: string; bookingId: string; kind: string },
): Promise<void> {
  const context = guestContext();
  try {
    if (job.kind === "transcribe") {
      const result = await provider.transcribe({ audioUrl: null });
      const processed = processUntrustedTranscript(result.text, result.text);
      await complete(job.id, result, {
        text: result.text,
      }, processed.flags);
      return;
    }
    if (job.kind === "advisory_draft") {
      const wrapped = wrapUntrusted("");
      const result = await provider.draftAdvisory({
        wrappedTranscript: wrapped,
        profileSummary: "",
      });
      const processed = processUntrustedTranscript(wrapped, result.text);
      const parsed = parseAdvisoryDraftJson(result.text);
      if (!processed.draftAccepted || !parsed) {
        await complete(
          job.id,
          result,
          parsed ? { ...parsed } : {},
          processed.flags,
          "blocked",
          "INJECTION",
        );
        return;
      }
      await complete(job.id, result, { ...parsed }, processed.flags);
      return;
    }
    if (job.kind === "qa_coaching") {
      const result = await provider.coachCounselor({
        wrappedTranscript: wrapUntrusted(""),
        shareableGuidance: "",
      });
      const parsed = parseCoachingJson(result.text);
      const processed = processUntrustedTranscript("", result.text);
      if (!parsed) {
        await complete(job.id, result, {}, processed.flags, "failed", "INVALID_OUTPUT");
        return;
      }
      await complete(job.id, result, { ...parsed }, processed.flags);
    }
  } catch (error) {
    await completeAiJobSql(context, {
      jobId: job.id,
      status: "failed",
      model: provider.id,
      inputHash: hashText(job.id),
      flags: [],
      output: {},
      costCents: 0,
      tokenCount: 0,
      error: error instanceof Error ? error.message : "AI_JOB_FAILED",
    });
  }

  async function complete(
    jobId: string,
    result: { model: string; usage: { costCents: number; inputTokens: number; outputTokens: number }; text: string },
    output: Record<string, unknown>,
    flags: string[],
    status = "succeeded",
    error: string | null = null,
  ): Promise<void> {
    const tokens = result.usage.inputTokens + result.usage.outputTokens;
    const blocked = exceedsCostCap(result.usage.costCents, tokens);
    await completeAiJobSql(context, {
      jobId,
      status: blocked ? "blocked" : status,
      model: result.model,
      inputHash: hashText(`${AI_PROMPT_VERSION}:${result.text}`),
      flags,
      output,
      costCents: result.usage.costCents,
      tokenCount: tokens,
      error: blocked ? "COST_CAP" : error,
    });
  }
}

export async function deliverPendingAdvisoryNotices(
  origin: string,
): Promise<number> {
  const notices = await pendingAdvisoryNoticesSql(guestContext());
  let sent = 0;
  for (const notice of notices) {
    const reportPath = `${origin}/sessions/${notice.bookingId}/report`;
    const payload = advisoryDeliveryNotice({
      status: "approved",
      whatsappOptIn: false,
      reportPath,
      audience: "student",
    });
    if (!payload) {
      continue;
    }
    const to = process.env.GSC_ADVISORY_NOTICE_DEV_INBOX;
    if (to) {
      await sendMinimalLinkEmail({
        to,
        subject: payload.emailSubject,
        text: payload.emailText,
      });
    }
    sent += 1;
  }
  return sent;
}

function hashText(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
