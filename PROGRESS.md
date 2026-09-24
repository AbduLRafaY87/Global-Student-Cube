# Global Student Cube progress

Inspected from the current tree on 19 Sep 2026. Statuses are **not** taken from older module notes. **Done** is unused: no screen has evidence for every spec acceptance line.

There is no public REST catalogue implemented beyond `/api/v1/auth/*` (register, login, password-reset, verify-email, change-email). `src/domain/` currently holds navigation, identity/auth rules, status tones and microcopy — not the rest of the spec business package. Existing App Router pages are early prototypes, often on the wrong route, and several leftover modules are parked or folded by owner decision. Database P0 checks live in `supabase/tests/rls_p0.test.sql` (pgTAP via `supabase test db`); identity command tests live in `supabase/tests/auth_identity.test.sql`. That is not the spec T001–Txxx catalogue.

## Screen inventory

| ID | Title | Planned route | Status | Owner prompt | Evidence |
| --- | --- | --- | --- | --- | --- |
| AUTH-01 | Role, purpose and eligibility | `/register` | Partial | this slice | Student-only; eligibility Yes/No; no role picker. `/signup` redirects here. Not the spec 3-role cards. |
| AUTH-02 | Identity and age routing | `/register/identity` | Partial | this slice | Name rules, DOB, nationality/residence/city. Under-13 blocked. 13–17 notice without evidence upload. |
| AUTH-03 | Contact and password | `/register/contact` | Partial | this slice | 12–128 password policy, WhatsApp optional, spaces kept. Phone stored encrypted via command. |
| AUTH-04 | Evidence, privacy and submission | `/register/review` | Partial | this slice | Consent only (D2). Immutable `consent_events`. No evidence upload. GSC allocated at create (approval removed). |
| AUTH-05 | Email verification | `/verify-email` | Partial | this slice | Masked address, 60s resend, callback, unverified users blocked from dashboard. |
| AUTH-06 | Phone verification | `/verify-phone` | Deferred | — | Owner: late-phase. No `/verify-phone` route. |
| AUTH-07 | Approval, guardian and correction status | `/account/status` | Removed | — | Owner D2: no registration approval flow. |
| AUTH-08 | Login | `/login` | Partial | this slice | Generic errors, 5/15min throttle, suspended handling. No MFA branch (AUTH-10 next). |
| AUTH-09 | Password reset | `/password-reset` | Partial | this slice | Generic request, new-password, expiry, consumed-token reject, global sign-out. |
| AUTH-10 | MFA enrollment and challenge | `/mfa` | Not started | — | No MFA screens. D2 requires MFA for staff/counselor, not students. |
| PUB-01 | Overview and guest home | `/` | Partial | — | `src/app/page.tsx` landing. Missing tour, match, mentor, stories actions from spec. |
| PUB-02 | Role-aware app tour | `/tour` | Not started | — | No tour route. |
| PUB-03 | Guest course and university match | `/quick-match` | Not started | — | No guest match route. |
| PUB-04 | Scholarship preview | `/preview/scholarships` | Not started | — | Guest scholarship list is not this preview. |
| PUB-05 | Mentor teaser | `/preview/mentors/:mentorId` | Not started | — | No public mentor teaser. |
| PUB-06 | Success stories wall | `/stories` | Not started | — | No stories route. |
| STU-01 | Student dashboard | `/home` | Not started | — | Dashboard shell exists; no `/home` next-step dashboard. |
| STU-02 | Academic history | `/cases/:caseId/profile/education` | Partial | — | `src/app/(dashboard)/profile/page.tsx` stores GPA/major on `student_profiles`, not institution records. |
| STU-03 | Tests and result evidence | `/cases/:caseId/profile/tests` | Partial | — | Folded leftover: `src/app/(dashboard)/test-prep/page.tsx`. Not case-scoped test evidence. |
| STU-04 | Study and destination preferences | `/cases/:caseId/profile/preferences` | Not started | — | No preferences screen. |
| STU-05 | Interests, achievements and introduction | `/cases/:caseId/profile/experience` | Partial | — | Folded leftover: `src/app/(dashboard)/activities/page.tsx`. |
| STU-06 | Parent and financial information | `/cases/:caseId/profile/finances` | Not started | — | No finance profile. |
| STU-07 | Complete-profile review and document vault | `/cases/:caseId/profile` | Partial | — | Folded leftover: `src/app/(dashboard)/documents/page.tsx` plus `/profile`. Not a complete-profile review. |
| PAR-01 | Parent dashboard | `/parent/home` | Partial | — | `src/app/(dashboard)/parent-portal/page.tsx` (wrong route). |
| PAR-02 | Family linkage and permission review | `/family-links/:linkId?` | Not started | — | No invitation/scope UI. |
| PAR-03 | Student case chooser | `/parent/cases` | Not started | — | No case chooser. |
| CAT-01 | University discovery and recommendations | `/explore/universities` | Partial | — | `src/app/(dashboard)/universities/page.tsx`. Shows `acceptance_rate` (D5 forbids). No 10-university recs or program pairing. |
| CAT-02 | University detail | `/universities/:universityId` | Not started | — | List only. Housing leftover is not this screen. |
| CAT-03 | Program detail | `/universities/:universityId/programs/:programId` | Not started | — | No programs table/page. |
| CAT-04 | Cost comparison and financial readiness | `/cases/:caseId/costs` | Not started | — | No budget/readiness UI. |
| CAT-05 | Program self-assessment | `/cases/:caseId/assessment/:programId` | Not started | — | `/admission-odds` is the removed odds module, not CAT-05. |
| CAT-06 | Saved shortlist and counselor-review flags | `/cases/:caseId/shortlist` | Not started | — | No 0–3 saved university+program cap. |
| CAT-07 | Full scholarship directory | `/explore/scholarships` | Partial | — | `src/app/(dashboard)/scholarships/page.tsx`. Not the spec directory/filters. |
| CAT-08 | Scholarship detail and provider handoff | `/scholarships/:scholarshipId` | Not started | — | No detail route. |
| SES-01 | Counselor selection | `/cases/:caseId/counselors` | Partial | — | `src/app/(dashboard)/counselor/page.tsx` student assignment widget. |
| SES-02 | Counselor public profile and selection | `/counselors/:counselorId` | Not started | — | No public counselor profile. |
| SES-03 | Book or reschedule appointment | `/cases/:caseId/book/:expertId` | Not started | — | No booking. |
| SES-04 | Appointment detail and confirmation | `/sessions/:sessionId` | Not started | — | No appointment detail. |
| SES-05 | Cancel appointment | `/sessions/:sessionId/cancel` | Not started | — | — |
| SES-06 | Session lobby and equipment check | `/sessions/:sessionId/lobby` | Not started | — | — |
| SES-07 | Live video session | `/sessions/:sessionId/live` | Not started | — | — |
| SES-08 | Per-session recording consent | `/sessions/:sessionId/consent` | Not started | — | — |
| SES-09 | Approved advisory report | `/sessions/:sessionId/report` | Not started | — | — |
| SES-10 | Counseling feedback | `/sessions/:sessionId/feedback` | Not started | — | — |
| SES-11 | Counselor change and handoff | `/cases/:caseId/change-counselor` | Not started | — | — |
| SES-12 | Follow-up tasks and evidence | `/cases/:caseId/tasks/:taskId?` | Partial | — | Folded leftover: `src/app/(dashboard)/tasks/page.tsx`. |
| MEN-01 | Mentor community and leaderboard | `/mentors` | Partial | — | Folded leftover: `src/app/(dashboard)/alumni/page.tsx`. Not community/leaderboard. |
| MEN-02 | Mentor profile and connection request | `/mentors/:mentorId` | Not started | — | — |
| MEN-03 | Alumni/current-student mentor profile | `/mentor/profile` | Not started | — | — |
| MEN-04 | Parent mentor profile | `/mentor/parent-profile` | Not started | — | — |
| MEN-05 | Mentor dashboard | `/mentor/home` | Not started | — | — |
| MEN-06 | Mentoring requests and connections | `/mentoring/requests/:requestId?` | Not started | — | — |
| MEN-07 | Mentor session summary and mutual feedback | `/mentoring/sessions/:sessionId/summary` | Not started | — | — |
| COU-01 | Counselor dashboard | `/counselor/home` | Not started | — | `/counselor` is student-facing, not this dashboard. |
| COU-02 | Counselor professional profile | `/counselor/profile` | Not started | — | — |
| COU-03 | Company and affiliation details | `/counselor/company` | Not started | — | — |
| COU-04 | Availability and calendar connections | `/availability` | Not started | — | — |
| COU-05 | Caseload and student case workbench | `/counselor/students/:caseId?` | Not started | — | — |
| COU-06 | Session report editor and approval | `/counselor/sessions/:sessionId/report` | Not started | — | — |
| COU-07 | Private AI coaching and improvement | `/counselor/coaching/:sessionId?` | Not started | — | — |
| COU-08 | Counselor catalog contributions | `/counselor/catalog-contributions/:draftId?` | Not started | — | — |
| MSG-01 | Conversation inbox | `/messages` | Partial | — | `src/app/(dashboard)/messages/page.tsx`. Not relationship-scoped inbox. |
| MSG-02 | Scoped conversation | `/messages/:conversationId` | Partial | — | Chat UI on the messages page; no conversation route. |
| ADM-01 | Admin overview | `/admin` | Partial | — | `src/app/(dashboard)/admin/page.tsx` user/application/university counts only. |
| ADM-02 | Registration, guardian and professional review | `/admin/approvals/:applicationId?` | Not started | — | D2 removed public approval; staff invitation review still unspecified here. |
| ADM-03 | Data ingestion submission | `/admin/ingestion/new` | Not started | — | — |
| ADM-04 | Extracted data review and reconciliation | `/admin/ingestion/:jobId/review` | Not started | — | — |
| ADM-05 | Catalog management | `/admin/catalog` | Not started | — | — |
| ADM-06 | University and accommodation editor | `/admin/universities/:universityId` | Not started | — | — |
| ADM-07 | Program and pricing editor | `/admin/programs/:programId` | Not started | — | — |
| ADM-08 | Entry requirement rules | `/admin/programs/:programId/requirements` | Not started | — | — |
| ADM-09 | Visa and destination guidance editor | `/admin/visa/:visaRuleId` | Not started | — | Editorial visa content is not the student `/visa` leftover. |
| ADM-10 | Rewards verification and fulfillment | `/admin/rewards/:itemId?` | Not started | — | — |
| ADM-11 | Moderation, quality and safety review | `/admin/moderation/:reviewId?` | Not started | — | — |
| ADM-12 | Operational and outcome analytics | `/admin/analytics` | Not started | — | — |
| ADM-13 | Jobs, delivery and integration operations | `/admin/jobs/:jobId?` | Not started | — | — |
| ADM-14 | Scholarship URL and metadata editor | `/admin/scholarships/:scholarshipId` | Not started | — | — |
| ADM-15 | Learning, news and recognition content editor | `/admin/content/:contentId?` | Not started | — | — |
| REW-01 | Points, tiers and activity ledger | `/rewards` | Not started | — | — |
| REW-02 | Referral sharing and status | `/rewards/referrals` | Not started | — | — |
| REW-03 | Reward catalog and redemption | `/rewards/redeem/:redemptionId?` | Not started | — | — |
| REW-04 | Certificates and appreciation letters | `/rewards/certificates/:certificateId?` | Not started | — | — |
| LRN-01 | Learning home and course discovery | `/learning` | Not started | — | — |
| LRN-02 | Course overview and lesson player | `/learning/courses/:courseId/lessons/:lessonId?` | Not started | — | — |
| LRN-03 | Resource library and downloads | `/learning/library/:resourceId?` | Not started | — | — |
| NEW-01 | News feed and followed topics | `/news` | Not started | — | — |
| NEW-02 | News detail | `/news/:articleId` | Not started | — | — |
| NEW-03 | Counselor news submission | `/news/submit/:draftId?` | Not started | — | — |
| JRN-01 | Selected-target application roadmap | `/cases/:caseId/roadmap` | Not started | — | `/applications` is a leftover tracker, not this roadmap. |
| JRN-02 | Destination visa and work guidance | `/cases/:caseId/visa` | Partial | — | Folded leftover: `src/app/(dashboard)/visa/page.tsx` is student-entered rows, not editorial guidance. |
| JRN-03 | Private milestones and success-story submission | `/journey` | Not started | — | — |
| SET-01 | More and account settings | `/settings` | Not started | — | — |
| SET-02 | Notification and integration preferences | `/settings/preferences` | Not started | — | — |
| SET-03 | Privacy, consent and data rights | `/privacy` | Not started | — | — |
| SET-04 | Password, MFA and active sessions | `/settings/security` | Not started | — | — |
| SET-05 | Help, issue reporting and protected safety intake | `/help/:requestId?` | Not started | — | — |
| SET-06 | Notification center | `/notifications` | Partial | — | `src/app/(dashboard)/notifications/page.tsx`. Not typed deep links or categories. |

### Screen counts

| Status | Count |
| --- | ---: |
| Not started | 72 |
| Partial | 23 |
| Done | 0 |
| Deferred | 1 |
| Parked | 0 |
| Removed | 1 |
| **Total** | **97** |

Parked **modules** are listed below; they are not these screen IDs.

## Work packages (WP-01–WP-17)

From “Dependency-aware epic and work-package backlog”.

| WP | Title / priority | Exit gate | Status | Notes |
| --- | --- | --- | --- | --- |
| WP-01 | Foundation / P0 | All three clients build; empty-DB migration; no production secret in client bundles. | Partial | Next.js web only (D1). Design tokens, role-grouped shell, `/api/v1/auth/*` command routes using service role. Still no Expo. Contact encryption key is server-only. |
| WP-02 | Identity and safety / P0 | Identity and cross-role denial tests including approval races and identifier rollover. | Partial | Student register/login/verify/reset screens exist with age routing, consent rows, GSC allocation, unverified dashboard block. No staff MFA (AUTH-10). Approval removed (D2). GSC concurrent-approval race (T014) does not apply. Walkthrough: `docs/qa/auth-walkthrough.md`. |
| WP-03 | Admin operations / P0 | Privileged transitions record actor/reason/version; unauthorized denied. | Partial | Stats-only `/admin`. No review queues, audit, or outbox. |
| WP-04 | Catalog foundation / P0 | Published fixtures have attribution, verification status, review date; missing stays explicit. | Partial | `universities` / `scholarships` tables and list pages. Schema still has `acceptance_rate`. No programs, sourced facts, or SYNTHETIC labels. |
| WP-05 | Profiles and finance / P0 | Optional declines unlock correctly; finance fixtures reconcile. | Partial | Thin student profile + documents leftover. No Module 3 finance. |
| WP-06 | Exploration and assessment / P0 | Deterministic results, threshold boundaries, concurrent cap tests. | Partial | University/scholarship lists only. No 10/3/3 caps or CAT-05. |
| WP-07 | Counselor practice / P0 | Only approved active experts match; private credentials never public. | Partial | Student counselor widget. No expert publication/credentials. |
| WP-08 | Scheduling / P0 | Concurrency/DST suite; provider outage does not lose confirmed appointments. | Not started | No bookings. |
| WP-09 | Counseling case loop / P0 | End-to-end student/guardian/adult flows without recording or AI. | Partial | Tasks leftover only. No sessions/reports. |
| WP-10 | Media and AI / P1 | Injected instructions cannot act; no unapproved draft to students. | Not started | No AIProvider/recording. |
| WP-11 | Mentorship / P1 | Mentor/parent-mentor isolation and verified contribution counting. | Partial | Alumni leftover search only. |
| WP-12 | Rewards / P1 | Reconciliation and concurrent redemption/expiry; displayed rewards fulfillable. | Not started | — |
| WP-13 | Catalog enrichment / P1 | Imports never autopublish; downstream changes traceable. | Partial | Housing leftover is not sourced accommodation. |
| WP-14 | Learning / P1 | Each source category has reviewed launch content and accessible fallback. | Not started | — |
| WP-15 | News and stories / P1 | Unpublished items leave public discovery; stale links resolve safely. | Not started | — |
| WP-16 | Journey and roadmap / P1 | Self-reported status explicit; public consent independent; temporal inconsistencies flagged. | Partial | Applications/visa leftovers, not the roadmap. |
| WP-17 | Full-product release / P0+P1 | All required scope has evidence; no unverified critical/high-risk defect. | Not started | — |

## REST API contract

All paths are under `/api/v1`. Current code has **no** `src/app/api/v1` handlers. Combined spec cells are split into one row each. Status is **Not started** unless noted.

| Method | Path | Status |
| --- | --- | --- |
| POST | `/auth/register` | Not started |
| POST | `/auth/login` | Not started |
| POST | `/auth/refresh` | Not started |
| POST | `/auth/logout` | Not started |
| POST | `/auth/password-reset` | Not started |
| POST | `/auth/password-update` | Not started |
| POST | `/auth/email-verification` | Not started |
| POST | `/auth/phone-challenges` | Not started |
| POST | `/auth/phone-challenges/{id}/verify` | Not started |
| POST | `/auth/mfa/enroll` | Not started |
| POST | `/auth/mfa/verify` | Not started |
| GET | `/me` | Not started |
| PATCH | `/me` | Not started |
| POST | `/me/email-change` | Not started |
| POST | `/cases` | Not started |
| GET | `/cases/{caseId}/profile` | Not started |
| PATCH | `/cases/{caseId}/profile` | Not started |
| POST | `/cases/{caseId}/profile/complete` | Not started |
| PUT | `/cases/{caseId}/finance` | Not started |
| POST | `/cases/{caseId}/finance/complete` | Not started |
| POST | `/cases/{caseId}/parent-links` | Not started |
| POST | `/parent-links/accept` | Not started |
| DELETE | `/cases/{caseId}/parent-links/{id}` | Not started |
| GET | `/universities` | Not started |
| GET | `/universities/{id}` | Not started |
| GET | `/programs/{id}` | Not started |
| GET | `/scholarships` | Not started |
| GET | `/scholarships/{id}` | Not started |
| POST | `/guest/match` | Not started |
| POST | `/cases/{caseId}/matches` | Not started |
| GET | `/cases/{caseId}/shortlist` | Not started |
| POST | `/cases/{caseId}/shortlist` | Not started |
| PATCH | `/cases/{caseId}/shortlist/{id}` | Not started |
| DELETE | `/cases/{caseId}/shortlist/{id}` | Not started |
| POST | `/cases/{caseId}/assessments` | Not started |
| POST | `/cases/{caseId}/budgets` | Not started |
| POST | `/cases/{caseId}/shares` | Not started |
| PUT | `/cases/{caseId}/target` | Not started |
| GET | `/cases/{caseId}/application-guidance` | Not started |
| GET | `/mentors` | Not started |
| GET | `/counselors` | Not started |
| PUT | `/me/mentor-profile` | Not started |
| PUT | `/me/counselor-profile` | Not started |
| GET | `/hosts/{id}/availability` | Not started |
| PUT | `/me/availability` | Not started |
| POST | `/cases/{caseId}/assignments` | Not started |
| POST | `/cases/{caseId}/counselor-change` | Not started |
| POST | `/mentor-requests` | Not started |
| POST | `/mentor-requests/{id}/decision` | Not started |
| GET | `/bookings` | Not started |
| POST | `/bookings` | Not started |
| POST | `/bookings/{id}/reschedule` | Not started |
| POST | `/bookings/{id}/cancel` | Not started |
| POST | `/bookings/{id}/join` | Not started |
| POST | `/bookings/{id}/participants` | Not started |
| POST | `/bookings/{id}/participants/accept` | Not started |
| POST | `/bookings/{id}/recording-consent` | Not started |
| POST | `/bookings/{id}/recording/start` | Not started |
| POST | `/bookings/{id}/recording/stop` | Not started |
| POST | `/bookings/{id}/complete` | Not started |
| POST | `/bookings/{id}/feedback` | Not started |
| POST | `/bookings/{id}/mentor-log` | Not started |
| POST | `/cases/{caseId}/reports` | Not started |
| PATCH | `/reports/{id}` | Not started |
| POST | `/reports/{id}/approve` | Not started |
| GET | `/reports/{id}` | Not started |
| GET | `/reports/{id}/download` | Not started |
| GET | `/bookings/{id}/qa` | Not started |
| POST | `/cases/{caseId}/private-notes` | Not started |
| GET | `/cases/{caseId}/tasks` | Not started |
| POST | `/cases/{caseId}/tasks` | Not started |
| PATCH | `/tasks/{id}` | Not started |
| POST | `/cases/{caseId}/roadmap` | Not started |
| GET | `/rewards` | Not started |
| GET | `/rewards/ledger` | Not started |
| GET | `/rewards/catalog` | Not started |
| POST | `/rewards/redemptions` | Not started |
| GET | `/rewards/redemptions/{id}` | Not started |
| POST | `/referrals/code` | Not started |
| GET | `/referrals` | Not started |
| GET | `/conversations` | Not started |
| GET | `/conversations/{id}/messages` | Not started |
| POST | `/conversations/{id}/messages` | Not started |
| POST | `/safety-reports` | Not started |
| PUT | `/blocks/{accountId}` | Not started |
| POST | `/files/uploads` | Not started |
| POST | `/files/{id}/complete` | Not started |
| GET | `/files/{id}/download` | Not started |
| GET | `/learning` | Not started |
| GET | `/learning/{id}` | Not started |
| GET | `/learning/library` | Not started |
| PUT | `/learning/{id}/progress` | Not started |
| GET | `/news` | Not started |
| GET | `/news/{id}` | Not started |
| PUT | `/content/{id}/engagement` | Not started |
| DELETE | `/content/{id}/engagement` | Not started |
| PUT | `/topics/{id}/follow` | Not started |
| DELETE | `/topics/{id}/follow` | Not started |
| GET | `/cases/{caseId}/journey` | Not started |
| POST | `/cases/{caseId}/journey` | Not started |
| PATCH | `/journey/{id}` | Not started |
| POST | `/stories` | Not started |
| GET | `/notifications` | Not started |
| PATCH | `/notifications/{id}` | Not started |
| PUT | `/me/notification-preferences` | Not started |
| POST | `/calendar/connections` | Not started |
| GET | `/calendar/callback/{provider}` | Not started |
| DELETE | `/calendar/connections/{id}` | Not started |
| POST | `/me/data-requests` | Not started |
| GET | `/me/data-requests/{id}` | Not started |
| GET | `/admin/verifications` | Not started |
| POST | `/admin/verifications/{id}/decision` | Not started |
| POST | `/admin/guardian-verifications/{id}/decision` | Not started |
| POST | `/admin/staff-grants` | Not started |
| POST | `/admin/case-access` | Not started |
| POST | `/admin/imports` | Not started |
| GET | `/admin/imports/{id}` | Not started |
| POST | `/admin/imports/{id}/apply` | Not started |
| POST | `/admin/ingestions` | Not started |
| POST | `/admin/catalog/{entityType}/{id}/publish` | Not started |
| POST | `/admin/content` | Not started |
| PATCH | `/admin/content/{id}` | Not started |
| POST | `/admin/content/{id}/publish` | Not started |
| POST | `/admin/mentor-logs/{id}/approve` | Not started |
| PUT | `/admin/reward-catalog/{id}` | Not started |
| POST | `/admin/redemptions/{id}/decision` | Not started |
| GET | `/admin/analytics` | Not started |
| GET | `/admin/audit` | Not started |
| POST | `/admin/jobs/{id}/replay` | Not started |
| POST | `/webhooks/{provider}` | Not started |

Related but **out of contract**: `src/app/auth/callback/route.ts` (OAuth/code exchange, not `/api/v1`). Server Actions on dashboard pages are also not the REST contract.

## Specified test catalogue

| Group | Spec IDs | Specified | Automated |
| --- | --- | ---: | ---: |
| Guest and public overview | T001–T006 | 6 | 0 |
| Module 1: registration and consent | T007–T020 | 14 | 0 |
| Module 2: academics and exploration | T021–T030 | 10 | 0 |
| Module 3: parent and finances | T031–T039 | 9 | 0 |
| Module 4: alumni mentoring | T040–T046 | 7 | 0 |
| Module 5: parent mentoring | T047–T050 | 4 | 0 |
| Module 6: counselors | T051–T055 | 5 | 0 |
| Module 7: university and scholarship database | T056–T067 | 12 | 0 |
| Module 8: matching, sessions and follow-up | T068–T086 | 19 | 0 |
| Rewards, referrals and reward administration | T087–T096 | 10 | 0 |
| Module 11: learning | T097–T100 | 4 | 0 |
| Module 12: news | T101–T104 | 4 | 0 |
| Alumni journey and roadmap | T105–T108 | 4 | 0 |
| Administration, privacy and operations | T109–T116 | 8 | 0 |
| **Total** | T001–T116 | **116** | **0** |

No Jest/Playwright `*.spec.*` files and none of T001–T116 are automated. Domain unit tests live in `src/domain/*.test.ts` (`npm run test:unit`). `supabase/tests/rls_p0.test.sql` covers P0 RLS and role escalation; it does not map onto T001–T116.

## Owner decisions, parked modules, folded modules

Copied from `.cursor/rules/gsc-project-rules.mdc`.

### D1–D5

- **D1** Web only. Responsive from 360px to desktop; every content page must work on a phone. Native (Android/iOS/Expo) is deferred, not cancelled: keep business rules in framework-agnostic code under `src/domain/` so native can reuse it later.
- **D2** No registration approval flow. Everyone signs up as a student and can explore immediately. Keep: age routing (under 18), privacy/consent capture, email verification, login, password reset. Removed: role picker, evidence upload, approval email, approval status screen. Counselor, parent, mentor and admin accounts are created only by invitation or admin action, never by public signup. MFA is required for staff and counselor accounts, not students. Phone verification is a late-phase item.
- **D3** University/program/scholarship features follow spec sections CAT-01 to CAT-08 exactly.
- **D4** The spec is the single source of truth (see project rules).
- **D5** Acceptance rate is removed everywhere (database, types, forms, pages, copy). Never show or compute admission probability. Use "self-reported, not an admission probability" wording where spec says so.

Also binding: an application belongs to an application group, which belongs to an application system (UCAS, Common App, UC, OUAC, UAC, uni-assist, Parcoursup and so on). Systems carry their own fee rules, deadline types, essay model and document requirements.

### Parked modules

Hidden behind a feature flag; code and tables kept, never extended:

| Module | Leftover route (not spec screen IDs) |
| --- | --- |
| Essays | `/essays` |
| Offers | `/offers` |
| Billing/Subscriptions | `/billing` |
| Interviews | `/interviews` |
| Recommendation letters | `/recommendations` |

Parked leftover URLs still exist as pages. They are omitted from role navigation and denied by `dashboardRoleRedirect` (proxy + dashboard layout). No feature-flag wrapper is implemented.

### Folded modules

| Old module | Folds into | Leftover route |
| --- | --- | --- |
| Documents | STU-07 | `/documents` |
| Test Prep | STU-03 | `/test-prep` |
| Activities | STU-05 | `/activities` |
| Housing | CAT-02/CAT-03 accommodation | `/housing` |
| Visa | JRN-02/ADM-09 (editorial, not student-entered rows) | `/visa` |
| Tasks | SES-12 | `/tasks` |
| Alumni | Mentorship (MEN) | `/alumni` |
| Admission Odds | Removed; replaced by CAT-05 | `/admission-odds` |

`/admission-odds` still computes Reach/Match/Safety from GPA and **acceptance rate**. That contradicts D5.
