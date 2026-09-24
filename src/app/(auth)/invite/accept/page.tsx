"use client";

import { PasswordField } from "@/components/auth/PasswordField";
import { PasswordRules } from "@/components/auth/PasswordRules";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { validatePassword, validatePasswordConfirmation } from "@/domain/identity/password";
import { createClient } from "@/lib/supabase/client";
import { Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

interface Envelope<T> {
  data?: T;
  error?: { message?: string; code?: string };
}

function InviteAcceptFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const kind = searchParams.get("kind") === "parent" ? "parent" : "staff";
  const [role, setRole] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) {
        return;
      }
      setSignedIn(Boolean(user));
      if (user?.email) {
        setEmail(user.email);
      }

      if (!token) {
        setUnavailable(true);
        return;
      }

      const response = await fetch("/api/v1/invitations/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const payload = (await response.json()) as Envelope<{ role: string }>;
      if (cancelled) {
        return;
      }
      if (!response.ok || !payload.data) {
        if (kind === "parent") {
          setRole("parent");
          return;
        }
        setUnavailable(true);
        return;
      }
      setRole(payload.data.role);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token, kind]);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const path =
        kind === "parent"
          ? "/api/v1/parent-links/accept"
          : "/api/v1/invitations/accept";
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "parent" ? { token, kind: "adult_authorized" } : { token },
        ),
      });
      const payload = (await response.json()) as Envelope<{ homeRole?: string }>;
      if (!response.ok) {
        setError(
          payload.error?.code === "INVALID_REQUEST"
            ? "This invitation has already been used."
            : (payload.error?.message ?? "This invitation cannot be used."),
        );
        return;
      }
      router.push(payload.data?.homeRole === "counselor" || payload.data?.homeRole === "admin"
        ? "/mfa"
        : "/profile");
      router.refresh();
    } catch {
      setError("You’re offline. Reconnect to continue.");
    } finally {
      setBusy(false);
    }
  }

  async function createAndAccept() {
    const passwordError = validatePassword(password);
    const confirmError = validatePasswordConfirmation(
      password,
      passwordConfirmation,
    );
    if (passwordError || confirmError) {
      setError(passwordError ?? confirmError);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (signUpError) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError("Sign in with the invited email to continue.");
          return;
        }
      }
      setSignedIn(true);
      await accept();
    } catch {
      setError("Unable to accept this invitation.");
    } finally {
      setBusy(false);
    }
  }

  if (unavailable) {
    return (
      <section className="mx-auto w-full max-w-[480px] rounded-[var(--radius-card)] border border-border bg-surface p-6">
        <Mail className="size-8 text-primary" aria-hidden />
        <h1 className="mt-3 text-2xl font-semibold text-text">Invitation</h1>
        <p className="mt-2 text-sm text-text">
          This invitation has expired or has already been used.
        </p>
        <p className="mt-6 text-sm">
          <Link href="/login" className="font-medium text-primary underline">
            Back to log in
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[480px] rounded-[var(--radius-card)] border border-border bg-surface p-6">
      <Mail className="size-8 text-primary" aria-hidden />
      <h1 className="mt-3 text-2xl font-semibold text-text">Accept invitation</h1>
      <p className="mt-2 text-sm text-text-muted">
        {role
          ? `This invitation is for a ${role} account.`
          : "Use the invited email address to continue."}
      </p>

      {signedIn ? (
        <div className="mt-6 space-y-4">
          <Button loading={busy} onClick={() => void accept()}>
            Accept invitation
          </Button>
        </div>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void createAndAccept();
          }}
        >
          <TextField
            id="invite-email"
            label="Invited email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <PasswordField
            id="invite-password"
            label="Password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <PasswordRules password={password} />
          <PasswordField
            id="invite-password-confirm"
            label="Confirm password"
            autoComplete="new-password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
          />
          <Button type="submit" loading={busy}>
            Create account and accept
          </Button>
        </form>
      )}

      {error ? (
        <p className="mt-4 text-sm text-critical" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted">Loading…</p>}>
      <InviteAcceptFlow />
    </Suspense>
  );
}
