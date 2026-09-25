export async function sendWhatsAppNotice(input: {
  optedIn: boolean;
  text: string;
  toE164?: string;
}): Promise<boolean> {
  if (!input.optedIn || !input.toE164) {
    return false;
  }
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) {
    return false;
  }
  const body = new URLSearchParams({
    From: from,
    To: `whatsapp:${input.toE164}`,
    Body: input.text,
  });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );
  return response.ok;
}
