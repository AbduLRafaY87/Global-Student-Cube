# Auth walkthrough (AUTH-01–05, AUTH-08–09)

Prerequisites the owner configures (not this slice):

1. Create the Supabase project in **EU Frankfurt** if available.
2. Set Site URL to the web origin (local: `http://localhost:3000`).
3. Redirect URLs: `http://localhost:3000/auth/callback` and the production callback.
4. Configure Resend (or the Auth email provider) for confirmation and reset mail.
5. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `GSC_CONTACT_ENCRYPTION_KEY` (32+ character secret, never sent to the browser).

Remote database: link the CLI to the **dev** project (`npx supabase link --project-ref <ref>`), `npx supabase db push` if migrations are pending, then `npm run dev`. There is no local/Docker database. See `docs/database-workflow.md`.

## AUTH-01 Eligibility (`/register`)

- Open `/signup`; it must redirect to `/register`.
- There is no role picker. Copy states everyone registers as a student.
- Continue stays disabled until a purpose and **Yes** are selected.
- Select **No**: truthful guest exit appears, Continue as guest goes to `/`, and no account is created (sessionStorage may hold the No answer only until you leave; submitting never runs).
- Select **Yes** and a purpose, Continue → `/register/identity`.

## AUTH-02 Identity (`/register/identity`)

- Enter a full name with an apostrophe or hyphen; surname suggestion appears; edit or confirm it.
- Future or impossible dates are rejected.
- Date of birth that makes the person **12** on today’s date: independent signup stops; guest action only.
- Date that makes the person **13–17**: guardian notice is shown; Continue remains available.
- Adult date: Continue → `/register/contact`.
- Country precedes city. “Unlisted city” is available.

## AUTH-03 Contact (`/register/contact`)

- Password shorter than 12, 129 characters, or missing upper/lower/number/symbol fails.
- A valid password containing a space (`Valid Pass1!`) is accepted and must not be trimmed.
- WhatsApp same-as-phone can be unchecked; registration still continues.
- Continue → `/register/review`.

## AUTH-04 Consent (`/register/review`)

- Summary is a definition list, not a table.
- No evidence upload.
- Required data-use checkbox is unchecked by default; optional email/WhatsApp notices are unchecked.
- Seeking-university requires passport status.
- Adults need at least one `https://` profile URL; 13–17 do not.
- Submit creates Auth user + `accounts` / `identities` / `cases` / immutable `consent_events` / GSC id, then `/verify-email`.
- Duplicate email offers log in without extra account details.

## AUTH-05 Email verification (`/verify-email`)

- Address is masked.
- Resend is disabled during the 60-second countdown; a fifth-plus hourly send is rejected.
- Expired/used callback (`/auth/callback` without a valid code) returns here or to reset with resend, not a generic crash.
- **I have verified** after clicking the email link continues to `/profile`.
- Unverified sessions cannot open `/profile` (proxy and dashboard layout both redirect here).

## AUTH-08 Login (`/login`)

- Wrong password shows **Email or password is incorrect.** (same text if the email is unknown).
- Five failures in 15 minutes for the same IP+email show a retry-time throttle message.
- Unverified successful login goes to `/verify-email`.
- Suspended account is signed out and told the account is suspended.
- `?next=https://evil.example` is ignored; only same-origin paths are used.

## AUTH-09 Password reset (`/password-reset`)

- Request always shows the generic “if an account exists” confirmation.
- Email link lands on `/auth/callback?next=/password-reset` then `/password-reset?state=new`.
- Saving a new password invalidates other sessions and returns to `/login`.
- Reusing the consumed link/token cannot change the password (`expired` / already-used).

## Checks that are automated

- `npm run test:unit` — password bounds, spaces, under-13 routing, consent payload, GSC rollover, unverified redirect, reset-token reuse.
- `npx supabase test db` — `auth_identity.test.sql` (GSC format, under-13 command reject, trigger ignores `role=admin`, consent immutable, reset-token reuse, case + GSC row).
