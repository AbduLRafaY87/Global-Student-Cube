# Implementation progress

Last recomputed: 25 Sep 2026, from a linked remote **dev** project plus this session's command output. Historical local-Docker `supabase db reset` / `supabase test db` results (19 Sep 2026: 84/84) are **not** current evidence.

Status vocabulary (use only these):

| Status | Meaning |
|--------|---------|
| **Not started** | No spec-faithful implementation in the tree |
| **Partial** | Leftover prototype or incomplete code exists; not spec-complete and not proven |
| **Written, unverified** | Spec-aligned code or SQL is in the tree; not proven on a linked Supabase project |
| **Checked (no DB)** | Proven locally without a database: file inspection, or a recorded lint / `tsc` / `npm run test:unit` / `npm run build` run |
| **Checked** | Proven on the linked remote project this session (push, pgTAP via `db query --linked`, or a counted SQL query). Not a full screen walkthrough |
| **Done** | Every acceptance line has current evidence including a walkthrough or CI job |
| **Deferred** | Owner decision: later phase |
| **Removed** | Owner decision: do not build |

Screens and API routes stay **Written, unverified** unless a walkthrough ran. A clean `db push` is not Done.

## Remote verification (25 Sep 2026)

Linked CLI talks to hosted project `bogqhfsdzvnqxdbsylho` (ap-southeast-2). Migrations `0000`–`0048` are on that project. `npx supabase test db --linked` failed because the CLI still tries to start Docker (`LegacyDockerRunError`). pgTAP files were executed with `npx supabase db query --linked -f supabase/tests/<file>.test.sql`. `BEGIN`/`ROLLBACK` is in each file; that is not the `pg_prove` harness.

| Check | Result | Date |
|-------|--------|------|
| `supabase db push --linked` | Applied `0000`–`0045` (owner), then `0046`, `0047`, `0048` this session | 25 Sep 2026 |
| `supabase test db --linked` / `--db-url` | Failed: CLI requires Docker. Not used as evidence | 25 Sep 2026 |
| pgTAP via `db query --linked` | See table below. 8 files passed; 4 files still fail some assertions | 25 Sep 2026 |
| `public.countries` | 234 rows | 25 Sep 2026 |
| `scripts/bootstrap-admin.sql` | Ran against the oldest confirmed signup. `user_profiles.role=admin`, `accounts.status=approved`, 1 active admin role, 7 staff permissions | 25 Sep 2026 |
| `.env.local` | `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are real hosted values. `SUPABASE_DB_URL` and `COMMANDS_DATABASE_URL` are **absent** | 25 Sep 2026 |
| `npm run build` | Failed TypeScript (7 errors). Compiled JS, then `tsc` stopped | 25 Sep 2026 |
| GitHub Actions `supabase-pgtap` | Not run | |
| AUTH / P0 walkthrough | Not run | |
| Resend / Daily / ExchangeRate-API / OAuth | Not proven | |

### pgTAP (linked dev, `db query --linked`)

| File | Result |
|------|--------|
| `auth_identity.test.sql` | **PASS** `1..14` |
| `command_layer.test.sql` | **PASS** `1..22` |
| `admin_operations.test.sql` | **PASS** `1..20` |
| `application_systems.test.sql` | **PASS** `1..10` |
| `catalog.test.sql` | **PASS** `1..13` |
| `catalog_editorial.test.sql` | **PASS** `1..9` |
| `student_profile.test.sql` | **PASS** `1..7` |
| `cost_fx.test.sql` | **PASS** `1..2` |
| `rls_p0.test.sql` | **FAIL** `1..74`, 2 failed (anon leftover catalog grants / RLS after leftover rename) |
| `invitations_mfa.test.sql` | **FAIL** `1..18`, 1 failed (assertion name not returned by `db query`) |
| `parent_finance.test.sql` | **FAIL** `1..12`, 6 failed after `scope` rename |
| `shortlist_assessment.test.sql` | **FAIL** `1..12`, 5 failed |

`auth_identity` includes: signup trigger stays `student`; `consume_reset_token` after `register_student_account`; role-change path is covered in `command_layer` / `invitations_mfa`. That is not a substitute for the AUTH walkthrough.

## Still open (do not treat as Done)

1. Dedicated **test** project + GitHub secrets + `ci.yml` `supabase-pgtap`.
2. `SUPABASE_DB_URL` and `COMMANDS_DATABASE_URL` in `.env.local` (`ALTER ROLE gsc_api_executor LOGIN`).
3. `npm run build` TypeScript errors (dashboard MFA assurance, invitations preview `GuestContext`, profile route string unions, implicit `any` in profile load).
4. Remaining pgTAP failures: `rls_p0`, `invitations_mfa`, `parent_finance`, `shortlist_assessment`.
5. AUTH-01–05 / 08 / 09 walkthrough (`docs/qa/auth-walkthrough.md`).
6. Manual P0 procedure (`docs/security/p0-verification.md`) as a student JWT, not postgres.
7. Contact-encryption end-to-end (`GSC_CONTACT_ENCRYPTION_KEY`).
8. Resend verification/reset mail.
9. Site URL / redirect allow-list on Auth settings.
10. Executor path from the Next.js app (`PATCH /api/v1/me`) — no `COMMANDS_DATABASE_URL`.
11. Real-country catalog data, Daily, ExchangeRate-API.

## What was actually checked

| Check | Result | Date |
|-------|--------|------|
| `npm run lint` | 0 errors (historical) | 24 Sep 2026 (AUTH gap-fill) |
| `npx tsc --noEmit` | Historical pass; **this session `next build` TypeScript failed** | 25 Sep 2026 |
| `npm run test:unit` | 116/117 historical (1 skip: concurrent cap) | 24 Sep 2026 |
| `npm run build` | **Failed** — 7 TS errors after compile | 25 Sep 2026 |
| 360px shell | `/design` at 360×800; More opens Discover/Apply/Prepare/Decide/Support; `scrollWidth === 360` | 24 Sep 2026 |
| `supabase db push --linked` | Applied through `0048` | 25 Sep 2026 |
| pgTAP | 8 pass / 4 fail via `db query --linked` | 25 Sep 2026 |

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
| `supabase/migrations/0000`–`0048` | Checked | `db push --linked` applied through `0048` (0046 pgTAP + grant-scope; 0047 catalog outbox; 0048 parent grant-scope) |
| `0033` leftover prototype universities | Checked | First linked push: leftover rows with invalid country deleted before the ISO-2 guard. Traceability: leftover prototype seed |
| `0033`–`0035` catalog + ingestion | Checked | Applied. `catalog.test.sql` 13/13 and `catalog_editorial.test.sql` 9/9 via `db query --linked` |
| `0037_student_profile.sql` | Checked | Applied. `student_profile.test.sql` 7/7 |
| `0038_parent_finance.sql` | Partial | Applied. `sync_parent_case_grants` renamed `scope` in 0048. `parent_finance.test.sql` still 6/12 fail |
| `0039_cost_fx_snapshots.sql` | Checked | Applied. `cost_fx.test.sql` 2/2 (zero FX rate rejected) |
| `0013_reserved.sql` | Checked | Applied with the rest of `0000`–`0048` |
| `0026_role_change_guard.sql` | Checked | Applied. Trigger exercised by `invitations_mfa` / `rls_p0` (those files are not fully green) |
| `0027_identity_command_layer.sql` | Checked | Applied. `auth_identity.test.sql` 14/14: trigger stays student; register + reset-token consume |
| `0028_countries_seed.sql` | Checked | `SELECT count(*) FROM public.countries` = 234 |
| `0029_command_architecture.sql` | Checked | Applied. `command_layer.test.sql` 22/22 (executor `SET ROLE` after `GRANT` + `extensions` usage) |
| `0030_invitations_roles_mfa.sql` | Partial | Applied. `invitations_mfa.test.sql` 17/18 |
| `0040`–`0045` | Checked | Applied on the linked project. Shortlist pgTAP still 7/12 |
| `scripts/bootstrap-admin.sql` | Checked | Executed on the linked project; first admin + `ensure_account` + 7 staff permissions |
| `supabase/seed.sql` | Written, unverified | File exists. Not applied as `db seed` |

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
| PUB-01 | Overview and guest home | `/` | Written, unverified | Spec H1/tagline, coverage counters, no pricing or admission-odds cards. Empty catalog shows zero. |
| PUB-02 | Role-aware app tour | `/tour` | Written, unverified | Audience selector, text walkthrough, skip never completes onboarding. |
| PUB-03 | Guest course and university match | `/quick-match` | Written, unverified | Country/subject only. At most 5 universities and 2 scholarships. |
| PUB-04 | Scholarship preview | `/preview/scholarships` | Written, unverified | Banner: GSC does not submit applications. Honest empty, no blurred rows. |
| PUB-05 | Mentor teaser | `/preview/mentors/:mentorId` | Written, unverified | Honest empty: no approved published mentor teasers. No private contact. |
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
| STU-01 | Student home | `/home` | Written, unverified | Post-login home. Empty widgets stay empty (messages/sessions/news/journey not shipped). Saved 0–3 separate from recommendations. Declined savings never invent a readiness %. User prompt said WP-06; that package is catalog read. |
| STU-02 | Academic history | `/cases/:caseId/profile/education` | Written, unverified | Original score and scale kept. Leftover `/profile` redirects here |
| STU-03 | Tests and result evidence | `/cases/:caseId/profile/tests` | Written, unverified | Versioned TOEFL schemas. Leftover `/test-prep` redirects here |
| STU-04 | Study and destination preferences | `/cases/:caseId/profile/preferences` | Written, unverified | Three ordered countries or available catalog count |
| STU-05 | Interests, achievements and introduction | `/cases/:caseId/profile/experience` | Written, unverified | Max 5 activities. Leftover `/activities` redirects here |
| STU-06 | Parent and financial information | `/cases/:caseId/profile/finances` | Written, unverified | Decline unlocks the step. Amounts stored with currency; declined ⇒ null. User prompt said WP-05; this is WP-16 |
| STU-07 | Complete-profile review and document vault | `/cases/:caseId/profile` | Written, unverified | Module 2/3 summaries. Parent without finance scope sees “Not shared”. Manage family access → PAR-02 |
| STU-08 | Readiness | — | Not started | |
| PAR-01 | Parent dashboard | `/parent/home` | Written, unverified | Case switcher, link-status, scoped cards. Leftover `/parent-portal` redirects here |
| PAR-02 | Family linkage and permission review | `/family-links/:linkId?` | Written, unverified | Email or GSC ID invite, hashed tokens, revoke immediate, under-13 guardian case |
| PAR-03 | Student case chooser | `/parent/cases` | Written, unverified | Search authorized cases; pending invitations below; revoked cases are not selectable |
| CAT-01 | University discovery and recommendations | `/explore/universities` | Written, unverified | Public catalog, filters, recs vs all. Recs wait for a complete academic profile. Save enabled after Module 3; 0–3 cap is a database command. Unknown costs last. Cap 10 in domain tests. |
| CAT-02 | University detail | `/universities/:universityId` | Written, unverified | Published only. No acceptance-rate. No gated application URL. Sources when present. Save uses the same Module 3 + cap command. |
| CAT-03 | Program detail | `/universities/:universityId/programs/:programId` | Written, unverified | Annual vs full-course fees. Month-only deadline. Save and self-check links unlock with a signed-in case. |
| CAT-04 | Cost comparison and financial readiness | `/cases/:caseId/costs` | Written, unverified | Annual comparison ≠ total COA. FX stale after 72h. Readiness 120% with bar cap 100. User prompt said WP-05/06; WP-05 is Intake, WP-06 is catalog read |
| CAT-05 | Program self-assessment | `/cases/:caseId/assessment/:programId` | Written, unverified | Disclaimer “Self-reported, not an admission probability.” No Mark all met. Domain 85/60, hard unmet, unknown mandatory. User prompt said WP-06; this is WP-08 |
| CAT-06 | Saved shortlist and counselor-review flags | `/cases/:caseId/shortlist` | Written, unverified | Cap 3 locked on the case row + UNIQUE (case_id, slot). Flags only on saved rows. Remove clears the flag. Recommendations are not saved slots. User prompt said WP-06; this is WP-08 |
| CAT-07 | Scholarship search | `/scholarships` | Partial | Leftover prototype now reads `leftover_scholarships`. Spec scholarships are unpublished/empty |
| CAT-08 | Scholarship profile | — | Not started | |
| SES-01 | Counselor search | `/counselors` | Partial | Leftover. User session prompt did not reopen matching. |
| SES-02 | Counselor public profile | — | Not started | |
| SES-03 | Book or reschedule | — | Not started | Booking UI not in this slice |
| SES-04 | Appointment detail | `/sessions/:sessionId` | Written, unverified | Thin status page so lobby/live have a back target. Booking confirm/checklist from SES-04 still incomplete |
| SES-05 | Cancel appointment | — | Not started | |
| SES-06 | Session lobby and equipment check | `/sessions/:sessionId/lobby` | Written, unverified | Join from T-10m. Device check is not consent. Token only after authorize |
| SES-07 | Live video session | `/sessions/:sessionId/live` | Written, unverified | Dedicated shell, no bottom nav. Daily adapter + sandbox. Room/token server-issued. Recording stays off |
| SES-08 | Per-session recording consent | `/sessions/:sessionId/consent` | Written, unverified | Default off. Minor needs guardian. Late join new roster. Withdrawal stops. Prompt 23 records/AI |
| SES-09 | Approved advisory report | `/sessions/:sessionId/report` | Written, unverified | Shareable body only. Private notes/AI omitted. Indicative disclaimer. Draft shows Counselor reviewing |
| SES-10 | Counseling feedback | `/sessions/:sessionId/feedback` | Written, unverified | Student five fields; counselor variant private. One per attended completed session |
| SES-11 | Counselor change and handoff | `/cases/:caseId/change-counselor` | Written, unverified | Categories + 2–2000. Safety isolated. Duplicate pending reopened. Mid-session blocked |
| SES-12 | Follow-up tasks and evidence | `/cases/:caseId/tasks/:taskId?` | Written, unverified | Folds leftover `/tasks`. Awaiting date. Extension history. Complete cancels reminders |
| COU-01 | Counselor dashboard | `/counselor/home` | Written, unverified | Assigned caseload only. Leftover `/counselor` redirects here. MFA via `/counselor` prefix |
| COU-05 | Caseload and student case workbench | `/counselor/students/:caseId?` | Written, unverified | Grant-gated. Timeline of sessions/reports/tasks. No grant → nothing |
| COU-06 | Session report editor and approval | `/counselor/sessions/:sessionId/report` | Written, unverified | Manual authoring. Private notes 4000. Fit 1–5 not an admission probability. New version supersedes |
| ESS-01–07 | Essays | `/essays` leftover page | Deferred | Parked; page exists, omitted from nav, must not be extended |
| OFF-01–04 | Offers | `/offers` leftover page | Deferred | Parked; same rule |
| MEN-01 | Mentor directory | `/alumni` | Partial | Folded leftover |
| MEN-02 | Mentor profile | — | Not started | |
| MEN-03 | Request mentorship | — | Not started | |
| MEN-04 | Mentorship thread | — | Not started | |
| MSG-01 | Inbox | `/messages` | Written, unverified | Case filter, search in permitted threads only, unread/all, load more. Counselor compose-from-inbox omitted (COU-05 only). Realtime after inbox channel authorize. |
| MSG-02 | Thread | `/messages/:conversationId` | Written, unverified | Grant-scoped. 4000 chars, 30/min, delivery states, attachments via private storage, guardian invite-only. Leftover ChatWindow removed. |
| MSG-03 | New conversation | — | Not started | Counselor opens a case thread from COU-05. No inbox compose. |
| MSG-04 | Report / block | MSG-02 More | Partial | Report + block actions on the thread. No standalone MSG-04 screens. |
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
| Not started | 28 |
| Partial (leftover prototype) | 8 |
| Written, unverified | 36 |
| Checked (no DB) | 0 (screens) |
| Done | 0 |
| Deferred | 23 (AUTH-06 + parked ESS-01–07, OFF-01–04, REC-01–03, INT-01–04, BIL-01–04) |
| Removed | 1 (AUTH-07) |
| **Total spec screens** | **96** |

APP-01–05 were **not spec screen IDs** (absent from the spec and `docs/spec-index.md`). They were removed from this catalogue. The spec application-adjacent screen is **JRN-01** (selected-target application roadmap). Leftover `/applications` now reads `application_systems` → `application_groups` → `applications` (0032 backfill + 0042 workspace command). It is still not JRN-01. Previous totals (97 / 48 not started) included those five invented rows.

AUTH Written, unverified (8): AUTH-01, 02, 03, 04, 05, 08, 09, 10.
Admin Written, unverified (9): ADM-01, 02, 03, 04, 05, 06, 07, 08, 14. People (`/admin/users`), audit viewer (`/admin/audit`) and Prompt 30 support stubs (`/admin/support`) are WP-15 routes, not extra spec screen IDs. Spec ADM-10 is rewards. Previous invented ADM-03–11 titles (role requests, Catalog CMS, Taxonomy, …) were replaced by spec IDs; that correction adds four screens (92 → 96).

Catalog authoring is **WP-07**. WP-05 is Intake and was not started. WP-06 is catalog read (PUB/CAT-01–03). CAT-04 cost comparison landed under WP-08. Real-country catalog data is an owner task, not an agent task.

Partial leftovers (5): CAT-07, SES-01, MEN-01, JRN-02, SET-06.

Public discovery Written, unverified (8): PUB-01–05, CAT-01–03. Save is enabled on CAT-01–03 after Module 3; the 0–3 cap is enforced inside `commands.save_program_pair`. Personalized CAT-01 recommendations unlock after `module2_completed_at`.

Parked leftover *pages* (`/essays`, `/offers`, `/interviews`, `/billing`) still exist on disk. Those modules are counted as Deferred (not Partial) so they are not treated as in-progress work.

D5: `acceptance_rate` removed from leftover universities reads, types, and the database (0033). Admission Odds page, calculator, card, nav prefix, and landing copy deleted. CAT-05 replaces that screen with a self-check that is never an admission probability.

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
| leftover `POST /cases/{caseId}/shortlist`; `DELETE …/shortlist/{savedId}`; `PATCH …/shortlist/{savedId}/flag`; `PUT …/assessment/{programId}` | Written, unverified | CAT-05/06 commands. Not spec-named paths |

## Automated test catalogue (spec §24.7)

Spec `T001`–`T080` remain **Not started** as named catalogue IDs. Existing tests are not those IDs:

| What exists | Status | Notes |
|-------------|--------|-------|
| `src/domain/identity/identity.test.ts` | Written, unverified | Overlaps T009 / T010 / T015 / T018 themes (MFA redirect, invite reuse, recovery codes) |
| `src/domain/catalog/catalog.test.ts` | Written, unverified | Publication transitions, page clamp, private DTO strip |
| `src/domain/catalog/ingestion.test.ts` | Written, unverified | Private hosts blocked; import rejects unsourced rows; never auto-publish |
| `src/domain/recommendations/recommendations.test.ts` | Written, unverified | Spec SYNTHETIC example; 5 manuals; duplicates; unknown costs last; empty catalog; cap 10 |
| `src/domain/assessment/assessment.test.ts` | Written, unverified | 85/60 boundaries; hard unmet override; unknown mandatory provisional; unlike TOEFL scales stay Unknown |
| `src/domain/shortlist/shortlist.test.ts` | Written, unverified | Cap 3; flags only on saved rows; recommendations are not slots |
| `src/domain/shortlist/shortlist.concurrent.test.ts` | Written, unverified | Real two-connection race. Skips without COMMANDS_DATABASE_URL / SUPABASE_DB_URL |
| `supabase/tests/shortlist_assessment.test.sql` | Partial | Ran remotely: `1..12`, 5 failed |
| `src/domain/profile/profile.test.ts` | Written, unverified | GPA not converted; unlike TOEFL scales; 3/2/4 countries; 201-word goal; sixth activity; completion gating |
| `supabase/tests/student_profile.test.sql` | Checked | `1..7` PASS via `db query --linked` |
| `src/domain/catalog/display.test.ts` | Written, unverified | Month-only deadline; mixed-currency comparison unknown |
| `supabase/tests/catalog.test.sql` | Checked | `1..13` PASS |
| `supabase/tests/catalog_editorial.test.sql` | Checked | `1..9` PASS |
| `src/domain/applications/systems.test.ts` | Written, unverified | Leftover group-state mapping; apply file purposes |
| `supabase/tests/application_systems.test.sql` | Checked | `1..10` PASS |
| `src/domain/admin/admin.test.ts` | Written, unverified | Unauthorized variants, omitted queues, suspend availability |
| `src/domain/navigation.test.ts` | Written, unverified | Not a spec T-ID |
| `supabase/tests/admin_operations.test.sql` | Checked | `1..20` PASS |
| `supabase/tests/rls_p0.test.sql` | Partial | `1..74`, 2 failed |
| `supabase/tests/auth_identity.test.sql` | Checked | `1..14` PASS |
| `supabase/tests/command_layer.test.sql` | Checked | `1..22` PASS |
| `supabase/tests/invitations_mfa.test.sql` | Partial | `1..18`, 1 failed |
| `supabase/tests/parent_finance.test.sql` | Partial | `1..12`, 6 failed |
| `supabase/tests/cost_fx.test.sql` | Checked | `1..2` PASS |
| `src/server/errors.test.ts`, `src/server/http/headers.test.ts` | Written, unverified | Envelope / If-Match / unknown keys. No DB |

CI (`lint`, `typecheck`, `unit`) is Written, unverified: workflow file exists; no successful GitHub run on this branch is claimed here.

## Work-package tracker

| WP | Title | Status | Notes |
|----|-------|--------|-------|
| WP-00 | Repo, lint, tokens, CI skeleton + command architecture | Partial | Command layer applied remotely. `command_layer.test.sql` 22/22. App executor unproven: no `COMMANDS_DATABASE_URL`. CI job not run. |
| WP-01 | Design system + application shell | Written, unverified | Tokens, role-grouped shell, `/design`, role-guard tests. 360px shell checked 24 Sep 2026 (dev `/design`, CDP 360×800, More drawer, no horizontal overflow). Production hide of `/design` is code-only (`notFound()`). Contrast not measured with a meter. |
| WP-02 | Identity schema + RLS + seed | Partial | `0000`–`0048` on linked dev. `auth_identity` 14/14. `rls_p0` 72/74. Countries 234. First admin bootstrapped. AUTH walkthrough not run. |
| WP-03 | AUTH-01 to AUTH-10 | Written, unverified (01–05, 08–10) | AUTH-10 `/mfa` written. AUTH-06 Deferred, AUTH-07 Removed |
| WP-04 | Student profile + academics + documents | Written, unverified | STU-02–05 and STU-07. Leftover test-prep/activities/documents folded and redirected. User prompt said WP-05; that package is Intake and was not started. |
| WP-05 | Intake | Not started | |
| WP-06 | Catalog read + search | Written, unverified | PUB-01–05 and CAT-01–03 public routes. Deterministic recommendation engine + unit tests. Sitemap/robots. Save now wired from WP-08 / CAT-06. No real catalog data. Not pushed. User STU-01/applications prompt said WP-06; this package was not reopened. |
| WP-07 | Catalog authoring | Written, unverified | Schema applied. `catalog` 13/13 and `catalog_editorial` 9/9. Screens not walked. No real-country data. |
| WP-08 | Recommendations + shortlist + compare | Partial | `0040` applied. `shortlist_assessment.test.sql` 7/12. Concurrent unit test still skips without `COMMANDS_DATABASE_URL`. Screens not walked. |
| WP-09 | Deadlines + applications + groups | Written, unverified | Applications workspace. User counseling-loop prompt said WP-09; tracker WP-09 is applications and was not reopened. Spec team “WP-09 Counseling case loop” is WP-11. |
| WP-10 | Scholarships | Written, unverified | Spec `scholarships` + public projection in `0034`. Leftover page still uses `leftover_scholarships`. |
| WP-11 | Sessions + availability + bookings | Partial | `0043`–`0044` applied. SES-06–12 + COU-01/05/06 written, unverified. SES-01–05 and COU-02–04 not built. |
| WP-12 | Messaging + reports | Partial | `0045_messaging.sql` applied. MSG-01/02 written, unverified (no walkthrough). MSG-03 screen not built. MSG-04 actions only. |
| WP-13 | Mentorship | Not started | |
| WP-14 | Journey CMS | Not started | |
| WP-15 | Admin + cases + audit + flags | Written, unverified | ADM-01/02, people, audit viewer. Prompt 30 export/deletion are stubs (audit+outbox only). ADM-11/13 intros not built. Cases/flags remain. |
| WP-16 | Parent access | Written, unverified | Schema applied. `parent_finance.test.sql` 6/12 fail. Screens not walked. |
| WP-17 | Notifications + outbox worker | Not started | Outbox table may exist in migrations; worker is not built |
| WP-18 | Billing | Deferred | Parked |
| WP-19 | AI provider + essays | Deferred | Parked |
| WP-20 | Offers + interviews + rec letters | Deferred | Parked |
| WP-21 | Observability + load + a11y audit | Not started | |
| WP-22 | Production launch | Not started | Blocked on owner: remote projects, keys, legal |

## Known gaps (do not mark these Done)

- Linked **dev** exists. Dedicated **test** project and GitHub `supabase-pgtap` secrets do not.
- `supabase test db` still wants Docker. Current pgTAP evidence is `db query --linked`, not `pg_prove`.
- `.env.local` is missing `SUPABASE_DB_URL` and `COMMANDS_DATABASE_URL`. `gsc_api_executor` is still `NOLOGIN` until the owner sets a password.
- `npm run build` failed this session (7 TypeScript errors).
- pgTAP not fully green: `rls_p0` 2 fail, `invitations_mfa` 1 fail, `parent_finance` 6 fail, `shortlist_assessment` 5 fail.
- Leftover `student_profiles` / `test_scores_log` / `activities` / `documents` tables remain so rows are not dropped.
- Public catalog is empty until editorial publish of real-country data. SYNTHETIC fixtures stay out of `supabase/seed.sql`.
- Login lockout 5 failures / 15 minutes is an invented analog (spec silent).
- Community-eligibility “Yes” is a client gate only.
- GSC ID is allocated at signup (D2). Spec said allocate on approval.
- Three auth API paths do not match spec §17.6 names.
- Parked leftover pages still routable; hidden from nav only.
- Prompt 30 export/deletion only write audit + outbox.
- SES-06/07/08: sandbox Daily is the default. Owner must set `DAILY_API_KEY`. Recording/AI stay off. SES-01–05 booking/matching are not built.
- AUTH walkthrough, Resend mail, Site URL allow-list, and contact-encryption e2e are not proven.
