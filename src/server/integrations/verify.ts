export interface VerifySendResult {
  provider: "sandbox" | "twilio";
  sid: string | null;
  codeHash: string | null;
  configured: boolean;
}

export interface VerifyCheckResult {
  approved: boolean;
}

export interface PhoneVerifyProvider {
  readonly id: "sandbox" | "twilio";
  send(phoneE164: string): Promise<VerifySendResult>;
  check(phoneE164: string, code: string, sid: string | null): Promise<VerifyCheckResult>;
}

function twilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_VERIFY_SERVICE_SID,
  );
}

async function twilioRequest(path: string, body: URLSearchParams): Promise<Record<string, unknown>> {
  const sid = process.env.TWILIO_ACCOUNT_SID ?? "";
  const token = process.env.TWILIO_AUTH_TOKEN ?? "";
  const service = process.env.TWILIO_VERIFY_SERVICE_SID ?? "";
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${service}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );
  return (await response.json()) as Record<string, unknown>;
}

export function phoneVerifyProvider(): PhoneVerifyProvider {
  if (!twilioConfigured()) {
    return {
      id: "sandbox",
      async send() {
        return {
          provider: "sandbox",
          sid: null,
          codeHash: null,
          configured: false,
        };
      },
      async check() {
        return { approved: false };
      },
    };
  }

  return {
    id: "twilio",
    async send(phoneE164) {
      const payload = await twilioRequest(
        "Verifications",
        new URLSearchParams({ To: phoneE164, Channel: "sms" }),
      );
      return {
        provider: "twilio",
        sid: typeof payload.sid === "string" ? payload.sid : null,
        codeHash: null,
        configured: true,
      };
    },
    async check(phoneE164, code) {
      const payload = await twilioRequest(
        "VerificationCheck",
        new URLSearchParams({ To: phoneE164, Code: code }),
      );
      return { approved: payload.status === "approved" };
    },
  };
}
