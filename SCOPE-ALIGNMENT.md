# Global Student Cube — Scope Alignment & Development Brief

**To:** Development team
**From:** Product owner
**Date:** 19 September 2026
**Reference document:** *Global Student Cube: Complete Development Specification, Version 1.0, 14 September 2026*

---

## 0. Purpose of this document

I have reviewed the current build against the Complete Development Specification.

The code quality is good — typing is disciplined, the Supabase patterns are correct, and twenty-two modules are consistent with each other. That is not in question.

What is in question is **what** was built. A significant part of the current build does not correspond to the specification, and a significant part of the specification has not been started. This document fixes that, and records the decisions I am making so nobody is blocked waiting on me.

**How to read each item:**

- **CURRENT** — what exists in the repository today
- **REQUIRED** — what it needs to be
- **REFERENCE** — the section of the specification to open
- **PRIORITY** — P0 (stop-ship), P1, P2, P3

---

## 1. Decisions I am making now

These are settled. Please do not reopen them; build to them.

### D1 — This is a web application only

The specification is titled "Website, Android and iOS." **We are building responsive web only.** All native requirements — native session/video tests, OS push permission prompts, app store acceptance — are **deferred, not cancelled**.

"Web only" still means phones. Most of our students will open this on a mobile browser. Content pages must work at 360–400px width, not only the shell.

### D2 — Registration approval is removed

The specification describes an admin approval flow with evidence submission and an approval email. **We are not building this.**

Rationale: a student should be able to sign up and immediately start exploring universities and scholarships. If they find something, they approach a counselor and the relationship starts there. Gating discovery behind manual approval kills the funnel.

**What this means concretely:**

| Spec screen | Decision |
| --- | --- |
| AUTH-01 Role, purpose and eligibility | **Simplify** — everyone registers as student. No role picker. |
| AUTH-02 Identity and age routing | **KEEP** — we need to know if a user is under 18. This is a legal requirement, not a feature. |
| AUTH-03 Contact and password | Keep |
| AUTH-04 Evidence, privacy and submission | **Evidence: remove. Privacy and consent: KEEP.** We hold minors' data; the consent capture stays. |
| AUTH-05 Email verification | Keep |
| AUTH-06 Phone verification | Defer to P3 |
| AUTH-07 Approval, guardian and correction status | **Remove** |
| AUTH-08 / 09 Login, password reset | Keep |
| AUTH-10 MFA enrolment | **Staff and counselor accounts only.** Not students. |

Counselor, parent and admin accounts are created by **invitation or admin action**. They are never a signup option. See §2.1.

### D3 — University and program selection follows the specification exactly

This is the core of the product and the part I want built to the document, not reinterpreted. Sections **CAT-01 through CAT-08**. Detail in §3.

### D4 — There is one specification, and it is the supplied document

The repository contains a `specs/` folder with twenty-four self-authored module files. The team has been building from those.

**From today, the Complete Development Specification is the single source of truth.** The `specs/` folder is demoted to internal implementation notes. Where the two disagree, the specification wins. Where the specification is silent, ask me — do not invent a module.

### D5 — Acceptance rate is removed

The specification states this twice, explicitly:

> "Module 7 expressly removed acceptance rate, including its reappearance in tie-break examples."

> CAT-02 States: "...no acceptance-rate field."

`acceptance_rate` is currently a NOT NULL column on `universities`, a required field on the filter form, and the primary input to the Admission Odds module. All three must go. See §5.

---

## 2. P0 — Stop-ship defects

**Nothing new ships until these four are closed.** Three are security or data-integrity defects; one is the navigation problem.

### 2.1 Any user can make themselves an administrator — CRITICAL

There are three independent paths to the same outcome.

**Path 1 — the signup form offers it.** `src/app/(auth)/signup/page.tsx` renders the full role enum as a public dropdown:

```ts
{USER_ROLES.map((role) => (
  <option key={role} value={role}>{role}</option>
))}
// USER_ROLES = ["student", "parent", "counselor", "admin"]
```

**Path 2 — the database trusts the client.** `handle_new_user()` in migration `0001` copies the client-supplied value straight into the profile.

**Path 3 — existing users can self-promote.** Migration `0001` grants an unrestricted self-update with no column restriction:

```sql
CREATE POLICY user_profiles_update_own ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
```

Any signed-in student, using the anon key that ships in the browser bundle, can patch their own `role` to `'admin'`.

**What that unlocks.** Migration `0022`'s `is_admin()` then returns true, and its policies are broad:

```sql
CREATE POLICY user_profiles_select_admin ON public.user_profiles
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY applications_select_admin ON public.applications
  FOR SELECT TO authenticated USING (public.is_admin());
```

Every student's name, phone number, academic record and application list becomes readable by anyone who signs up. Most of our users are under eighteen. Under UAE PDPL and GDPR this is a reportable breach.

**REQUIRED:**

1. Remove `role` from the signup form and from `raw_user_meta_data`. Everyone registers as `student`.
2. Add a `BEFORE UPDATE` trigger on `user_profiles` that raises if `NEW.role IS DISTINCT FROM OLD.role`.
3. Role changes only through a `SECURITY DEFINER` function whose body checks `is_admin()`.
4. Counselor and parent accounts become an invitation flow.
5. Re-test every admin policy with a freshly created student account and report the result.

**REFERENCE:** *Identity, relationships, and access control* → *Authentication and activation*; *Case-scoped permission model*; *Database enforcement and sensitive resource security*.

### 2.2 Navigation is identical for all four roles — CRITICAL

`src/components/layout/Sidebar.tsx` exports one flat array of 22 items and renders all of it for everybody. There is no role parameter and no filter.

`src/app/(dashboard)/layout.tsx` **already fetches the user's role** from `user_profiles` and passes it to the header — and then nothing uses it for navigation.

Result: a parent sees Essays, Test Prep, Visa and Admin. A student sees Parent Portal and Admin. A counselor sees personal Essays and Housing.

Only `admin/page.tsx` and `counselor/page.tsx` check role at all, and they check it too late — inside the page body, rendering an empty state. The tab is still in the sidebar and the route still resolves. That is not access control.

**REQUIRED:**

1. Convert `DASHBOARD_NAV` to `Record<UserRole, DashboardNavItem[]>`.
2. Resolve it server-side in the dashboard layout, where the role is already in hand, and pass the filtered array into `<Sidebar>`.
3. Add a route guard in the layout that redirects on role mismatch. Navigation filtering is UX; the guard is security. We need both.

**REFERENCE:** *Platforms, roles and account boundaries*; *Access families*; *Case-scoped permission model*.

### 2.3 The migration set contradicts itself — CRITICAL

Migration `0000` creates `student_profiles`, `applications` and `universities`. Migrations `0002`, `0003` and `0004` create the same tables again with `CREATE TABLE IF NOT EXISTS` — and with **different shapes**:

```sql
-- 0000
student_id UUID NOT NULL REFERENCES public.student_profiles (id)
-- 0004
student_id UUID NOT NULL REFERENCES auth.users (id)
```

Because of `IF NOT EXISTS`, whichever ran first wins and the later file is a no-op. The application code assumes `0004`'s shape everywhere (`USING (auth.uid() = student_id)`). On a database where `0000` ran first, that comparison is always false and every student sees an empty applications list — **with no error anywhere**.

A fresh install and the current development database are not the same product.

**REQUIRED:**

1. Delete `0000` and squash the set, or add explicit `ALTER TABLE` corrections in a new migration.
2. A from-scratch `supabase db reset` must pass in CI before every merge.

### 2.4 Two identity tables — HIGH

`public.users` (0000) and `public.user_profiles` (0001) both store `role` with the same CHECK constraint, and nothing keeps them in sync. The signup trigger writes only to `user_profiles`; `counselor/page.tsx` queries both and joins them in application code.

Two sources of truth for authorisation is how permission bugs become permanent.

**REQUIRED:** Retire `public.users`. `user_profiles` survives — the auth trigger and every policy already point at it. Read email from `auth.users` server-side.

**REFERENCE:** *Identity and case tables*.

---

## 3. P1 — University, program and scholarship planning

**This is the priority build after P0.** Build it to the specification, screen by screen.

**REFERENCE:** *University, program and scholarship planning*, sections CAT-01 to CAT-08.

### CURRENT

One `universities` page. A filter form over a table with seven columns — name, country, tuition, acceptance rate, minimum GPA, ranking, created_at. The table is **empty**; there is no seed data anywhere in the repository. Unbounded `SELECT` with no pagination. No programs. No sources.

### REQUIRED — by screen

**CAT-01 · University discovery and recommendations** — `/explore/universities`
Public catalogue for everyone; personalised set once the academic profile is complete. University/Scholarship tabs. Filters: country, city, subject, level, intake, annual-comparison-cost, ranking. A "Recommendations, up to 10" vs "All universities" selector. Cards show university/program, city, annual tuition, monthly accommodation, comparable annual sum, rank + source + year, and the reason it was recommended. A visible **saved count /3**.
*Acceptance:* recommendations contain at most 10 distinct universities with attached programs. Unknown costs sort **after** known costs.

**CAT-02 · University detail** — `/universities/:universityId`
Logo, name/alias, type, city/country. Ranking source and year, accreditation, international-student ratio when sourced. Overview, program list, accommodation, location, official contacts. **Sources, last verified, next review.**
*Acceptance:* absent data says "Not provided", never a guess. **No acceptance-rate field.** Save is program-specific, not a university favourite.

**CAT-03 · Program detail** — `/universities/:universityId/programs/:programId`
This screen does not exist at all today and it is the centre of the product. Level, duration with unit, mode, intake, deadline precision. **Annual tuition and full-course fee labelled separately.** Entry requirements, tests and exemptions, prerequisites, documents, conditional-admission information. Accommodation and scholarships.
*Acceptance:* a month-only deadline must never be rendered as an invented last day of the month. Unknown data does not mean a requirement is waived.

**CAT-04 · Cost comparison and financial readiness**
Annual tuition + (12 × monthly accommodation). A separate broader budget: meals, transport, insurance, travel, visa/application fees. Included-cost indicators so a meal inside accommodation is not charged twice. Savings, confirmed funding, a readiness number and a capped bar. Original currency plus a USD snapshot.
*Acceptance:* reserves 120 / expense 100 displays **120%**, even though the bar caps at 100. FX older than 72 hours shows a stale warning. The annual comparison is never labelled "total cost of attendance."
*Note:* this depends on STU-06 (§4), which does not exist yet.

**CAT-05 · Program self-assessment**
Replaces Admission Odds (see §5). Criteria cards with the published threshold and weight. Met / Not met / Unknown, with an evidence reference. Live weighted score. Header text: **"Self-reported, not an admission probability."** No "Mark all met" shortcut.
*Acceptance:* a hard unmet criterion overrides "Likely eligible". Unknown mandatory criteria give a provisional result.

**CAT-06 · Saved shortlist and counselor-review flags**
Saved university+program combinations, **0–3, hard cap**. Recommendations are up to 10 and are explicitly *not* saved slots. Flag "For counselor review" on saved rows only.
*Acceptance:* **two concurrent saves cannot exceed three.** Every review-flagged combination must belong to the saved set. See §7 — this rule cannot be enforced with the current architecture.

**CAT-07 · Full scholarship directory** and **CAT-08 · Scholarship detail**
URL-first cards: provider, sourced eligibility excerpt, deadline precision, last verified. Result count and **pagination**.
*Acceptance:* a filter only matches verified metadata. A closed award stays readable but is never labelled open. Selecting an award never adds funding to a student's savings automatically. There is no "Submit application" form — we hand off to the provider.

### The catalogue schema must carry provenance

The specification is explicit:

> "Store canonical URL, retrieval timestamp, hash, permitted snapshot/excerpt, field-level provenance, extraction method, reviewer, and next review date."

None of this is modelled today. Without it we cannot answer the question that makes an admissions catalogue trustworthy: **where did this deadline come from, and when was it last checked?** A wrong deadline costs a student a year.

Also required, and entirely absent: a **program/course entity**. One tuition figure per university cannot represent undergraduate vs postgraduate, or domestic vs international — which is every university.

**REFERENCE:** *University and program fields*; *Ranking and provenance records*; *Entry requirements*; *Accommodation*; *URL-first scholarship cards*.

**Seed data:** before building forty countries, load **one country completely and correctly**, with full provenance. I would rather have 30 verified UK programs than 3,000 unverified rows.

---

## 4. P1/P2 — Specification modules not started

Zero code exists for each of these. A case-insensitive search across `src/` and `supabase/` returns **0 hits** for: `approval`, `consent`, `reward`, `referral`, `booking`, `slot`, `availability`, `mentor`, `learning`, `lesson`, `news`, `audit`, `currency`, `exchange`.

| Module | Spec reference | Decision |
| --- | --- | --- |
| Parent & financial information | STU-06, STU-07 | **P1** — CAT-04 cannot work without it |
| Cost & FX snapshots (ExchangeRate-API) | *Cost and FX snapshots* | **P1** — required by CAT-04 |
| Student dashboard | STU-01 | **P1** — see §6 |
| Appointment booking | SES-01 to SES-12 | **P2** |
| Counselor workspace | COU-01 to COU-08 | **P2** |
| Admin console | ADM-01 to ADM-15 | **P2** — start with ADM-05/06/07 (catalogue management), since the catalogue is P1 |
| Mentorship & alumni | MEN-01 to MEN-07 | **P3** |
| Rewards & referrals | REW-01 to REW-04 | **P3** |
| Learning & Development | LRN-01 to LRN-03 | **P3** |
| News feed | NEW-01 to NEW-03 | **P3** |
| Application roadmap / journey | JRN-01 to JRN-03 | **P3** |
| Guest mode / public discovery | PUB-01 to PUB-06 | **P2** — needed for SEO and top-of-funnel |
| Settings & privacy rights | SET-01 to SET-06 | **P2** — SET-03 (data rights) is a legal requirement |

Booking (SES-03) has hard rules I want honoured when we get there: 30-minute virtual sessions, 15-minute buffer, reschedule only 48+ hours before start, and a calendar or video-link failure must leave the booking **confirmed** with a "Preparing link" state — never silently lost.

---

## 5. Modules built that are not in the specification

Nine modules exist that the specification never asked for. Decision per module:

| Module | Decision | Reason |
| --- | --- | --- |
| **Admission Odds** | **Remove and replace with CAT-05** | Built on `acceptance_rate`, which the spec struck. See below. |
| **Essays** | **Park** | Not in scope. Do not extend. Revisit after §6. |
| **Document Vault** | **Keep — fold into STU-07** | The spec has a document vault inside the complete-profile review. Align it there. |
| **Test Prep** | **Keep — fold into STU-03** | The spec has "Tests and result evidence". Same thing, wrong home. |
| **Visa** | **Keep — align to JRN-02 / ADM-09** | Spec has destination visa guidance, but as editorial content, not student-entered rows. |
| **Housing** | **Keep — fold into CAT-02/CAT-03** | Spec treats accommodation as a catalogue field, not a separate module. |
| **Offer Comparison** | **Park** | Not in scope. |
| **Tasks** | **Keep — align to SES-12** | Spec has counselor follow-up tasks with evidence. |
| **Billing / Subscriptions** | **Park** | See below. |

### Admission Odds must go

The complete algorithm, from `src/lib/admission-calculator.ts`:

```ts
if (gpaGap < 0 || rate < 0.2) return "Reach";
if (gpaGap >= 0.3 && rate >= 0.5) return "Safety";
return "Match";
```

Two inputs. No test scores — despite a whole Test Prep module collecting them. No course rigour, no intake year, no domestic-vs-international status, which for UCAS, the UC system and uni-assist moves the answer far more than GPA does. Unweighted GPA is also not portable: a UAE school's 3.6 and a US school's 3.6 are not the same claim.

Presented to a parent as "odds", this influences where a family spends tens of thousands of dirhams. The specification struck acceptance rate for exactly this class of reason.

**Replace with CAT-05 Program self-assessment** — criteria-based, per-program, using what the university actually publishes, labelled "self-reported, not an admission probability."

### Billing has no payment path

There are zero references to Stripe or any payment provider. The `subscriptions` table grants `SELECT` only, has no INSERT policy and **no writer anywhere in the codebase** — no code path can ever create a subscription row. Every user renders as Free forever. The pricing cards are decoration.

Park it. We will decide the commercial model separately. Do not build more of it now.

---

## 6. New requirement — application systems

**This is not in the specification. I am adding it, and I consider it the most important product decision we will make.**

Across the whole repository, Common App, UCAS, OUAC, uni-assist, Parcoursup and every other application platform appear a combined **three times**.

The current model assumes: **1 application = 1 university.** Reality:

| System | What the current model gets wrong |
| --- | --- |
| **UCAS** (UK) | One application, one personal statement, up to five courses, one fee, one deadline. Our model creates five unrelated rows and asks for five essays. |
| **UC / Cal State** (USA) | One application spans every campus. One fee schedule, one deadline, many outcomes. |
| **OUAC / EducationPlannerBC / ApplyAlberta** (Canada) | Provincial systems with shared fee structures and per-program choices. |
| **UAC / VTAC / QTAC / SATAC** (Australia) | Preference-ordered. The order *is* the application. We have no ordering. |
| **uni-assist / Studielink / Parcoursup** (DE/NL/FR) | Central document verification done once, feeding many institutions. |
| **Common App / Coalition** (USA) | Shared core plus per-school supplements. The supplement is the real work and has no home in the model. |

Without a platform entity: our deadline view shows a UK student five deadlines that are one deadline; our document vault cannot tell them uni-assist certifies transcripts once for the whole country; our cost comparison cannot total the real cost of applying, because fees are charged per system, not per university.

**The strategic position.** We will not displace UCAS or Common App and should not try — they are the rails. The defensible product is the layer above the rails, and nobody occupies it well: one student profile that maps onto each platform's required fields, deadline intelligence that knows system-level from institution-level dates, real cost-to-apply totals per system, and document reuse across systems.

**REQUIRED:** introduce `application_systems` and `application_groups` **before any further application-related screens are written.**

- An application belongs to a group
- A group belongs to a system
- A system carries its own fee rules, deadline types, essay model and document requirements

This is a schema change. Schema changes get ten times more expensive after launch. I want a proposed ER diagram for this before implementation starts.

---

## 7. Architecture — a question I need answered

The specification is unusually direct:

> "Revoke direct mutation privileges from Supabase anon and authenticated. Private data is accessed through the API... Place transactional command functions in an unexposed commands schema with EXECUTE granted only to `gsc_api_executor`."

The build does the opposite. Migration `0000` ends with `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated`, and every subsequent migration follows the pattern. There is no `/api/v1`, no module boundary, no commands schema, no worker.

The practical cost is not architectural purity — it is that **no business rule can be enforced**. The spec's caps and state transitions all live above a single row:

- CAT-06: exactly three saved combinations, three review flags
- SES-03: 48-hour reschedule window
- REW: "rewards consumes approved mentoring facts, never client-submitted point totals"

RLS can check row ownership. It cannot count, sequence, or transact. With direct table access, a determined user bypasses every one of these from the browser console.

**I need a written recommendation from you within this sprint:** adopt the specification's API layer now, or formally accept an RLS-only model and downgrade those caps to advisory. Either answer is acceptable. Leaving it undecided is not — it gets more expensive every week.

**REFERENCE:** *Repository and ownership*; *Request and execution boundaries*; *Browser BFF and native sessions*; *Database enforcement and sensitive resource security*; *Transactional domain behavior*.

---

## 8. Quality and experience items

| # | Issue | Required |
| --- | --- | --- |
| Q1 | **No home screen.** After login, `proxy.ts` sends everyone to `/profile` — a form. Nothing answers "what do I need to do this week." | Build **STU-01 Student dashboard**. Next deadlines, incomplete documents, unanswered counselor messages. Without it there is no reason to return between milestones, and no subscription survives four visits a year. **P1** |
| Q2 | **22 flat menu items.** Even after role filtering a student sees ~16. | Group by journey stage: **Discover / Apply / Prepare / Decide / Support**. The sidebar should teach the process, not list screens. |
| Q3 | **No pagination anywhere.** Zero uses of `.range(` or `.limit(`. Universities does an unbounded select on every render; country filtering uses `ilike '%value%'` with no index. | Fine against an empty table — which is why nobody has noticed. Add pagination before catalogue data loads. **P1** |
| Q4 | **No design tokens.** `globals.css` defines two custom properties. The palette is Tailwind's default `zinc`, hardcoded twice per element for dark mode. A deadline three days away looks identical to one three months away. | Build a token layer: one brand hue, a neutral ramp biased toward it, and a **separate semantic set** (critical / warning / positive / neutral) used consistently for deadline proximity, application status and offer state. **REFERENCE:** *Brand tokens and typography*; *Universal state and microcopy contract*. |
| Q5 | **Messaging has no realtime.** Zero Supabase realtime subscriptions; messages arrive on page refresh. | Counselor–student messaging is one of our few differentiating features and currently behaves worse than email. **REFERENCE:** MSG-01, MSG-02. |
| Q6 | **No audit trail.** Zero occurrences of `audit`. No record of who changed an application status, assigned a counselor, or viewed a student's documents. | Spec requires audit and outbox rows written **in the same transaction** as the change. Required for minors' data. |
| Q7 | **No tests, no CI, default README.** Zero test suites. No CI. The README is unedited `create-next-app` boilerplate with no mention of Supabase setup, environment variables or migrations. | With 23 RLS migrations, the untested surface is exactly where §2.1 lives. Minimum: RLS policy tests per role, and CI running `supabase db reset` + `next build` + `eslint`. |
| Q8 | **Migration 0013 missing.** Sequence runs 0012 → 0014. Module 13 (Admission Odds) has a page and a calculator but no schema. Module 24 (Guest) has a spec file and nothing else. | Explain whether 0013 was lost or never written. Either answer is a process finding. |

---

## 9. Delivery order

**Sprint 1 — Stop-ship. Nothing else.**
§2.1 role escalation · §2.3 migration conflict + CI `db reset` · §2.2 role-based navigation and route guards · §2.4 collapse to one identity table.
Deliver a written confirmation that a fresh student account cannot reach admin data.

**Sprint 2 — Foundation.**
Answer §7 (API layer or accepted RLS-only), in writing · Propose the §6 ER diagram for application systems · Strip `acceptance_rate` (§D5) · Q3 pagination · Catalogue schema with provenance and a program entity (§3).

**Sprint 3 — The core product.**
CAT-01, CAT-02, CAT-03 · Seed one country completely · STU-01 dashboard (Q1) · Q4 design tokens.

**Sprint 4 — Complete the planning loop.**
STU-06 parent & financial · CAT-04 cost and FX · CAT-05 self-assessment (replacing Admission Odds) · CAT-06 shortlist with the 0–3 cap · CAT-07/08 scholarships.

**Sprint 5 onward.**
Counseling and booking (SES) · Counselor workspace (COU) · Admin catalogue tools (ADM-05/06/07) · Guest mode (PUB) · Settings and data rights (SET-03) · then mentorship, rewards, learning, news.

---

## 10. What I need back from you

1. **Confirmation** that the Complete Development Specification is now the single source of truth, and that `specs/` is demoted to implementation notes.
2. **A written recommendation on §7** — API layer or accepted RLS-only — within this sprint.
3. **A proposed ER diagram for §6** application systems, before implementation.
4. **A revised estimate** for Sprints 1–4 against the order in §9.
5. **An answer on §Q8** — what happened to migration 0013.

If any item here is unclear, ambiguous, or conflicts with something in the specification I have missed, raise it with me directly rather than making the call in code. I would much rather answer a question than discover an assumption three sprints later.

---

*This document supersedes prior verbal scope direction. Where it is silent, the Complete Development Specification governs.*
