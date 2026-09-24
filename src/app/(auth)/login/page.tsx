"use client";

import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("reason") === "suspended"
      ? "This account is suspended. Sign-in cannot continue."
      : null,
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          next: searchParams.get("next"),
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        redirectTo?: string;
      };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Email or password is incorrect.");
        return;
      }

      router.push(payload.redirectTo ?? "/home");
      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[480px] rounded-[var(--radius-card)] border border-border bg-surface p-6">
      <p className="text-sm font-medium tracking-wide text-text-muted uppercase">
        Global Student Cube
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-text">Log in</h1>
      <p className="mt-2 text-sm text-text-muted">
        Staff and counselor accounts use this same screen. There is no privileged
        bypass here.
      </p>

      <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PasswordField
          id="password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <p className="text-right text-sm">
          <Link
            href="/password-reset"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </p>
        {error ? (
          <p className="text-sm text-critical" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" loading={submitting}>
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        Need an account?{" "}
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Create account
        </Link>
        {" · "}
        <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
          Continue as guest
        </Link>
      </p>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted">Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}
