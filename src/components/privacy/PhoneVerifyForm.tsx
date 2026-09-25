"use client";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { PHONE_OTP_NOT_MFA } from "@/domain/privacy/otp";
import { Smartphone } from "lucide-react";
import { useState } from "react";

export function PhoneVerifyForm() {
  const [countryCode, setCountryCode] = useState("+");
  const [national, setNational] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function post(path: string, body: Record<string, unknown>) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await response.json()) as {
      data?: { id?: string };
      error?: { message?: string };
    };
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!challengeId) {
          setBusy(true);
          void post("/api/v1/auth/phone/start", { countryCode, national }).then(
            (payload) => {
              setBusy(false);
              if (!payload.data?.id) {
                setMessage(
                  payload.error?.message ??
                    "Phone verification is waiting for the Twilio Verify service.",
                );
                return;
              }
              setChallengeId(payload.data.id);
              setMessage("A six-digit code was sent. It expires in five minutes.");
            },
          );
          return;
        }
        setBusy(true);
        void post("/api/v1/auth/phone/verify", {
          challengeId,
          code,
          countryCode,
          national,
        }).then((payload) => {
          setBusy(false);
          setMessage(
            payload.error?.message ??
              (payload.data ? "Phone verified. This is not login MFA." : "That code is not valid."),
          );
        });
      }}
    >
      <Smartphone className="size-8 text-primary" aria-hidden />
      <p className="text-sm text-text-muted">{PHONE_OTP_NOT_MFA}</p>
      <TextField
        id="phone-country"
        label="Country code"
        required
        value={countryCode}
        onChange={(event) => setCountryCode(event.target.value)}
      />
      <TextField
        id="phone-national"
        label="Phone number"
        required
        value={national}
        onChange={(event) => setNational(event.target.value)}
      />
      {challengeId ? (
        <TextField
          id="phone-otp"
          label="Verification code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          hint="Paste all six digits into this one field."
        />
      ) : null}
      <Button type="submit" loading={busy}>
        {challengeId ? "Verify phone" : "Send code"}
      </Button>
      {message ? (
        <p className="text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
