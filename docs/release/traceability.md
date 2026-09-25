# Completeness traceability

Recomputed 25 Sep 2026 from the spec screen index, the REST contract, the running tree, and public Playwright — **not** from the previous PROGRESS.md numbers.

**The product is not complete.** Not-started and Partial items remain. Nothing below is Done unless the evidence column names a command or test that actually ran.

Owner decisions applied: D1 web only (native deferred); D2 AUTH-07 removed, no public role picker, MFA staff/counselor only; D3 CAT-01–08 as spec; D5 no acceptance rate. Parked: essays, offers, interviews, billing, recommendation letters.

`supabase db reset` was **not** run. Project rules forbid Docker / local reset. Treat that request as `supabase db push --linked` and record the mismatch here.

---

## DONE (with evidence)

These items have code **and** a passing automated test or a recorded command. They are still not walkthrough-Done.

| Item | Evidence |
|------|----------|
| Public routes render | Playwright 25 Sep 2026: `/`, `/tour`, `/quick-match`, `/explore/universities`, `/explore/scholarships`, `/preview/scholarships`, `/stories`, `/login`, `/register`, `/privacy`, `/help` — 200 + axe wcag22aa. `e2e/a11y.spec.ts`, `e2e/guest.spec.ts` |
| Responsive 360/390/768/1280 | `e2e/responsive.spec.ts` 20 pass |
| T001–T116 registry | `src/domain/catalogue/cases.ts` + `catalogue.test.ts` |
| Unit suite | `npm run test:unit` 255 pass / 3 skip (before this audit’s new tests) |
| Lint | `npm run lint` 0 errors |
| Build | `npm run build` 154 pages, exit 0 |
| Client secret scan | `npm run test:secrets` pass |
| High-severity audit | `npm audit --audit-level=high` 0 vulnerabilities |
| Recommendation cap 10 | `RECOMMENDATION_CAP` in `src/domain/recommendations/recommendations.ts`; `recommendations.test.ts` |
| Saved shortlist cap 3 | `SAVED_PAIR_CAP` in `src/domain/shortlist/shortlist.ts`; `shortlist.test.ts` |
| 30 min + 15 min buffer + 48h reschedule/cancel | `src/domain/sessions/booking.ts`; `sessions.test.ts` booking invariants |
| FX stale after 72h | `FX_STALE_MS` in `src/domain/costs/fx.ts`; `costs.test.ts` |
| Readiness 120% display, bar cap 100 | `evaluateReadiness` returns 125/120; `capProgressPercent` in `src/domain/status.ts`; `finance.test.ts` / `home.test.ts` |
| Month-only deadline not invented last day | `src/domain/catalog/display.ts`; `display.test.ts` |
| No acceptance_rate | `isExcludedPublicField`; `catalog.test.ts` T061 |
| Recording consent default off | `src/domain/sessions/consent.ts`; `sessions.test.ts` |
| Phone OTP is not login MFA | `phoneOtpIsLoginMfa()`; `privacy.test.ts` |
| Retention 30/90 days | `RECORDING_RETENTION_DAYS` / `TRANSCRIPT_RETENTION_DAYS`; `ai.test.ts` retention |
| D2 AUTH-07 | No approval page. `SPEC_SCREENS` status `removed` |
| CAT-07 / CAT-08 pages exist | `/explore/scholarships`, `/scholarships/[scholarshipId]`. Leftover `/scholarships` redirects. Public directory opened (CAT-07). |
| Spec GET `/me` | Added `GET` on `src/app/api/v1/me/route.ts` (envelope). Not live-hit. |
| Spec POST `/auth/logout` | `src/app/api/v1/auth/logout/route.ts` |
| Spec GET `/universities` | `src/app/api/v1/universities/route.ts` published page + envelope |
| Spec POST `/guest/match` | `src/app/api/v1/guest/match/route.ts` uses `guestMatchLimit` |
| Dead COU-02/04 links | `/counselor/profile` and `/availability?role=counselor` removed from COU-01 empty/nav (those pages do not exist) |

Hard-rule table (code + test):

| Rule | Enforcing code | Passing test |
|------|----------------|--------------|
| ≤10 recommendations | `src/domain/recommendations/recommendations.ts` `RECOMMENDATION_CAP` | `recommendations.test.ts` “caps five manual picks…” |
| 0–3 saved pairs | `src/domain/shortlist/shortlist.ts` `SAVED_PAIR_CAP` | `shortlist.test.ts` “caps saved university+program pairs at three” |
| 30/15 booking | `src/domain/sessions/booking.ts` `SESSION_MINUTES`, `SESSION_BUFFER_MINUTES` | `sessions.test.ts` T071 |
| 48h reschedule | `canReschedule` | `sessions.test.ts` T072 |
| 72h FX | `src/domain/costs/fx.ts` `FX_STALE_MS` | `costs.test.ts` “older than 72 hours” |
| 120% display / bar 100 | `evaluateReadiness` + `capProgressPercent` | `finance.test.ts` 125%; `home.test.ts` 120% |
| Month-only deadline | catalog/scholarship display | `display.test.ts`, `scholarships.test.ts` |
| No acceptance rate | `isExcludedPublicField` | `catalog.test.ts` T061 |
| Consent defaults | recording off; WhatsApp/email opt-in on AUTH-04 | `sessions.test.ts`; `identity.test.ts` consent |
| Retention 30/90 | `src/domain/ai/retention.ts` | `ai.test.ts` “deletes recordings after 30 days and transcripts after 90 days” |

---

## DEFERRED BY OWNER DECISION

| Item | Decision | Owner |
|------|----------|-------|
| Native Android/iOS/Expo, store accounts, app links | D1 deferred, not cancelled | Product owner |
| AUTH-07 approval / public role picker / student MFA | D2 | Product owner |
| AUTH-06 phone as signup gate | D2 optional / P3 | Product owner |
| Acceptance rate / admission probability | D5 removed | Product owner |
| Essays, offers, interviews, billing, rec letters | Parked (`GSC_FEATURE_PARKED_MODULES`) | Product owner |
| Gift-card fulfillment | Flag off until funded | Product owner / finance |
| Recording/AI in production | `GSC_FEATURE_RECORDING_AI` default off | Product owner |
| Three-client WP-01 gate | D1: web only | Product owner |
| `supabase db reset` / local Docker | Forbidden; use linked `db push` | Product owner |

---

## NEEDS HUMAN

Every row needs a named owner before a go-live.

| Item | Owner | Why it blocks completeness |
|------|-------|----------------------------|
| Role Playwright credentials | QA / owner | Student/parent/counselor/admin screens were **not opened**. `e2e/roles.spec.ts` skipped. Required states (loading/empty/error/success/disabled) on those routes are unproven. |
| Screen-reader / keyboard AT pass | QA | `docs/release/accessibility-checklist.md` unticked |
| `COMMANDS_DATABASE_URL` | Engineering owner | Executor unproven; concurrent T026/T089 skip |
| Dedicated test project + GitHub CI secrets | Engineering owner | CI YAML exists; no observed green run |
| Resend domain / verification mail | DevOps | AUTH-05 vendor unproven |
| Twilio Verify SID | DevOps | AUTH-06 sandbox `DEPENDENCY_UNAVAILABLE` |
| Daily API key + real rooms | DevOps | SES-06/07 T078/T079 manual |
| OpenAI production key | DevOps | AI sandbox only |
| Google/Microsoft calendar OAuth | DevOps | SET-02 / COU-04 / SES-03 |
| ExchangeRate-API | DevOps | Live FX unproven |
| PITR restore drill (T115) | DevOps | Not run |
| Real published catalog + source rights | Content / legal | Public catalog empty or SYNTHETIC |
| Learning/news launch content + media rights | Content / legal | LRN/NEW SYNTHETIC |
| Privacy notices, UAE PDPL/GDPR, controller contact | Legal | SET-03 copy still “Not provided” for contacts |
| Support phone/email | Legal / ops | Must not be invented |
| `gsc_api_executor` login password | Engineering owner | Commands from the app |
| Site URL / Auth redirect allow-list | DevOps | AUTH callbacks |
| Usability study (5 per workflow) | QA | Spec WP-17 / design handoff |
| Remaining pgTAP fails | Engineering owner | `rls_p0` 2, `invitations_mfa` 1, `parent_finance` 6, `shortlist_assessment` 5 |
| Programs EXPLAIN after CLI login | Engineering owner | Last attempt: temp-role password failed |

---

## Screen audit (97 spec IDs)

Source: `docs/spec-index.md` AUTH/PUB/STU/PAR/CAT/SES/MEN/COU/MSG/ADM/REW/LRN/NEW/JRN/SET. ONB-01–06 and STU-08 are **not** spec IDs and are dropped from counts.

Registry: `src/domain/completeness/screens.ts`.

| Status | Count |
|--------|------:|
| written_unverified | 84 |
| partial | 2 (SES-04, SET-06) |
| not_started | 10 (SES-01, SES-02, SES-03, SES-05, COU-02, COU-03, COU-04, COU-08, ADM-13, SET-02) |
| removed | 1 (AUTH-07) |
| deferred | 0 in this prefix list (parked modules are outside it) |
| **Done** | **0** |

Opened this session (guest Playwright): PUB-01–04, PUB-06, AUTH-01, AUTH-08, CAT-01, CAT-07, SET-03 (policy), SET-05.

Not opened: every signed-in student/parent/counselor/admin screen, CAT-02/03/08 detail (no published ids), PUB-05 detail.

Required B-states (loading/empty/error/success/disabled) are implemented as shared `States` on many Written screens; they were **not** exercised per role this session.

---

## REST API contract

Spec §17.6. Success envelope: `{data, meta:{requestId, version:1}}`. Many leftover auth routes still return `{ok:false, error}` (login, register, password-reset). Command-layer routes use `commandSuccess` / `commandFailure`.

| Spec path | Status | Repo | Test |
|-----------|--------|------|------|
| POST /auth/register | leftover body | `/api/v1/auth/register` | identity unit; no envelope API test |
| POST /auth/login | leftover body | `/api/v1/auth/login` | identity unit; no envelope API test |
| POST /auth/refresh | **not started** | — | — |
| POST /auth/logout | written this session | `/api/v1/auth/logout` | no live test |
| POST /auth/password-reset | leftover path+body | `/api/v1/auth/password-reset` | identity unit |
| POST /auth/password-update | path ≠ spec | `/api/v1/auth/password-reset/confirm` | identity unit |
| POST /auth/email-verification | path ≠ spec | `/api/v1/auth/verify-email` | identity unit |
| POST /auth/phone-challenges | path ≠ spec | `/api/v1/auth/phone/start` | privacy unit |
| POST /auth/phone-challenges/{id}/verify | path ≠ spec | `/api/v1/auth/phone/verify` | privacy unit |
| POST /auth/mfa/enroll; /verify | written | `/api/v1/auth/mfa/*` | identity unit |
| GET /me | written this session | `/api/v1/me` | no live test |
| PATCH /me | written | `/api/v1/me` | needs executor |
| POST /me/email-change | path ≠ spec | `/api/v1/auth/change-email` | — |
| GET /universities | written this session | `/api/v1/universities` | catalog unit (DTO) |
| GET /universities/{id}; GET /programs/{id} | **not started as REST** | RSC pages only | — |
| GET /scholarships; GET /scholarships/{id} | **not started as REST** | RSC pages | scholarships unit |
| POST /guest/match | written this session | `/api/v1/guest/match` | `guestMatchLimit` unit |
| GET /mentors | leftover | `/api/v1/mentors` | mentorship unit |
| GET /counselors | empty honest list | `/api/v1/counselors` | no matching implementation |
| Shortlist / assessment / budgets / shares / target / guidance | leftover or page-only | `/cases/.../shortlist`, `/assessment`, `/costs` | domain tests |
| Bookings family | leftover `/sessions` and `/bookings` mixed | SES-01–05 UI missing | booking unit |
| GET /notifications; PUT /me/notification-preferences | **not started** | leftover notifications page | — |
| POST /calendar/connections | **not started** | — | — |
| POST /admin/jobs/{id}/replay | **not started** (ADM-13) | — | — |
| POST /webhooks/{provider} | **not started** | — | — |
| Other admin/rewards/learning/news/messages | leftover paths, many command-layer | see `src/app/api/v1/**` | mixed domain tests |

Authorization: command-layer + RLS. Hiding a button is not auth. Envelope + unknown-key rejection: `headers.test.ts`. Not every leftover route uses that helper.

---

## Spec WP-01–WP-17 exit gates

Local tracker numbers in older PROGRESS rows do **not** match these spec packages.

| WP | Gate (literal) | Evidence | Status |
|----|----------------|----------|--------|
| WP-01 Foundation | All three clients build; empty-DB migration; no secret in client | D1: web `next build` 154 pages; `test:secrets` pass. Native clients **not** built. | Partial |
| WP-02 Identity | Identity + cross-role denial + approval races + id rollover | Units pass. D2 removed approval races. Vendor mail/phone unproven. Walkthrough not run. | Partial |
| WP-03 Admin ops | Privileged transitions audited; unauthorized denied | `admin.test.ts`; `admin_operations.test.sql` 20/20. Walkthrough not run. | Written, unverified |
| WP-04 Catalog foundation | Published fixtures have attribution | Schema + editorial tests. **No real published fixtures.** | Partial |
| WP-05 Profiles and finance | Declines unlock; no double count | Domain finance/profile tests. Screens not opened. `parent_finance` pgTAP 6 fail. | Partial |
| WP-06 Exploration | Deterministic 10/3; concurrent cap | Recs + shortlist units. Concurrent skip without DB URL. | Partial |
| WP-07 Counselor practice | Only approved experts in matching; no public credentials | COU-02–04 **not started**. Matching **not started**. | Not started |
| WP-08 Scheduling | Concurrency/DST; outage keeps booking | Domain adapter-failure rules. No booking UI. No calendar OAuth. | Not started |
| WP-09 Counseling loop | E2E without recording/AI | SES-06–12 written; SES-01–05 missing. No role e2e. | Partial |
| WP-10 Media and AI | Injection cannot act; no unapproved draft | `ai.test.ts` pass. Vendor unproven. | Written, unverified |
| WP-11 Mentorship | Isolation + contribution counts | `mentorship.test.ts` pass. Screens not opened. | Written, unverified |
| WP-12 Rewards | Reconcile + concurrent redeem | Units pass; concurrent skip; gift cards flagged off. | Partial |
| WP-13 Catalog enrichment | Never autopublish; traceable | `ingestion.test.ts`, `guidance.test.ts`. No real sources. | Written, unverified |
| WP-14 Learning | Reviewed launch content + captions | Code + unit. Content SYNTHETIC — gate fails. | Partial |
| WP-15 News and stories | Withdrawal hides | `news.test.ts` pass. SYNTHETIC editorial. | Written, unverified |
| WP-16 Journey | Self-reported explicit; consent independent | `roadmap.test.ts`, `milestones.test.ts`. Screens not opened. | Written, unverified |
| WP-17 Full-product release | All required scope evidenced; no critical/high unverified prereq | Evidence pack exists. Role e2e, AT, vendors, restore, native, content rights missing. | Partial |

---

## Clean-clone / CI confirmation

| Command | Result |
|---------|--------|
| `npm ci` | Not re-run as a separate clone this audit. Lockfile already installed Playwright/axe. |
| `npm run lint` | 0 errors (prior session) |
| `npm run build` | 154 pages (prior session) |
| `supabase db reset` | **Not run** (forbidden). Use `supabase db push --linked`. |
| All tests | Unit 255/3 skip; Playwright 35 pass / 4 skip; pgTAP 8 pass / 4 files still fail |
| CI all green | **No.** Workflow updated; no observed GitHub run |

---

## Fixes made in this audit

- Added spec-named `GET /me`, `POST /auth/logout`, `GET /universities`, `POST /guest/match`, honest empty `GET /counselors`.
- Removed dead COU-01 links to missing COU-02/04 pages.
- Machine inventory `src/domain/completeness/screens.ts` + test that refuses to call the product complete.

Not fixed (too large to invent): SES-01–05 UI, COU-02–04/08, SET-02 + calendar OAuth, ADM-13 worker, leftover `{ok}` envelopes on login/register, remaining spec REST aliases, pgTAP failures, vendor accounts.
