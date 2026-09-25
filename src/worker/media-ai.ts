import { isRecordingFeatureEnabled } from "@/domain/sessions/features";
import { guestContext } from "@/server/context";
import { aiProviderFromConfig } from "@/server/integrations/ai";
import { expireMediaSql } from "@/server/modules/ai/commands";
import {
  deliverPendingAdvisoryNotices,
  processMediaAiTick,
} from "@/server/modules/ai/process";

async function main(): Promise<void> {
  const featureOn = isRecordingFeatureEnabled(process.env.GSC_FEATURE_RECORDING_AI);
  const result = featureOn
    ? await processMediaAiTick(aiProviderFromConfig())
    : { expired: await expireMediaSql(guestContext()), jobs: 0 };
  const notices = await deliverPendingAdvisoryNotices(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.invalid",
  );
  process.stdout.write(
    `${JSON.stringify({
      event: "media_ai_tick",
      featureOn,
      ...result,
      notices,
    })}\n`,
  );
}

void main();
