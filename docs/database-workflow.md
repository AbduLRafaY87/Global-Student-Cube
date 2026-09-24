# Database workflow (remote only)

This project never runs Postgres on a developer machine or in CI. There is no Docker, no `docker-compose`, and no `supabase start`. The CLI talks to a **linked remote** Supabase project over the network.

We keep two hosted projects:

| Project | Who uses it | Purpose |
| --- | --- | --- |
| **dev** | developers | Daily app work. `.env.local` points here. |
| **test** | CI / automated pgTAP | Schema + RLS tests. Do not use it as your daily app. |

## Link to the dev project

```bash
npx supabase login
npx supabase link --project-ref <dev-project-ref>
```

Copy the project's API URL and anon key into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Put the service role key and the Database connection string in `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_URL`. After `0029_command_architecture.sql` is applied, `ALTER ROLE gsc_api_executor LOGIN PASSWORD '...'` and set `COMMANDS_DATABASE_URL` to that role’s URI. Those last three are server-only. The app must not use `SUPABASE_SERVICE_ROLE_KEY` to write `user_profiles` or `applications`.

`link` does not start a local database.

## Push a new migration

1. Add a **new** file under `supabase/migrations/`. Never edit a file that already ran on a shared project.
2. From the repo root, with the CLI still linked to **dev**:

```bash
npx supabase db push
```

`supabase migration up --linked` applies pending files the same way. If a prompt says `supabase db reset`, treat it as `supabase db push --linked` and tell the owner the prompt is out of date.

## Run tests against the test project

Do not run destructive resets or experimental SQL on a shared populated **dev** database.

```bash
npx supabase link --project-ref <test-project-ref>
npx supabase db push --linked
npx supabase test db --db-url "$SUPABASE_DB_URL"
```

CI does the same with GitHub secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_TEST_PROJECT_REF`, `SUPABASE_DB_URL` (percent-encode special characters), plus the test project's `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `GSC_CONTACT_ENCRYPTION_KEY`. If `supabase link` asks for a database password in CI, add `SUPABASE_DB_PASSWORD` as a secret as well.

Domain unit tests (`npm run test:unit`) do not need a database.

## Clean slate (new remote project, not a reset)

Never `supabase db reset` against shared **dev**. If you truly need an empty database:

1. Create a new project in the [Supabase dashboard](https://supabase.com/dashboard) or `npx supabase projects create`.
2. `npx supabase link --project-ref <new-ref>`
3. Point `.env.local` at that project's API URL, anon key, service role key, and `SUPABASE_DB_URL`.
4. `npx supabase db push`

## Why not a local / Docker database

- No Docker install on developer machines or CI.
- Migrations, Auth, and RLS run on the same hosted product the app uses, not a container approximation.
- Dev and CI stay isolated: daily work hits **dev**; automated tests hit **test**.
