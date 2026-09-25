# Legacy module reconciliation

Owner decisions: D1–D5 in `SCOPE-ALIGNMENT.md` and project rules. Parked modules keep tables and code, stay behind `GSC_FEATURE_PARKED_MODULES` (default off), have no nav entry, and are not extended. Folded modules keep leftover tables so existing rows are not dropped; new writes go to spec tables. Applied historical migrations are never edited.

| Module | Decision | Where its data went | Evidence |
| --- | --- | --- | --- |
| Essays | **Parked** | Stays in `essays` (`0006`). No spec table. | `/essays` is `notFound()` unless `GSC_FEATURE_PARKED_MODULES=1`. Writes stubbed. `REVOKE` write grants in `0057`. Not in `DASHBOARD_NAV`. |
| Recommendation letters | **Parked** | Stays in `recommendations` (`0007`). Distinct from CAT-01 engine in `src/domain/recommendations/`. | `/recommendations` gated the same way. Writes stubbed. `0057` revoke. Not in nav. |
| Test prep | **Folded → STU-03** | `0037` copied `test_scores_log` → `test_results` (`leftover_id`). Source table kept. | `/test-prep` redirects to `/cases/:caseId/profile/tests`. Leftover actions deleted. |
| Interviews | **Parked** | Stays in `interview_sessions` (`0012`). | `/interviews` gated. Writes stubbed. `0057` revoke. Not in nav. |
| Admission odds | **Removed** | No dedicated table. The leftover university rate column was dropped in `0033`. Replaced by CAT-05. | No `/admission-odds` route. Calculator and category type deleted. Nav test asserts href absent. |
| Tasks | **Folded → SES-12** | Prototype `tasks` renamed `leftover_tasks` (`0044`). Spec `tasks` is case-scoped. | `/tasks` redirects to `/cases/:caseId/tasks`. Leftover actions deleted. Sidebar `/tasks` is that redirect. |
| Activities | **Folded → STU-05** | `0037` copied `activities` → `student_activities` (max 5, `leftover_id`). Source kept. | `/activities` redirects to `/cases/:caseId/profile/experience`. Leftover actions deleted. |
| Visa | **Folded → JRN-02 / ADM-09** | `0054` folded `visa_checklists` → `visa_requirement_progress`. Editorial rules in `country_guidance`. Source kept. | `/visa` redirects to `/cases/:caseId/visa`. Admin editor `/admin/visa`. Leftover actions deleted. |
| Housing | **Folded → CAT-02 / CAT-03** | `0054` copied `housing_options` into draft `accommodations` (never auto-publish). Source kept. | `/housing` redirects to `/explore/universities`. No leftover writer. |
| Alumni | **Folded → MEN** | `alumni_profiles` renamed `leftover_alumni_profiles` (`0050`). Mentorship tables in `0050`. | `/alumni` redirects to `/mentors`. |
| Offers | **Parked** | Stays in `admission_offers` (`0020`). | `/offers` gated. Writes stubbed. `0057` revoke. Not in nav. |
| Billing / subscriptions | **Parked** | Stays in `subscriptions` (`0021`, SELECT only; no writer existed). | `/billing` gated. Pricing cards are not on PUB-01. `PlanPricingCard` only used by the parked page. |
| Documents | **Folded → STU-07** | `0037` copied `documents` → `files`. Source kept. | `/documents` redirects to `/cases/:caseId/profile`. Leftover actions deleted. |
| Parent portal | **Folded → PAR-01** | `parent_student_links` (`0015`) kept; live model is `parent_links` / `case_grants` (`0030`, `0038`). | `/parent-portal` redirects to `/parent/home`. |
| Counselor index | **Folded → COU-01** | No leftover table for this route. SES-01 matching remains Partial at leftover `/counselors`. | `/counselor` redirects to `/counselor/home`. Student Support nav uses that redirect. |
| Messages | **Kept as spec MSG-01/02** | Prototype `messages` renamed `leftover_messages`; `0045` copied into spec conversations/messages. | `/messages` is the spec inbox. Writes go through `/api/v1/messages`. |
| Notifications | **Leftover Partial (SET-06)** | Still `notifications` (`0023`). Spec worker (WP-17) is not built. | `/notifications` remains. Mark-read / clear now `commands.mark_notifications_read` / `clear_notifications`. Direct UPDATE/DELETE revoked in `0057`. |

Parked routes have no landing-page mention. PUB-01 (`src/app/page.tsx`) has no pricing cards, no Odds card, and no Billing card.

`0058` also revokes leftover INSERT/UPDATE/DELETE that default privileges had granted on `countries`, `currencies`, `taxonomy_terms`, `subscriptions`, and public catalog views. The authenticated write-grant allowlist is empty.
