# Global Student Cube

Responsive Next.js (App Router) web app with a Supabase Postgres backend. Public signup creates **student** accounts only. Parent, counselor, and admin roles are granted after signup by an existing administrator (or a one-time SQL bootstrap for the first admin).

## Prerequisites

- Node.js 20+
- npm
- A **remote** Supabase project for development (and a second remote project for CI/tests)
- Supabase CLI (the `supabase` package in `devDependencies`; use `npx supabase`)

This repository does **not** use Docker, docker-compose, or `supabase start`. There is no local Postgres.

## Local setup

```bash
npm ci
cp .env.example .env.local
```

1. Create (or reuse) a remote **dev** project in the [Supabase dashboard](https://supabase.com/dashboard), or `npx supabase projects create`.
2. Link the CLI. This does not start a database on your machine:

```bash
npx supabase login
npx supabase link --project-ref <dev-project-ref>
```

3. In `.env.local` set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from that project's **Settings → API**. Set server-only `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` (Settings → Database connection string), `COMMANDS_DATABASE_URL` (`gsc_api_executor` URI after `ALTER ROLE … LOGIN`), and `GSC_CONTACT_ENCRYPTION_KEY`.
4. Apply any migrations that are not yet on the remote project (see below).
5. Start the Next.js app:

```bash
npm run dev
```

Open `http://localhost:3000`. The app talks to the linked remote project over the network.

Database workflow (link, push, test project, clean-slate): `docs/database-workflow.md`.

## Environment variables

All variables the app and CLI read are listed in `.env.example`. Only `NEXT_PUBLIC_*` values may reach the browser.

| Variable | Used by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/proxy.ts` | **Dev** project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same | Publishable anon key; Row Level Security enforces access |
| `SUPABASE_SERVICE_ROLE_KEY` | Auth Admin API only (not table writes) | Server only. Never `NEXT_PUBLIC_` |
| `SUPABASE_DB_URL` | CLI migrations/tests | Server-only Postgres URI. Never `NEXT_PUBLIC_` |
| `COMMANDS_DATABASE_URL` | `src/server/executor.ts` | `gsc_api_executor` URI. Server only. Never `NEXT_PUBLIC_` |
| `GSC_CONTACT_ENCRYPTION_KEY` | contact encryption | Server only |

## Database migrations

SQL lives in `supabase/migrations/` and applies in filename order on the **linked remote** project.

- Do not edit a migration that has already been applied. Add a new numbered file.
- `0000_initial_schema.sql` still creates older shapes (`public.users`, FKs that do not match the app). Later files correct this. `0025_identity_schema_cleanup.sql` drops `public.users` and points `student_profiles.user_id` and `applications.student_id` at `auth.users`. `0026_role_change_guard.sql` asserts that final shape.
- `0013_reserved.sql` is a no-op. See `supabase/migrations/README.md`.

Apply new files to the linked **dev** project:

```bash
npx supabase db push
```

(`supabase migration up --linked` is the same idea: apply pending files over the network. Never `supabase start`.)

**Never run a destructive reset against a shared dev project.** `supabase db reset` is not part of this workflow. If you genuinely need an empty database, create a **new** remote project (dashboard or `npx supabase projects create`), `npx supabase link --project-ref <new-ref>`, point `.env.local` at that project's API URL, anon key, service role key, and `SUPABASE_DB_URL`, then `npx supabase db push`.

CI uses a separate remote **test** project. It links with `SUPABASE_ACCESS_TOKEN` and `SUPABASE_TEST_PROJECT_REF`, runs `npx supabase db push --linked`, then runs database tests against `SUPABASE_DB_URL`. It does not start Docker or a local database.

## Admin bootstrap

`set_user_role(uuid, text)` can change roles only when `is_admin()` is true, so the **first** admin cannot be created through the app.

1. Sign up the intended owner through `/register` (the account is created as `student`).
2. Open the Supabase SQL editor as the project owner (postgres).
3. Copy `scripts/bootstrap-admin.sql`, replace `REPLACE_WITH_ADMIN_EMAIL`, and run it once.
4. Confirm `user_profiles.role = 'admin'` for that user.
5. Later role changes: call `public.set_user_role(target_user_id, target_role)` as that admin. Direct `UPDATE` of `user_profiles.role` is rejected by trigger `user_profiles_prevent_role_change` unless the transaction-local setting `gsc.role_change_allowed` is `on` (set only inside `set_user_role` after the admin check, and in the bootstrap script).

## Tests

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run test:unit
npx supabase link --project-ref <test-or-dev-project-ref>
npx supabase db push --linked
npx supabase test db --db-url "$SUPABASE_DB_URL"
```

Use the dedicated **test** project for `supabase test db`, not a shared populated dev database. `supabase/tests/rls_p0.test.sql` is a pgTAP suite: a new student cannot self-promote or read another user's private rows or admin data; parent, counselor, and admin each see only what policies allow; anon `SELECT` is empty on every public table; every public table has RLS.

Evidence that a newly created student cannot reach admin data or become admin: `docs/security/p0-verification.md`.

## CI

`.github/workflows/ci.yml` runs `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run test:unit`, `npm run build`, then links the remote **test** project (`SUPABASE_ACCESS_TOKEN` + `SUPABASE_TEST_PROJECT_REF`), `npx supabase db push --linked`, and `npx supabase test db --db-url "$SUPABASE_DB_URL"`. Any non-zero exit fails the job. Required GitHub secrets are listed in `docs/database-workflow.md`.

## Deployment (Vercel + Supabase)

1. Create a Supabase project. Link and `npx supabase db push`. Do not skip files.
2. Bootstrap the first admin with `scripts/bootstrap-admin.sql` in the SQL editor.
3. In the Supabase Auth URL configuration add:
   - `https://<your-vercel-domain>/auth/callback`
   - `http://localhost:3000/auth/callback` for local OAuth
4. If using Google OAuth, the provider callback is `https://<project-ref>.supabase.co/auth/v1/callback`.
5. On Vercel, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and server-only keys in the server environment). Deploy the Next.js app from this repository. There is no `pages` router.
6. Confirm RLS still holds after deploy by repeating the steps in `docs/security/p0-verification.md` against the hosted project (SQL editor as a student JWT, or pgTAP against the remote test project).
