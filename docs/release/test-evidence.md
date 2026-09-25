# Release test evidence

Date: 25 Sep 2026. Spec sections used: QA method and platform coverage; Requirement traceability and reconciliation; Specified test catalogue T001–T116; Threat model and data-quality invariants; Success measurement without misleading attribution; Phased release and evidence gates.

This pack does **not** claim WP-17 Done. Critical/high defects found here were fixed (unbounded growing-list selects, `acceptance_rate` public-DTO strip, skip-link targets, security headers). Items that need owner credentials or vendors stay fail/skip/manual — they are not waived.

Registry: `src/domain/catalogue/cases.ts`. Manual remainder: `docs/release/manual-tests.md`. AT remainder: `docs/release/accessibility-checklist.md`.

## Catalogue results

Result column records this session. Concurrent races skip without `COMMANDS_DATABASE_URL`. Role Playwright skips without `PLAYWRIGHT_*` credentials. D2-removed approval cases are n/a, not invented passes.

### guest

| test id | automated | result | build | fixture |
|---------|-----------|--------|-------|---------|
| T001 | yes | unit pass + e2e pass | 25 Sep 2026 | SYNTHETIC catalog |
| T002 | yes | unit pass | 25 Sep 2026 | SYNTHETIC catalog |
| T003 | yes | unit pass | 25 Sep 2026 | SYNTHETIC DTO |
| T004 | yes | unit pass | 25 Sep 2026 | SYNTHETIC mentor |
| T005 | yes | unit pass | 25 Sep 2026 | SYNTHETIC lesson |
| T006 | yes | unit pass | 25 Sep 2026 | frozen clock |

### identity

| test id | automated | result | build | fixture |
|---------|-----------|--------|-------|---------|
| T007 | no | n/a (D2) | 25 Sep 2026 | n/a |
| T008 | yes | unit pass | 25 Sep 2026 | SYNTHETIC draft |
| T009 | yes | unit pass | 25 Sep 2026 | n/a |
| T010 | yes | unit pass | 25 Sep 2026 | n/a |
| T011 | yes | unit pass | 25 Sep 2026 | frozen clock |
| T012 | yes | unit pass | 25 Sep 2026 | frozen clock |
| T013 | yes | unit pass | 25 Sep 2026 | n/a |
| T014 | no | n/a (D2) | 25 Sep 2026 | n/a |
| T015 | yes | unit pass | 25 Sep 2026 | frozen 2026-09-19 |
| T016 | yes | unit pass | 25 Sep 2026 | frozen 2026-09-19 |
| T017 | yes | unit pass | 25 Sep 2026 | SYNTHETIC grants |
| T018 | yes | unit pass | 25 Sep 2026 | n/a |
| T019 | no | manual | 25 Sep 2026 | AT device |
| T020 | yes | unit pass | 25 Sep 2026 | SYNTHETIC story |

### profile

| test id | automated | result | build | fixture |
|---------|-----------|--------|-------|---------|
| T021 | yes | unit pass | 25 Sep 2026 | SYNTHETIC scores |
| T022 | yes | unit pass | 25 Sep 2026 | SYNTHETIC profile |
| T023 | yes | unit pass | 25 Sep 2026 | SYNTHETIC profile |
| T024 | yes | unit pass | 25 Sep 2026 | SYNTHETIC profile |
| T025 | yes | unit pass | 25 Sep 2026 | SYNTHETIC catalog |
| T026 | yes | skip without COMMANDS_DATABASE_URL | 25 Sep 2026 | two connections |
| T027 | yes | unit pass | 25 Sep 2026 | SYNTHETIC shortlist |
| T028 | yes | unit pass | 25 Sep 2026 | SYNTHETIC criteria |
| T029 | yes | unit pass | 25 Sep 2026 | SYNTHETIC criteria |
| T030 | yes | unit pass | 25 Sep 2026 | n/a |

### finance

| test id | automated | result | build | fixture |
|---------|-----------|--------|-------|---------|
| T031 | yes | unit pass | 25 Sep 2026 | SYNTHETIC finance |
| T032 | yes | unit pass | 25 Sep 2026 | SYNTHETIC finance |
| T033 | yes | unit pass | 25 Sep 2026 | SYNTHETIC 18000 |
| T034 | yes | unit pass | 25 Sep 2026 | SYNTHETIC 18000 |
| T035 | yes | unit pass | 25 Sep 2026 | SYNTHETIC costs |
| T036 | yes | unit pass | 25 Sep 2026 | frozen clock |
| T037 | yes | unit pass | 25 Sep 2026 | SYNTHETIC awards |
| T038 | yes | unit pass | 25 Sep 2026 | SYNTHETIC grants |
| T039 | yes | unit pass | 25 Sep 2026 | n/a |

### mentorship

| test id | automated | result | build | fixture |
|---------|-----------|--------|-------|---------|
| T040 | yes | unit pass | 25 Sep 2026 | SYNTHETIC mentor |
| T041 | yes | unit pass | 25 Sep 2026 | SYNTHETIC mentor |
| T042 | yes | unit pass | 25 Sep 2026 | SYNTHETIC mentor |
| T043 | yes | unit pass | 25 Sep 2026 | SYNTHETIC mentor |
| T044 | yes | unit pass | 25 Sep 2026 | SYNTHETIC booking |
| T045 | yes | unit pass | 25 Sep 2026 | SYNTHETIC ledger |
| T046 | yes | unit pass | 25 Sep 2026 | SYNTHETIC requests |

### parent-mentor

| test id | automated | result | build | fixture |
|---------|-----------|--------|-------|---------|
| T047 | yes | unit pass | 25 Sep 2026 | SYNTHETIC parent mentor |
| T048 | yes | unit pass | 25 Sep 2026 | SYNTHETIC parent mentor |
| T049 | yes | unit pass | 25 Sep 2026 | SYNTHETIC grants |
| T050 | yes | unit pass | 25 Sep 2026 | SYNTHETIC feedback |

### counselor

| test id | automated | result | build | fixture |
|---------|-----------|--------|-------|---------|
| T051 | no | manual | 25 Sep 2026 | n/a |
| T052 | yes | unit pass | 25 Sep 2026 | SYNTHETIC case |
| T053 | yes | unit pass | 25 Sep 2026 | SYNTHETIC account |
| T054 | yes | unit pass | 25 Sep 2026 | SYNTHETIC profile |
| T055 | yes | unit pass | 25 Sep 2026 | SYNTHETIC audit |

### catalog

| test id | automated | result | build | fixture |
|---------|-----------|--------|-------|---------|
| T056 | yes | unit pass | 25 Sep 2026 | SYNTHETIC states |
| T057 | yes | unit pass | 25 Sep 2026 | SYNTHETIC catalog |
| T058 | yes | unit pass | 25 Sep 2026 | SYNTHETIC import |
| T059 | yes | unit pass | 25 Sep 2026 | SYNTHETIC URL |
| T060 | yes | unit pass | 25 Sep 2026 | SYNTHETIC rank |
| T061 | yes | unit pass | 25 Sep 2026 | SYNTHETIC DTO |
| T062 | yes | unit pass | 25 Sep 2026 | SYNTHETIC deadline |
| T063 | yes | unit pass | 25 Sep 2026 | SYNTHETIC guidance |
| T064 | yes | unit pass | 25 Sep 2026 | SYNTHETIC guidance |
| T065 | yes | unit pass | 25 Sep 2026 | SYNTHETIC scholarship |
| T066 | yes | unit pass | 25 Sep 2026 | SYNTHETIC scholarship |
| T067 | yes | unit pass | 25 Sep 2026 | frozen clock |

### sessions

| test id | automated | result | build | fixture |
|---------|-----------|--------|-------|---------|
| T068 | no | manual | 25 Sep 2026 | n/a |
| T069 | no | manual | 25 Sep 2026 | n/a |
| T070 | no | manual | 25 Sep 2026 | n/a |
| T071 | yes | unit pass | 25 Sep 2026 | frozen clock |
| T072 | yes | unit pass | 25 Sep 2026 | frozen clock |
| T073 | yes | unit pass | 25 Sep 2026 | SYNTHETIC adapter |
| T074 | yes | unit pass | 25 Sep 2026 | SYNTHETIC adapter |
| T075 | yes | unit pass | 25 Sep 2026 | SYNTHETIC occupancy |
| T076 | yes | unit pass | 25 Sep 2026 | SYNTHETIC occupancy |
| T077 | yes | unit pass | 25 Sep 2026 | frozen clock |
| T078 | no | manual | 25 Sep 2026 | n/a |
| T079 | no | manual | 25 Sep 2026 | n/a |
| T080 | no | manual | 25 Sep 2026 | n/a |
| T081 | yes | unit pass | 25 Sep 2026 | flag off |
| T082 | yes | unit pass | 25 Sep 2026 | SYNTHETIC consent |
| T083 | yes | unit pass | 25 Sep 2026 | SYNTHETIC prompt |
| T084 | yes | unit pass | 25 Sep 2026 | SYNTHETIC export |
| T085 | yes | unit pass | 25 Sep 2026 | frozen clock |
| T086 | yes | unit pass | 25 Sep 2026 | SYNTHETIC safety |

### rewards

| test id | automated | result | build | fixture |
|---------|-----------|--------|-------|---------|
| T087 | yes | unit pass | 25 Sep 2026 | SYNTHETIC ledger |
| T088 | yes | unit pass | 25 Sep 2026 | SYNTHETIC ledger |
| T089 | yes | skip without COMMANDS_DATABASE_URL | 25 Sep 2026 | two connections |
| T090 | yes | unit pass | 25 Sep 2026 | flag off |
| T091 | yes | unit pass | 25 Sep 2026 | SYNTHETIC referral |
| T092 | yes | unit pass | 25 Sep 2026 | SYNTHETIC admin |
| T093 | yes | unit pass | 25 Sep 2026 | SYNTHETIC ledger |
| T094 | yes | unit pass | 25 Sep 2026 | SYNTHETIC award |
| T095 | yes | unit pass | 25 Sep 2026 | frozen clock |
| T096 | yes | unit pass | 25 Sep 2026 | n/a |

### learning

| test id | automated | result | build | fixture |
|---------|-----------|--------|-------|---------|
| T097 | yes | unit pass | 25 Sep 2026 | SYNTHETIC lesson |
| T098 | yes | unit pass | 25 Sep 2026 | SYNTHETIC progress |
| T099 | yes | unit pass | 25 Sep 2026 | SYNTHETIC lesson |
| T100 | yes | unit pass | 25 Sep 2026 | SYNTHETIC copy |

### news

| test id | automated | result | build | fixture |
|---------|-----------|--------|-------|---------|
| T101 | yes | unit pass | 25 Sep 2026 | SYNTHETIC story |
| T102 | yes | unit pass | 25 Sep 2026 | SYNTHETIC consent |
| T103 | yes | unit pass | 25 Sep 2026 | SYNTHETIC role |
| T104 | yes | unit pass | 25 Sep 2026 | SYNTHETIC engagement |

### journey

| test id | automated | result | build | fixture |
|---------|-----------|--------|-------|---------|
| T105 | yes | unit pass | 25 Sep 2026 | SYNTHETIC systems |
| T106 | yes | unit pass | 25 Sep 2026 | SYNTHETIC dates |
| T107 | yes | unit pass | 25 Sep 2026 | SYNTHETIC roadmap |
| T108 | yes | unit pass | 25 Sep 2026 | SYNTHETIC case |

### admin

| test id | automated | result | build | fixture |
|---------|-----------|--------|-------|---------|
| T109 | yes | unit pass | 25 Sep 2026 | SYNTHETIC actor |
| T110 | no | manual | 25 Sep 2026 | n/a |
| T111 | yes | unit pass | 25 Sep 2026 | SYNTHETIC deletion |
| T112 | yes | unit pass | 25 Sep 2026 | SYNTHETIC export |
| T113 | yes | unit pass | 25 Sep 2026 | SYNTHETIC metrics |
| T114 | yes | e2e pass (11 public routes) | 25 Sep 2026 | public routes |
| T115 | no | manual | 25 Sep 2026 | owner backup |
| T116 | yes | unit pass | 25 Sep 2026 | n/a |

## Accessibility

- Automated axe (`wcag2a/aa`, `wcag21a/aa`, `wcag22aa`) on every public route in `e2e/public-routes.ts`.
- Skip link + `#main-content` added to public chrome and auth layout (dashboard already had both).
- Keyboard/SR checklist: `docs/release/accessibility-checklist.md` — not ticked (no AT device this session).
- Authenticated-route axe is not claimed without Playwright role credentials.

## Responsive

Playwright checks `/`, `/tour`, `/explore/universities`, `/login`, `/register` at 360, 390, 768 and 1280px: `documentElement.scrollWidth <= clientWidth + 1`. Layout defects found are fixed before this file is marked current.

## Security

| Threat / invariant | Evidence | Result |
|--------------------|----------|--------|
| IDOR / role escalation | `src/domain/admin/admin.test.ts`, `parent/access.test.ts`, `authenticated_grants.test.sql` | Domain pass; grants allowlist empty. Live RLS: `rls_p0` still Partial (2 failed historically) |
| Alumni money / recordings | Mentorship isolation tests; recording default-off | Pass in domain. Daily proving manual |
| Stolen file links | `SIGNED_DOWNLOAD_SECONDS = 60` | Pass |
| Private-note leakage | Privacy export tests | Pass |
| Withdrawn-consent processing | News/journey consent tests; deletion 30-day | Pass |
| AI cannot grant/publish/award | `src/domain/ai/ai.test.ts` | Pass |
| UUID / unrecycled GSC ids | Identity GSC-id tests | Format pass; allocation race not live-proven |
| Saved/review caps | Shortlist 3 / recs 10 | Pass |
| Single active appointment / occupancy | `src/domain/sessions/booking.ts` | Pass |
| No unknown-as-zero / original currency / positive FX | costs + finance tests | Pass |
| No acceptance_rate | `isExcludedPublicField` + public DTO strip | Pass (D5) |
| Rewards ledger reconcile | rewards tests | Pass |
| Atomic commit+outbox | command_layer.test.sql 22/22 | Worker (T110) not built — not passed |
| Secrets in client bundle | `npm run test:secrets` on `.next/static` | Pass |
| Dependency audit | `npm audit --audit-level=high` | 0 vulnerabilities at install |
| Rate limits | Login 5/15m; OTP 5; API `RATE_LIMITED` → 429 | Domain + login route |
| CSRF / CORS | Same-site cookies; no `Access-Control-Allow-Origin`; `X-Frame-Options: DENY`; nosniff; Referrer-Policy | Pass as same-origin app. No cookie CSRF token (Next Server Actions / same-site) |
| Storage RLS | `rls_p0` storage.objects RLS enabled; folder = `auth.uid()` | Historical check; re-run via `test:db` |
| Signed URL expiry | 60 seconds | Pass |

## Performance

- Catalog list fetches capped at `CATALOG_FETCH_CAP` (500). UI page clamp 1–50.
- Coverage uses `count: exact` instead of loading every university.
- Growing profile lists (`files`, education, tests, awards, relatives, notifications) now have `.limit`.
- Guard: `npm run test:selects`.
- Font budget: Inter latin, weights 400/500/600/700 via `next/font/google` (four files, subsetted).
- Images: `next/image` where catalog media is rendered; no unbounded raw `<img>` gallery added this session.
- EXPLAIN via `supabase db query --linked` (25 Sep 2026):
  - `catalog_universities_public` `ORDER BY name LIMIT 50`: Limit → Sort on `universities.name` → **Index Scan `universities_publication_idx`** (`publication_state = 'published'`).
  - `catalog_scholarships_public` `ORDER BY name LIMIT 50`: Limit → Sort on `s.name` → **Index Scan `scholarships_availability_idx`** (`publication_state = 'published'`).
  - Programs EXPLAIN failed after the earlier linked queries: `cli_login_postgres` password authentication failed (`LegacyDbConfigConnectTempRoleError`). Indexes present include `programs_university_idx (university_id, publication_state)` and `programs_name_trgm_idx`. Re-run `npx supabase db query --linked -f scripts/explain-programs.sql` after a fresh `supabase login`.
  - Other catalog indexes: `universities_name_trgm_idx`, `universities_country_city_idx`, `scholarships_name_trgm_idx`.

## CI

`.github/workflows/ci.yml` now runs lint, unbounded-select guard, tsc, unit/catalogue, `npm audit --audit-level=high`, build, client secret scan, Playwright Chromium, `supabase db push --linked`, and pgTAP files through `db query --linked` (no Docker `supabase test db`).

## Phased release gates

| Gate | Status |
|------|--------|
| Critical/high security | Bounded selects + DTO strip + secret scan added. Historical `rls_p0` 2 fails and missing worker still block a production go-live |
| Data-loss / incorrect balance | Domain rewards/deletion pass; concurrent races skip without DB URL |
| Blocked core guest journey | Playwright guest/a11y/responsive required in CI |
| Native/store | N/A (D1 web only) |
| Success measurement | `publishMetric` min cohort 10, no causal claim (`privacy.test.ts` / T113) |

## Commands this session

| Command | Result |
|---------|--------|
| `npm run lint` | 0 errors, 2 pre-existing unused-var warnings |
| `npm run test:unit` | 255 pass / 3 skip / 0 fail |
| `npm run test:selects` | pass |
| `npm run test:audit` | 0 vulnerabilities |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | exit 0, 154 pages |
| `npm run test:secrets` | pass (`.next/static`) |
| `npx playwright test` | 35 pass / 4 skip (role credentials) / 0 fail |
| `supabase db query --linked` EXPLAIN | universities + scholarships plans + index list recorded above |

No new migration. `supabase db push` not required this session.
