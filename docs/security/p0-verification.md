# P0 verification: a new student cannot become admin or read admin data

This record is for SCOPE-ALIGNMENT.md §2.1 (self-promotion and admin data exposure) and the specification sections *Database enforcement and sensitive resource security* and *Threat model and data-quality invariants*.

It does **not** close SCOPE §2.2 (identical navigation for all roles).

## What must be true

A freshly created account:

1. Has `user_profiles.role = 'student'` even if signup metadata claims another role (`handle_new_user` always inserts `student`).
2. Cannot `UPDATE user_profiles.role` through the anon key / `authenticated` role. The trigger `user_profiles_prevent_role_change` raises unless the transaction-local setting `gsc.role_change_allowed` is `on`.
3. Cannot call `set_user_role` successfully (`is_admin()` is false).
4. Cannot `SELECT` another user's `user_profiles` or `applications`.
5. Cannot `SELECT` admin-owned `notifications` or `subscriptions`, or the admin's `user_profiles` row.
6. Cannot read private rows on any other RLS table that belongs to a different user.

`set_user_role` may change a role only after `is_admin()` and `set_config('gsc.role_change_allowed', 'on', true)`. The first admin is created with `scripts/bootstrap-admin.sql` in the SQL editor, not through the app.

## Procedure (remote test project)

From the repository root. Do not install Docker or run `supabase start`.

```bash
npx supabase link --project-ref <test-project-ref>
npx supabase db push --linked
npx supabase test db --db-url "$SUPABASE_DB_URL"
```

`supabase/tests/rls_p0.test.sql` inserts five `auth.users` rows (the signup trigger creates `user_profiles` as `student`), then promotes parent/counselor/admin **as postgres** with the same GUC the bootstrap script uses. It then `SET ROLE authenticated` with JWT `sub` claims and asserts the cases above. Anon is `SET ROLE anon`; catalog and private policies are `TO authenticated`, so anon `SELECT` returns no rows on every public table.

Optional manual check against a hosted project (the SQL editor is postgres and **bypasses RLS**; do not use it as the student). Use a client that only has the anon key and the student JWT:

1. Sign up a new email at `/signup`. Confirm `role = student`.
2. `UPDATE user_profiles SET role = 'admin' WHERE id = auth.uid()`. Expect `User roles can only be changed through the admin role function`.
3. `SELECT` `user_profiles` without filtering to `auth.uid()`. Expect only the caller's row.
4. Open `/admin`. Expect the non-admin empty state, not other users' counts driven by `user_profiles_select_admin`.

First-admin bootstrap (project owner only): `scripts/bootstrap-admin.sql`.

## Results (19 Sep 2026)

Historical record from before the remote-only workflow. The commands below used a local stack that this repo no longer supports. Re-run the **Procedure** against the remote **test** project.

### Commands

| Command | Exit | Evidence |
| --- | --- | --- |
| `npm run lint` | 0 | ESLint completed with no errors |
| `npx tsc --noEmit` | 0 | no output |
| `npm run build` | 0 | Next.js 16.3.5 compiled; 30 routes |
| `npx supabase db reset --yes` | 0 | Applied `0000` through `0026` including `0013_reserved.sql` and `0026_role_change_guard.sql`; finished with `Reset local database.` |
| `npx supabase test db` | 0 | `rls_p0.test.sql .. ok` — **All tests successful. Files=1, Tests=70. Result: PASS** |

`0026_role_change_guard.sql` itself raises if `public.users` exists or if the two identity FKs do not target `auth.users`. Reset reaching “Finished” means those asserts passed.

### Schema after reset

Queried with `npx supabase db query --local`:

| Check | Result |
| --- | --- |
| `to_regclass('public.users')` | `null` (`public.users` is gone) |
| `student_profiles.user_id` FK | `auth.users` |
| `applications.student_id` FK | `auth.users` |

RLS enabled (`relrowsecurity = true`) on every public table and on `storage.objects`:

`public.activities`, `public.admission_offers`, `public.alumni_profiles`, `public.applications`, `public.counselor_assignments`, `public.documents`, `public.essays`, `public.housing_options`, `public.interview_sessions`, `public.messages`, `public.notifications`, `public.parent_student_links`, `public.recommendations`, `public.scholarships`, `public.student_profiles`, `public.subscriptions`, `public.tasks`, `public.test_scores_log`, `public.universities`, `public.user_profiles`, `public.visa_checklists`, `storage.objects`.

### pgTAP cases (all passed)

| Check | Result |
| --- | --- |
| Fresh signup remains `student` | pass |
| Student cannot change own role (trigger `P0001`) | pass |
| Student cannot call `set_user_role` | pass |
| Student cannot read another `user_profiles` / `applications` | pass |
| Student cannot read admin `user_profiles`, notifications, or subscription | pass |
| Student cannot read another user's row on documents, essays, recommendations, test_scores_log, messages, interview_sessions, tasks, activities, visa_checklists, admission_offers | pass |
| Student can read catalog tables (universities, scholarships, housing_options, alumni_profiles) and own assignment | pass |
| Linked student cannot `SELECT parent_student_links` (parent-only select policy) | pass |
| Parent sees linked student applications/tasks/profile only; not documents; not unlinked student | pass |
| Counselor sees assignment counterpart profile and messages; not applications; not unassigned student | pass |
| Admin can read all profiles/applications; `set_user_role` works | pass |
| Direct `UPDATE` of `role` still fails after `set_user_role` (GUC is transaction-local to the function call; tests clear it before the next role) | pass |
| Anon `SELECT` is empty on every public table | pass |
| Every public table + `storage.objects` has RLS | pass |

### TAP transcript

```text
Connecting to local database...
/Documents/Web Development/global-student-cube/supabase/tests/rls_p0.test.sql .. ok
All tests successful.
Files=1, Tests=70,  1 wallclock secs
Result: PASS
```

CI repeats lint, `tsc --noEmit`, unit tests, build, then `supabase link` + `db push --linked` + `test db --db-url` against the remote test project in `.github/workflows/ci.yml`. No Docker.
