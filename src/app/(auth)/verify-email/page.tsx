"use client";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { maskEmail } from "@/domain/identity/mask";
import { Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function VerifyEmailFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "expired"
      ? "This verification link has expired. Request a new one."
      : null,
  );
  const [seconds, setSeconds] = useState(60);
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.email) {
        router.replace("/login");
        return;
      }
      setEmail(user.email);
      if (user.email_confirmed_at) {
        setVerified(true);
      }
    });
  }, [router]);

  useEffect(() => {
    if (seconds <= 0) {
      return;
    }
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/auth/verify-email", { method: "POST" });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        retryAfterSeconds?: number;
        alreadyVerified?: boolean;
      };
      if (payload.alreadyVerified) {
        setVerified(true);
        return;
      }
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Unable to resend just now.");
        if (payload.retryAfterSeconds) {
          setSeconds(payload.retryAfterSeconds);
        }
        return;
      }
      setNotice("We sent another verification email.");
      setSeconds(payload.retryAfterSeconds ?? 60);
    } catch {
      setError("You’re offline. Reconnect to send this email.");
    } finally {
      setBusy(false);
    }
  }

  async function recheck() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/auth/verify-email", { method: "PUT" });
      const payload = (await response.json()) as {
        ok?: boolean;
        verified?: boolean;
        error?: string;
        redirectTo?: string;
      };
      if (payload.verified) {
        setVerified(true);
        router.push(payload.redirectTo ?? "/profile");
        router.refresh();
        return;
      }
      setError(payload.error ?? "We have not received a verification yet.");
    } catch {
      setError("You’re offline. Reconnect to check this status.");
    } finally {
      setBusy(false);
    }
  }

  async function changeEmail() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/auth/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setError(
          payload.error ??
            "Unable to change this email. Your previous address is unchanged.",
        );
        return;
      }
      setEmail(newEmail);
      setNotice("Check the new address. The previous link no longer works.");
      setSeconds(60);
    } catch {
      setError("Unable to change this email. Your previous address is unchanged.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[480px] rounded-[var(--radius-card)] border border-border bg-surface p-6">
      <Mail className="size-8 text-primary" aria-hidden />
      <h1 className="mt-3 text-2xl font-semibold text-text">
        {verified ? "Email verified" : "Verify your email"}
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        {verified
          ? "Your email is confirmed. You can continue."
          : `We sent a link to ${maskEmail(email)}. Open it, then return here.`}
      </p>

      {verified ? (
        <div className="mt-6">
          <Button onClick={() => router.push("/profile")}>Continue</Button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <Button loading={busy} onClick={() => void recheck()}>
            I have verified
          </Button>
          <Button
            variant="secondary"
            disabled={busy || seconds > 0}
            onClick={() => void resend()}
          >
            {seconds > 0 ? `Resend verification (${seconds})` : "Resend verification"}
          </Button>
          <a
            className="inline-flex h-12 w-full items-center justify-center rounded-[var(--radius-control)] border border-control-border text-base font-medium"
            href="mailto:"
          >
            Open email app
          </a>
          <TextField
            id="change-email"
            label="Change email"
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
          />
          <Button variant="ghost" loading={busy} onClick={() => void changeEmail()}>
            Save new email
          </Button>
        </div>
      )}

      {notice ? (
        <p className="mt-4 text-sm text-text" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-critical" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted">Loading…</p>}>
      <VerifyEmailFlow />
    </Suspense>
  );
}
