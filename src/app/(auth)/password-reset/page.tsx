"use client";

import { PasswordField } from "@/components/auth/PasswordField";
import { PasswordRules } from "@/components/auth/PasswordRules";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function PasswordResetFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialState = searchParams.get("state") === "new" ? "new_password" : "request";
  const [mode, setMode] = useState<"request" | "sent" | "new_password" | "expired">(
    initialState,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "expired"
      ? "This reset link has expired. Request a new one."
      : null,
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { message?: string };
      setMessage(
        payload.message ??
          "If an account exists for that email, we sent a reset link.",
      );
      setMode("sent");
    } catch {
      setMessage("If an account exists for that email, we sent a reset link.");
      setMode("sent");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, passwordConfirmation }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        code?: string;
        error?: string;
        redirectTo?: string;
      };
      if (payload.code === "expired") {
        setMode("expired");
        setError(payload.error ?? "This reset link has expired. Request a new one.");
        return;
      }
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Unable to save a new password.");
        return;
      }
      router.push(payload.redirectTo ?? "/login");
    } catch {
      setError("Unable to save a new password. Request a new link.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[480px] rounded-[var(--radius-card)] border border-border bg-surface p-6">
      <KeyRound className="size-8 text-primary" aria-hidden />
      <h1 className="mt-3 text-2xl font-semibold text-text">Reset password</h1>

      {mode === "new_password" ? (
        <form className="mt-6 space-y-4" onSubmit={(event) => void handleSave(event)}>
          <PasswordField
            id="new-password"
            label="New password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <PasswordRules password={password} />
          <PasswordField
            id="new-password-confirmation"
            label="Confirm password"
            autoComplete="new-password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
          />
          {error ? (
            <p className="text-sm text-critical" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={submitting}>
            Save new password
          </Button>
        </form>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={(event) => void handleRequest(event)}>
          {mode !== "sent" ? (
            <TextField
              id="reset-email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          ) : null}
          {message ? (
            <p className="text-sm text-text" role="status">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-critical" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={submitting}>
            {mode === "sent" || mode === "expired" ? "Send reset link" : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to log in
        </Link>
      </p>
    </section>
  );
}

export default function PasswordResetPage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted">Loading…</p>}>
      <PasswordResetFlow />
    </Suspense>
  );
}
