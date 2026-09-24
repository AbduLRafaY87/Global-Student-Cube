# Implementation progress

Last recomputed: 24 Sep 2026, by inspecting the current tree only.

No live Supabase project is linked. Nothing in this file was proven against a remote database. Historical local-Docker `supabase db reset` / `supabase test db` results (19 Sep 2026: 84/84) are **not** current evidence.

Status vocabulary (use only these):

| Status | Meaning |
|--------|---------|
| **Not started** | No spec-faithful implementation in the tree |
| **Partial** | Leftover prototype or incomplete code exists; not spec-complete and not proven |
| **Written, unverified** | Spec-aligned code or SQL is in the tree; not proven on a linked Supabase project |
| **Checked (no DB)** | Proven locally without a database: file inspection, or a recorded lint / `tsc` / `npm run test:unit` / `npm run build` run |
| **Done** | Every acceptance line has current evidence. Unused until a linked project + CI + walkthrough exist |
| **Deferred** | Owner decision: later phase |
| **Removed** | Owner decision: do not build |

Done is unused on purpose. Do not treat Written, unverified as Done.

## Verification that is blocked until a Supabase project is linked

These cannot be marked Done, and must not be cited as current evidence, until a remote project exists, the CLI is linked, and (for CI) GitHub secrets are set.

1. `supabase link --project-ref <ref>` against a real project (dev and a separate test project).
2. `supabase db push --linked` applying migrations `0000`–`0030` (including `0026`, `0027`, `0029_command_architecture.sql`, and `0030_invitations_roles_mfa.sql`) to that project.
3. Confirm `public.handle_new_user()` on the remote project always inserts `role = 'student'` (stop-ship).
4. Confirm the role-change trigger / `users_role_immutable` equivalent is live on the remote project (stop-ship).
5. `supabase test db --db-url "$SUPABASE_DB_URL"` for `rls_p0`, `auth_identity`, `command_layer`, and `invitations_mfa`.
6. GitHub Actions `ci.yml` job `supabase-pgtap` (link test project, `db push --linked`, `test db --db-url`).
7. `npm run build` against a real `.env.local` with remote `NEXT_PUBLIC_SUPABASE_*` (build itself does not need the DB, but a production-shaped env has never been used on a linked project).
8. AUTH-01–05 / 08 / 09 walkthrough in `docs/qa/auth-walkthrough.md` against the remote project (register, email verify, login throttle, password reset single-use, under-13 / 13–17 / adult, suspended sign-out).
9. P0 procedure in `docs/security/p0-verification.md` against the remote project (role-change SQL rejection, student RLS isolation, privilege-path audit+outbox same transaction).
10. `scripts/bootstrap-admin.sql` executed on the remote project (admin is never created by public signup).
11. Confirm `0028_countries_seed.sql` (234 ISO countries) is actually present in `public.countries` on the remote project.
12. Confirm `commands.*` are executable only by `gsc_api_executor` (public service-role wrappers dropped in `0029`). Direct `authenticated` INSERT/UPDATE/DELETE on `user_profiles` and `applications` is denied.
13. Confirm contact-encryption env (`GSC_CONTACT_ENCRYPTION_KEY`) works end-to-end on register (ciphertext in DB, not plaintext phone).
14. Confirm Resend (or whatever outbound mail is configured) delivers verification and reset mail from the remote project.
15. Confirm Site URL and redirect allow-list on the remote Auth settings match `docs/database-workflow.md`.
16. `ALTER ROLE gsc_api_executor LOGIN PASSWORD '…'` and set `COMMANDS_DATABASE_URL`. Prove `PATCH /api/v1/me` and leftover application writes go through the executor (audit + outbox in the same transaction).
17. Re-run identity register/login/reset against the executor path (no `service_role` RPC).

Owner still owes: create remote projects (EU Frankfurt if available), Site URL / redirects, Resend, `supabase link`, `ALTER ROLE gsc_api_executor LOGIN`, GitHub secrets including `COMMANDS_DATABASE_URL`.

## What was actually checked (no live database)

Command-layer implementation pass (24 Sep 2026). No linked Supabase project. No `db push`. No pgTAP.

| Check | Result | Date |
|-------|--------|------|
| `npm run lint` | 0 errors | 24 Sep 2026 (AUTH gap-fill) |
| `npx tsc --noEmit` | 0 errors | 24 Sep 2026 (WP-01 pass) |
| `npm run test:unit` | 50/50 via `scripts/run-unit-tests.mjs` (not shell globs; `node --test` hangs silently on unmatched globs on Windows/Node 24) | 24 Sep 2026 (ADM catalog editorial) |
| `npm run build` | 0 errors | 24 Sep 2026 (AUTH gap-fill) |
| 360px shell | `/design` at 360×800; More opens Discover/Apply/Prepare/Decide/Support; `scrollWidth === 360` | 24 Sep 2026 |
| `supabase db push --linked` / `supabase test db` | Not run. No project linked. | |

UI primitives under `src/components/ui/` and `/design` exist. `/design` calls `notFound()` when `NODE_ENV === "production"`. 360px shell was re-checked on 24 Sep 2026 (see table above).

## Infrastructure and process (Docker removal, CI, docs)

| Item | Status | Evidence |
|------|--------|----------|
| No-Docker rule in `.cursor/rules/gsc-project-rules.mdc` | Checked (no DB) | File contains the rule; `db push --linked` is the verify step |
| `README.md` remote-only setup | Checked (no DB) | File rewritten; no `supabase start` / Docker as required setup |
| `.env.example` remote-only + `SUPABASE_DB_URL` + `COMMANDS_DATABASE_URL` | Checked (no DB) | File inspected |
| `docs/database-workflow.md` | Checked (no DB) | File exists; two-project (dev + test) workflow |
| `docs/qa/auth-walkthrough.md` | Written, unverified | Procedure written; not executed on a linked project |
| `docs/security/p0-verification.md` | Written, unverified | Procedure rewritten for remote. 19 Sep results labelled historical / local Docker |
| `supabase/migrations/README.md` | Checked (no DB) | Push-not-reset wording |
| `supabase/config.toml` | Checked (no DB) | Ports labelled unused CLI defaults; not a local stack |
| `.github/workflows/ci.yml` | Written, unverified | YAML uses `supabase link` + `db push --linked` + `test db --db-url`. Job has never run with real secrets |
| Tree search: no operational `supabase start` / `db reset` / `54322` as required steps | Checked (no DB) | Remaining mentions are historical labels or unused CLI defaults |

## Migrations and SQL tests

| Item | Status | Evidence |
|------|--------|----------|
| `supabase/migrations/0000`–`0025` (schema + RLS + seed) | Written, unverified | Files in tree; never pushed to a linked project |
| `0033`–`0035` catalog + ingestion | Written, unverified | Reference data, programs, publication, ingestion/import/review-due. Not applied remotely |
| `0013_reserved.sql` | Written, unverified | No-op placeholder; `users` table does not exist |
| `0026_role_change_guard.sql` | Written, unverified | File in tree; stop-ship. Not applied remotely |
| `0027_identity_command_layer.sql` | Written, unverified | `accounts`, `identities`, `cases`, `consent_events`, GSC counter, `commands.*`, `handle_new_user` always `'student'`. Not applied remotely |
| `0028_countries_seed.sql` | Written, unverified | 234 ISO countries in the file. Not applied remotely |
| `0029_command_architecture.sql` | Written, unverified | `gsc_api_executor`, version columns, idempotency_records, profile/application commands, revoke mutations, drop public wrappers. Not applied remotely |
| `0030_invitations_roles_mfa.sql` | Written, unverified | invitations, parent_invitations, parent_links, staff_permissions, mfa_recovery_codes, grant/accept commands, set_user_role wrapper. Not applied remotely |
| `supabase/tests/invitations_mfa.test.sql` | Written, unverified | Public signup stays student; expired/reused invite; counselor without aal2; no self-grant; set_user_role only. Not run remotely |
| `supabase/tests/rls_p0.test.sql` | Written, unverified | File exists. Not run against a linked project |
| `supabase/tests/auth_identity.test.sql` | Written, unverified | File exists. Not run against a linked project |
| `supabase/tests/command_layer.test.sql` | Written, unverified | Direct writes denied; executor path; atomic failure. Not run against a linked project |
| `scripts/bootstrap-admin.sql` | Written, unverified | File exists. Not executed remotely |
| `supabase/seed.sql` | Written, unverified | File exists. Not applied remotely |

## Domain / app code (no live database required to exist; not proven end-to-end)

| Item | Status | Evidence |
|------|--------|----------|
| `src/domain/identity/*` + `identity.test.ts` | Written, unverified | Code present. Unit file exists; last recorded 21/21 on 19 Sep, not re-run |
| `src/domain/navigation.ts` + `navigation.test.ts` | Written, unverified | Code present. Same unit-run caveat |
| `src/server/commands/register-student.ts`, `abuse.ts` | Written, unverified | Now call `commands.*` via `gsc_api_executor` / `pg`, not `service_role` RPC |
| `src/server/executor.ts`, `context.ts`, `errors.ts` | Written, unverified | Module-level pool, `finally` release, single-digit max, connect timeout. Needs `COMMANDS_DATABASE_URL` |
| `src/lib/supabase/admin.ts`, `src/lib/crypto/contact.ts` | Written, unverified | Admin client kept for Auth Admin API only. Needs encryption key on a real project |
| `/api/v1/auth/*` (6 routes) | Written, unverified | Files exist (see REST table). Identity writes now go through the executor |
| `PATCH /api/v1/me`, leftover `/api/v1/applications` | Written, unverified | Command path. After 0032, leftover creates open a `direct` group. Retire at Prompt 17. Never hit a linked project |
| `docs/architecture/command-layer.md` | Written, unverified | Add-a-command steps + serverless pool constraint |
| AUTH screens (register, login, password-reset, verify-email) | Written, unverified | Pages exist. Walkthrough not run on remote |
| `src/proxy.ts` unverified-email + suspended sign-out | Written, unverified | Code present. Not proven against remote Auth users |
| `(dashboard)/layout.tsx` redirects unverified to `/verify-email` | Written, unverified | Code present |
| `(auth)/signup/page.tsx` | Written, unverified | `redirect("/register")` only |
| Design-system UI + `/design` | Written, unverified | Code present. `/design` hidden in production via `notFound()` |
| Role-based nav (`src/domain/navigation.ts`) | Written, unverified | Student bottom nav ≤5; parked modules omitted from nav |

## Screen catalogue (spec §11)

| ID | Screen | Route in repo | Status | Evidence |
|----|--------|---------------|--------|----------|
| PUB-01 | Marketing home | `/` | Partial | Leftover marketing page, not spec landing |
| PUB-02 | How it works | — | Not started | |
| PUB-03 | Pricing | — | Not started | |
| PUB-04 | Trust and safety | — | Not started | |
| PUB-05 | Counselor directory | — | Not started | |
| AUTH-01 | Role, purpose and eligibility | `/register` | Written, unverified | D2: no role picker. Eligibility Yes/No + stage. Domain unit file exists; no remote walkthrough |
| AUTH-02 | Identity and age routing | `/register/identity` | Written, unverified | Name rules, DOB, nationality, residence, under-13 stop / 13–17 notice. Not proven remotely |
| AUTH-03 | Contact and password | `/register/contact` | Written, unverified | Spec 12–128 password policy. WhatsApp optional. Not proven remotely |
| AUTH-04 | Privacy notice and consent | `/register/review` | Written, unverified | Consent only (no evidence upload). Policy link `/privacy?document=data-use`. Immutable `consent_events` in SQL. Not proven remotely |
| AUTH-05 | Email verification | `/verify-email` | Written, unverified | Resend cooldown, change email, expired callback, activation via executor. Not proven remotely |
| AUTH-06 | Phone verification | — | Deferred | Owner: late phase |
| AUTH-07 | Approval, guardian and correction status | — | Removed | D2 |
| AUTH-08 | Login | `/login` | Written, unverified | Generic errors; 5/15 min throttle analog; suspended sign-out. Not proven remotely |
| AUTH-09 | Password reset | `/password-reset` | Written, unverified | Request + confirm on one route. Token reuse rejected. Not proven remotely |
| AUTH-10 | MFA enrollment and challenge | `/mfa` | Written, unverified | TOTP enroll/challenge, recovery-code reveal, proxy aal2 guard. Not proven remotely |
| ONB-01 | Intake welcome | — | Not started | |
| ONB-02 | Study goals | — | Not started | |
| ONB-03 | Academics | — | Not started | |
| ONB-04 | Budget and constraints | — | Not started | |
| ONB-05 | Preferences | — | Not started | |
| ONB-06 | Intake review | — | Not started | |
| STU-01 | Student home | — | Not started | `/profile` leftover is not this screen |
| STU-02 | Profile view / edit | `/profile` | Partial | Leftover form, not spec STU-02. `student_profiles` remains a command-layer gap until Prompt 12 |
| STU-03 | Academic record | `/test-prep` | Partial | Folded Test Prep leftover; not spec STU-03 |
| STU-04 | Test scores | — | Not started | |
| STU-05 | Activities | `/activities` | Partial | Folded leftover |
| STU-06 | Shortlist | — | Not started | `/recommendations` leftover is not this |
| STU-07 | Documents | `/documents` | Partial | Folded leftover |
| STU-08 | Readiness | — | Not started | |
| PAR-01 | Parent dashboard | `/parent` | Partial | Leftover |
| PAR-02 | Linked student | — | Not started | |
| PAR-03 | Consent and sharing | — | Not started | |
| CAT-01 | University search | `/universities` | Partial | Reads `catalog_universities_public` only. Empty published catalog is valid. D5 `acceptance_rate` removed |
| CAT-02 | University profile | — | Not started | |
| CAT-03 | Program profile | — | Not started | |
| CAT-04 | Cost comparison and financial readiness | — | Not started | |
| CAT-05 | Program self-assessment | — | Not started | |
| CAT-06 | Saved shortlist and counselor-review flags | — | Not started | Save never opens an application group |
| CAT-07 | Scholarship search | `/scholarships` | Partial | Leftover prototype now reads `leftover_scholarships`. Spec scholarships are unpublished/empty |
| CAT-08 | Scholarship profile | — | Not started | |
| SES-01 | Counselor search | `/counselors` | Partial | Leftover |
| SES-02 | Counselor profile | — | Not started | |
| SES-03 | Availability | — | Not started | |
| SES-04 | Book session | — | Not started | |
| SES-05 | Booking confirmed | — | Not started | |
| SES-06 | Reschedule / cancel | — | Not started | |
| SES-07 | Join session | — | Not started | |
| SES-08 | Session workspace | — | Not started | |
| SES-09 | Session notes | — | Not started | |
| SES-10 | Session recap | — | Not started | |
| SES-11 | Session history | — | Not started | |
| SES-12 | Tasks | `/timeline` | Partial | Folded leftover |
| ESS-01–07 | Essays | `/essays` leftover page | Deferred | Parked; page exists, omitted from nav, must not be extended |
| OFF-01–04 | Offers | `/offers` leftover page | Deferred | Parked; same rule |
| MEN-01 | Mentor directory | `/alumni` | Partial | Folded leftover |
| MEN-02 | Mentor profile | — | Not started | |
| MEN-03 | Request mentorship | — | Not started | |
| MEN-04 | Mentorship thread | — | Not started | |
| MSG-01 | Inbox | `/messages` | Partial | Leftover |
| MSG-02 | Thread | `/messages` ChatWindow | Partial | Leftover |
| MSG-03 | New conversation | — | Not started | |
| MSG-04 | Report / block | — | Not started | |
| REC-01–03 | Recommendation letters | — | Deferred | Parked; no leftover page |
| ADM-01 | Admin overview | `/admin` | Written, unverified | Real queue counts; unpermitted metrics omitted. No applicant evidence. |
| ADM-02 | Professional / guardian review | `/admin/approvals` | Written, unverified | No student approval queue (D2). Guardian-link for minors only. |
| ADM-03 | Data ingestion submission | `/admin/ingestion/new` | Written, unverified | Allowlisted URL, timestamp/hash/excerpt only. Import dry-run. Never auto-publish. |
| ADM-04 | Extracted data review and reconciliation | `/admin/ingestion/:jobId/review` | Written, unverified | Per-field accept/reject. Reviewer recorded. Live values unchanged on reject. |
| ADM-05 | Catalog management | `/admin/catalog` | Written, unverified | Entity selectors, review-due queue, import entry. Visa selector notes ADM-09 is not built. |
| ADM-06 | University and accommodation editor | `/admin/universities/:universityId` | Written, unverified | Draft/source/publish. No acceptance-rate field. Withdraw keeps history. |
| ADM-07 | Program and pricing editor | `/admin/programs/:programId` | Written, unverified | Annual vs full-program fees. Gated application URL excluded from public payloads. |
| ADM-08 | Entry requirement rules | `/admin/programs/:programId/requirements` | Written, unverified | Per-criterion draft + source. Publish versions rules. |
| ADM-09 | Visa and destination guidance editor | — | Not started | |
| ADM-10 | Rewards verification and fulfillment | — | Not started | |
| ADM-11 | Moderation, quality and safety review | — | Not started | |
| ADM-12 | Operational and outcome analytics | — | Not started | |
| ADM-13 | Jobs, delivery and integration operations | — | Not started | Ingestion creates a durable job row; ADM-13 runner is not built. |
| ADM-14 | Scholarship URL and metadata editor | `/admin/scholarships/:scholarshipId` | Written, unverified | Official URL + minimal metadata. No in-app scholarship application schema. |
| ADM-15 | Learning, news and recognition content editor | — | Not started | |
| JRN-01 | Selected-target application roadmap | — | Not started | Closest real spec apply screen; leftover `/applications` is not this |
| JRN-02 | Journey article | `/visa` | Partial | Folded leftover |
| JRN-03 | Journey by stage | — | Not started | |
| SET-01 | Account | — | Not started | |
| SET-02 | Security | — | Not started | |
| SET-03 | Notifications | — | Not started | |
| SET-04 | Privacy | — | Not started | |
| SET-05 | Linked people | — | Not started | |
| SET-06 | Appearance | `/settings` | Partial | Leftover |
| INT-01–04 | Interviews | `/interviews` leftover page | Deferred | Parked; same rule as essays |
| BIL-01–04 | Billing | `/billing` leftover page | Deferred | Parked; same rule |

Parked leftover pages (`/essays`, `/offers`, `/interviews`, `/billing`) are **Deferred**, not Partial. They must not be extended.

## Screen counts

| Status | Count |
|--------|-------|
| Not started | 40 |
| Partial (leftover prototype) | 15 |
| Written, unverified | 17 |
| Checked (no DB) | 0 (screens) |
| Done | 0 |
| Deferred | 23 (AUTH-06 + parked ESS-01–07, OFF-01–04, REC-01–03, INT-01–04, BIL-01–04) |
| Removed | 1 (AUTH-07) |
| **Total spec screens** | **96** |

APP-01–05 were **not spec screen IDs** (absent from the spec and `docs/spec-index.md`). They were removed from this catalogue. The spec application-adjacent screen is **JRN-01** (selected-target application roadmap). Leftover `/applications` remains a prototype, not a spec screen. Previous totals (97 / 48 not started) included those five invented rows.

AUTH Written, unverified (8): AUTH-01, 02, 03, 04, 05, 08, 09, 10.
Admin Written, unverified (9): ADM-01, 02, 03, 04, 05, 06, 07, 08, 14. People (`/admin/users`), audit viewer (`/admin/audit`) and Prompt 30 support stubs (`/admin/support`) are WP-15 routes, not extra spec screen IDs. Spec ADM-10 is rewards. Previous invented ADM-03–11 titles (role requests, Catalog CMS, Taxonomy, …) were replaced by spec IDs; that correction adds four screens (92 → 96).

Catalog authoring is **WP-07**. WP-04 is student profile. WP-13 is Mentorship. Neither changed in this slice. Real-country catalog data is an owner task, not an agent task.

Partial leftovers (15): PUB-01, STU-02, STU-03, STU-05, STU-07, PAR-01, CAT-01, CAT-07, SES-01, SES-12, MEN-01, MSG-01, MSG-02, JRN-02, SET-06.

Parked leftover *pages* (`/essays`, `/offers`, `/interviews`, `/billing`) still exist on disk. Those modules are counted as Deferred (not Partial) so they are not treated as in-progress work.

D5: `acceptance_rate` removed from leftover universities reads, types, and the database (0033). Admission Odds page, calculator, card, nav prefix, and landing copy deleted. CAT-05 remains Not started.

## REST API catalogue (spec §17.6)

Base path `/api/v1`. Auth handlers now include MFA and invitation routes. The previous PROGRESS claim “no `src/app/api/v1` handlers” was false.

| Spec method / path | Status | Repo path if different |
|--------------------|--------|------------------------|
| `POST /auth/register` | Written, unverified | `/api/v1/auth/register` |
| `POST /auth/login` | Written, unverified | `/api/v1/auth/login` |
| `POST /auth/logout` | Not started | |
| `POST /auth/password-reset` | Written, unverified | `/api/v1/auth/password-reset` |
| `POST /auth/password-update` | Written, unverified | `/api/v1/auth/password-reset/confirm` (path ≠ spec) |
| `POST /auth/email-verification` | Written, unverified | `/api/v1/auth/verify-email` (path ≠ spec) |
| `GET /me` | Not started | |
| `PATCH /me` | Written, unverified | `/api/v1/me` updates leftover `user_profiles` (not the full spec identity DTO) |
| leftover `POST/PATCH/DELETE /applications` | Written, unverified | Prototype 1:1 university rows. After 0032 each row belongs to a group. Retire this API when Prompt 17 ships. |
| `POST /me/email-change` | Written, unverified | `/api/v1/auth/change-email` (path ≠ spec) |
| `POST /auth/mfa/enroll`; `POST /auth/mfa/verify` | Written, unverified | plus leftover `/auth/mfa/challenge` and `/auth/mfa/status` |
| `POST /cases/{caseId}/parent-links` | Written, unverified | |
| `POST /parent-links/accept` | Written, unverified | |
| leftover `POST /invitations` create/preview/accept/revoke | Written, unverified | Staff/mentor/admin invites (D2). Not a named spec path |
| `GET /admin/verifications`; `POST /admin/verifications/{id}/decision` | Written, unverified | plus assign/comment/escalate |
| `POST /admin/guardian-verifications/{id}/decision` | Written, unverified | Same decide command |
| `GET /admin/audit` | Written, unverified | |
| leftover `GET /admin/overview`; `GET/POST /admin/users…`; `POST /admin/support/export|deletion` | Written, unverified | Support routes are Prompt 30 stubs |
| leftover `POST /admin/catalog/ingestion`; `…/review`; `…/reject`; `…/import`; `…/publish`; university/program/scholarship/accommodation/source-facts upserts | Written, unverified | Command-layer catalog editorial. Not spec-named paths |

## Automated test catalogue (spec §24.7)

Spec `T001`–`T080` remain **Not started** as named catalogue IDs. Existing tests are not those IDs:

| What exists | Status | Notes |
|-------------|--------|-------|
| `src/domain/identity/identity.test.ts` | Written, unverified | Overlaps T009 / T010 / T015 / T018 themes (MFA redirect, invite reuse, recovery codes) |
| `src/domain/catalog/catalog.test.ts` | Written, unverified | Publication transitions, page clamp, private DTO strip |
| `src/domain/catalog/ingestion.test.ts` | Written, unverified | Private hosts blocked; import rejects unsourced rows; never auto-publish |
| `supabase/tests/catalog.test.sql` | Written, unverified | Draft hidden; provenance required to publish; duration/ratio/amount-currency checks. Not run on a linked project |
| `supabase/tests/catalog_editorial.test.sql` | Written, unverified | Cannot publish without provenance; import rejects unsourced rows; withdraw hides from public views; audit written. SYNTHETIC only. Not run on a linked project |
| `src/domain/applications/systems.test.ts` | Written, unverified | Leftover group-state mapping; apply file purposes |
| `supabase/tests/application_systems.test.sql` | Written, unverified | No country inference; no invented fees; catalog_editorial required. Not run on a linked project |
| `src/domain/admin/admin.test.ts` | Written, unverified | Unauthorized variants, omitted queues, suspend availability |
| `src/domain/navigation.test.ts` | Written, unverified | Not a spec T-ID |
| `supabase/tests/admin_operations.test.sql` | Written, unverified | Scope denials, audit on decide/suspend/role, escalation outbox. Not run on a linked project |
| `supabase/tests/rls_p0.test.sql` | Written, unverified | Overlaps T001 / T002 / T004 / T007 themes. Not run on a linked project |
| `supabase/tests/auth_identity.test.sql` | Written, unverified | Overlaps T003 / T005 / T008 / T009 themes. Not run on a linked project |
| `supabase/tests/command_layer.test.sql` | Written, unverified | Direct-write deny, executor path, atomic rollback. Not run on a linked project |
| `src/server/errors.test.ts`, `src/server/http/headers.test.ts` | Written, unverified | Envelope / If-Match / unknown keys. No DB |

CI (`lint`, `typecheck`, `unit`) is Written, unverified: workflow file exists; no successful GitHub run on this branch is claimed here.

## Work-package tracker

| WP | Title | Status | Notes |
|----|-------|--------|-------|
| WP-00 | Repo, lint, tokens, CI skeleton + command architecture | Written, unverified | Command layer (`gsc_api_executor`, audit + outbox, `/api/v1` envelope) is in the tree. Not proven on a linked project. Not WP-01. |
| WP-01 | Design system + application shell | Written, unverified | Tokens, role-grouped shell, `/design`, role-guard tests. 360px shell checked 24 Sep 2026 (dev `/design`, CDP 360×800, More drawer, no horizontal overflow). Production hide of `/design` is code-only (`notFound()`). Contrast not measured with a meter. |
| WP-02 | Identity schema + RLS + seed | Written, unverified | Migrations through 0035. Never pushed to a linked project |
| WP-03 | AUTH-01 to AUTH-10 | Written, unverified (01–05, 08–10) | AUTH-10 `/mfa` written. AUTH-06 Deferred, AUTH-07 Removed |
| WP-04 | Student profile + academics + documents | Not started | Leftover `/profile`, `/documents`, `/test-prep` are Partial, not this WP |
| WP-05 | Intake | Not started | |
| WP-06 | Catalog read + search | Written, unverified | Public views + leftover `/universities` on published rows only. Pagination helper 1..50. Empty catalog works. Not CAT-01 complete. |
| WP-07 | Catalog authoring | Written, unverified | `0033`–`0035` tables, ingestion/import/review-due commands, ADM-03–08 and ADM-14 screens. SYNTHETIC fixtures test-only. No real-country data entered. Not pushed to a linked project. |
| WP-08 | Recommendations + shortlist + compare | Not started | |
| WP-09 | Deadlines + applications + groups | Written, unverified | `0032` systems/groups/fee+deadline+essay+document metadata + leftover backfill. No APP screens. No fee amounts. CAT-06 save does not open a group. |
| WP-10 | Scholarships | Written, unverified | Spec `scholarships` + public projection in `0034`. Leftover page still uses `leftover_scholarships`. |
| WP-11 | Sessions + availability + bookings | Not started | |
| WP-12 | Messaging + reports | Not started | |
| WP-13 | Mentorship | Not started | |
| WP-14 | Journey CMS | Not started | |
| WP-15 | Admin + cases + audit + flags | Written, unverified | ADM-01/02, people, audit viewer. Prompt 30 export/deletion are stubs (audit+outbox only). ADM-11/13 intros not built. Cases/flags remain. |
| WP-16 | Parent access | Not started | |
| WP-17 | Notifications + outbox worker | Not started | Outbox table may exist in migrations; worker is not built |
| WP-18 | Billing | Deferred | Parked |
| WP-19 | AI provider + essays | Deferred | Parked |
| WP-20 | Offers + interviews + rec letters | Deferred | Parked |
| WP-21 | Observability + load + a11y audit | Not started | |
| WP-22 | Production launch | Not started | Blocked on owner: remote projects, keys, legal |

## Known gaps (do not mark these Done)

- No linked Supabase project. All SQL, RLS, command RPCs, and pgTAP are unproven on the only database this repo is allowed to use.
- `student_profiles` is a known command-layer gap until Prompt 12 (STU-02). This slice does not revoke its grants and does not add a command for it. Direct Data API writes remain possible.
- Catalog schema (`0033`–`0035`) is written but not pushed to a linked project. Public catalog is empty until editorial publish. SYNTHETIC fixtures are excluded from `supabase/seed.sql`.
- Login lockout 5 failures / 15 minutes is an invented analog (spec silent). NEEDS OWNER to confirm or replace.
- Community-eligibility “Yes” is a client gate only; not a persisted column.
- GSC ID is allocated at signup (D2 removed approval). Status stays `email_pending` until verify. Spec said allocate on approval.
- Three auth API paths do not match spec §17.6 names (`password-update`, `email-verification`, `me/email-change`).
- Parked leftover pages still routable; hidden from nav only.
- `npm run lint` exit 0 and `test:unit` 50/50 on 24 Sep 2026 (no DB). `npm run build` / app `tsc` not re-claimed for this slice. pgTAP and `supabase db push --linked` still unverified. No real-country catalog data was entered.
- Prompt 30: `POST /admin/support/export` and `POST /admin/support/deletion` only write audit + outbox (`completed_by=prompt_30`). No export package, no 30-day deletion workflow.
- Admin people/safety belongs to WP-15, not WP-03 (AUTH).
