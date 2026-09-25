export type ScreenAuditStatus =
  | "written_unverified"
  | "partial"
  | "not_started"
  | "removed"
  | "deferred";

export interface ScreenAudit {
  id: string;
  route: string | null;
  status: ScreenAuditStatus;
  openedThisSession: boolean;
  testName: string;
  notes: string;
}

export const SPEC_SCREENS: readonly ScreenAudit[] = [
  { id: "PUB-01", route: "/", status: "written_unverified", openedThisSession: true, testName: "e2e/guest.spec.ts + e2e/a11y.spec.ts", notes: "Guest home. Empty catalog shows zero." },
  { id: "PUB-02", route: "/tour", status: "written_unverified", openedThisSession: true, testName: "e2e/a11y.spec.ts", notes: "Role-aware tour." },
  { id: "PUB-03", route: "/quick-match", status: "written_unverified", openedThisSession: true, testName: "e2e/a11y.spec.ts", notes: "Guest match. POST /api/v1/guest/match added." },
  { id: "PUB-04", route: "/preview/scholarships", status: "written_unverified", openedThisSession: true, testName: "e2e/a11y.spec.ts", notes: "Scholarship preview." },
  { id: "PUB-05", route: "/preview/mentors/[mentorId]", status: "written_unverified", openedThisSession: false, testName: "src/domain/mentorship/mentorship.test.ts", notes: "Detail needs a published mentor id. Index not opened." },
  { id: "PUB-06", route: "/stories", status: "written_unverified", openedThisSession: true, testName: "e2e/a11y.spec.ts", notes: "Success wall." },
  { id: "AUTH-01", route: "/register", status: "written_unverified", openedThisSession: true, testName: "e2e/a11y.spec.ts", notes: "D2: no role picker." },
  { id: "AUTH-02", route: "/register/identity", status: "written_unverified", openedThisSession: false, testName: "src/domain/identity/identity.test.ts", notes: "Not opened as a completed signup." },
  { id: "AUTH-03", route: "/register/contact", status: "written_unverified", openedThisSession: false, testName: "src/domain/identity/identity.test.ts", notes: "Password 12–128." },
  { id: "AUTH-04", route: "/register/review", status: "written_unverified", openedThisSession: false, testName: "src/domain/identity/identity.test.ts", notes: "Consent kept; evidence removed (D2)." },
  { id: "AUTH-05", route: "/verify-email", status: "written_unverified", openedThisSession: false, testName: "src/domain/identity/identity.test.ts", notes: "Vendor mail unproven." },
  { id: "AUTH-06", route: "/verify-phone", status: "written_unverified", openedThisSession: false, testName: "src/domain/privacy/privacy.test.ts", notes: "Optional. Twilio unproven." },
  { id: "AUTH-07", route: null, status: "removed", openedThisSession: false, testName: "n/a", notes: "D2 removed approval." },
  { id: "AUTH-08", route: "/login", status: "written_unverified", openedThisSession: true, testName: "e2e/a11y.spec.ts", notes: "Leftover {ok} body, not spec envelope." },
  { id: "AUTH-09", route: "/password-reset", status: "written_unverified", openedThisSession: false, testName: "src/domain/identity/identity.test.ts", notes: "Page exists." },
  { id: "AUTH-10", route: "/mfa", status: "written_unverified", openedThisSession: false, testName: "src/domain/identity/identity.test.ts", notes: "Staff/counselor only (D2)." },
  { id: "STU-01", route: "/home", status: "written_unverified", openedThisSession: false, testName: "src/domain/home/home.test.ts", notes: "Needs student session." },
  { id: "STU-02", route: "/cases/[caseId]/profile/education", status: "written_unverified", openedThisSession: false, testName: "src/domain/profile/profile.test.ts", notes: "Needs student session." },
  { id: "STU-03", route: "/cases/[caseId]/profile/tests", status: "written_unverified", openedThisSession: false, testName: "src/domain/profile/profile.test.ts", notes: "Needs student session." },
  { id: "STU-04", route: "/cases/[caseId]/profile/preferences", status: "written_unverified", openedThisSession: false, testName: "src/domain/profile/profile.test.ts", notes: "Needs student session." },
  { id: "STU-05", route: "/cases/[caseId]/profile/experience", status: "written_unverified", openedThisSession: false, testName: "src/domain/profile/profile.test.ts", notes: "Needs student session." },
  { id: "STU-06", route: "/cases/[caseId]/profile/finances", status: "written_unverified", openedThisSession: false, testName: "src/domain/finance/finance.test.ts", notes: "Needs student session." },
  { id: "STU-07", route: "/cases/[caseId]/profile", status: "written_unverified", openedThisSession: false, testName: "src/domain/profile/profile.test.ts", notes: "Needs student session." },
  { id: "PAR-01", route: "/parent/home", status: "written_unverified", openedThisSession: false, testName: "src/domain/parent/access.test.ts", notes: "Needs parent session." },
  { id: "PAR-02", route: "/family-links", status: "written_unverified", openedThisSession: false, testName: "src/domain/parent/access.test.ts", notes: "Needs parent/student session." },
  { id: "PAR-03", route: "/parent/cases", status: "written_unverified", openedThisSession: false, testName: "src/domain/parent/access.test.ts", notes: "Needs parent session." },
  { id: "CAT-01", route: "/explore/universities", status: "written_unverified", openedThisSession: true, testName: "e2e/a11y.spec.ts", notes: "Public catalog + recs." },
  { id: "CAT-02", route: "/universities/[universityId]", status: "written_unverified", openedThisSession: false, testName: "src/domain/catalog/catalog.test.ts", notes: "Needs a published university id." },
  { id: "CAT-03", route: "/universities/[universityId]/programs/[programId]", status: "written_unverified", openedThisSession: false, testName: "src/domain/catalog/display.test.ts", notes: "Needs a published program id." },
  { id: "CAT-04", route: "/costs", status: "written_unverified", openedThisSession: false, testName: "src/domain/costs/costs.test.ts", notes: "Also /cases/[caseId]/costs." },
  { id: "CAT-05", route: "/cases/[caseId]/assessment/[programId]", status: "written_unverified", openedThisSession: false, testName: "src/domain/assessment/assessment.test.ts", notes: "Needs student session." },
  { id: "CAT-06", route: "/cases/[caseId]/shortlist", status: "written_unverified", openedThisSession: false, testName: "src/domain/shortlist/shortlist.test.ts", notes: "Needs student session." },
  { id: "CAT-07", route: "/explore/scholarships", status: "written_unverified", openedThisSession: true, testName: "e2e/a11y.spec.ts", notes: "Leftover /scholarships redirects here." },
  { id: "CAT-08", route: "/scholarships/[scholarshipId]", status: "written_unverified", openedThisSession: false, testName: "src/domain/scholarships/scholarships.test.ts", notes: "Needs a published scholarship id." },
  { id: "SES-01", route: "/cases/[caseId]/counselors", status: "not_started", openedThisSession: false, testName: "n/a", notes: "No page. GET /api/v1/counselors returns empty." },
  { id: "SES-02", route: "/counselors/[counselorId]", status: "not_started", openedThisSession: false, testName: "n/a", notes: "No page." },
  { id: "SES-03", route: "/cases/[caseId]/book/[expertId]", status: "not_started", openedThisSession: false, testName: "src/domain/sessions/sessions.test.ts", notes: "Domain booking rules exist; UI does not." },
  { id: "SES-04", route: "/sessions/[sessionId]", status: "partial", openedThisSession: false, testName: "src/domain/sessions/sessions.test.ts", notes: "Thin status page; booking confirm incomplete." },
  { id: "SES-05", route: null, status: "not_started", openedThisSession: false, testName: "src/domain/sessions/sessions.test.ts", notes: "Cancel rules in domain only." },
  { id: "SES-06", route: "/sessions/[sessionId]/lobby", status: "written_unverified", openedThisSession: false, testName: "src/domain/sessions/sessions.test.ts", notes: "Needs Daily + booking." },
  { id: "SES-07", route: "/sessions/[sessionId]/live", status: "written_unverified", openedThisSession: false, testName: "src/domain/sessions/sessions.test.ts", notes: "Needs Daily." },
  { id: "SES-08", route: "/sessions/[sessionId]/consent", status: "written_unverified", openedThisSession: false, testName: "src/domain/sessions/sessions.test.ts", notes: "Recording default off." },
  { id: "SES-09", route: "/sessions/[sessionId]/report", status: "written_unverified", openedThisSession: false, testName: "src/domain/counseling/counseling.test.ts", notes: "Needs session." },
  { id: "SES-10", route: "/sessions/[sessionId]/feedback", status: "written_unverified", openedThisSession: false, testName: "src/domain/counseling/counseling.test.ts", notes: "Needs session." },
  { id: "SES-11", route: "/cases/[caseId]/change-counselor", status: "written_unverified", openedThisSession: false, testName: "src/domain/counseling/counseling.test.ts", notes: "Needs case." },
  { id: "SES-12", route: "/cases/[caseId]/tasks", status: "written_unverified", openedThisSession: false, testName: "src/domain/counseling/counseling.test.ts", notes: "Folded leftover /tasks." },
  { id: "MEN-01", route: "/mentors", status: "written_unverified", openedThisSession: false, testName: "src/domain/mentorship/mentorship.test.ts", notes: "Needs session or empty public list." },
  { id: "MEN-02", route: "/mentors/[mentorId]", status: "written_unverified", openedThisSession: false, testName: "src/domain/mentorship/mentorship.test.ts", notes: "Needs mentor id." },
  { id: "MEN-03", route: "/mentor/profile", status: "written_unverified", openedThisSession: false, testName: "src/domain/mentorship/mentorship.test.ts", notes: "Needs mentor session." },
  { id: "MEN-04", route: "/mentor/parent-profile", status: "written_unverified", openedThisSession: false, testName: "src/domain/mentorship/mentorship.test.ts", notes: "Needs parent-mentor session." },
  { id: "MEN-05", route: "/mentor/home", status: "written_unverified", openedThisSession: false, testName: "src/domain/mentorship/mentorship.test.ts", notes: "Needs mentor session." },
  { id: "MEN-06", route: "/mentoring/requests", status: "written_unverified", openedThisSession: false, testName: "src/domain/mentorship/mentorship.test.ts", notes: "Needs mentor session." },
  { id: "MEN-07", route: "/mentoring/sessions/[sessionId]/summary", status: "written_unverified", openedThisSession: false, testName: "src/domain/mentorship/mentorship.test.ts", notes: "Needs mentoring session." },
  { id: "COU-01", route: "/counselor/home", status: "written_unverified", openedThisSession: false, testName: "src/domain/counseling/counseling.test.ts", notes: "Dead availability/profile links removed this session." },
  { id: "COU-02", route: "/counselor/profile", status: "not_started", openedThisSession: false, testName: "n/a", notes: "No page." },
  { id: "COU-03", route: null, status: "not_started", openedThisSession: false, testName: "n/a", notes: "Company/affiliation editor missing." },
  { id: "COU-04", route: "/availability", status: "not_started", openedThisSession: false, testName: "n/a", notes: "No calendar connection page." },
  { id: "COU-05", route: "/counselor/students", status: "written_unverified", openedThisSession: false, testName: "src/domain/counseling/counseling.test.ts", notes: "Needs counselor session." },
  { id: "COU-06", route: "/counselor/sessions/[sessionId]/report", status: "written_unverified", openedThisSession: false, testName: "src/domain/counseling/counseling.test.ts", notes: "Needs counselor session." },
  { id: "COU-07", route: "/counselor/coaching", status: "written_unverified", openedThisSession: false, testName: "src/domain/ai/ai.test.ts", notes: "Needs counselor session." },
  { id: "COU-08", route: null, status: "not_started", openedThisSession: false, testName: "n/a", notes: "Counselor catalog contribution UI missing." },
  { id: "MSG-01", route: "/messages", status: "written_unverified", openedThisSession: false, testName: "src/domain/messaging/messaging.test.ts", notes: "Needs member session." },
  { id: "MSG-02", route: "/messages/[conversationId]", status: "written_unverified", openedThisSession: false, testName: "src/domain/messaging/messaging.test.ts", notes: "Needs member session." },
  { id: "ADM-01", route: "/admin", status: "written_unverified", openedThisSession: false, testName: "src/domain/admin/admin.test.ts", notes: "Needs admin + MFA." },
  { id: "ADM-02", route: "/admin/approvals", status: "written_unverified", openedThisSession: false, testName: "src/domain/admin/admin.test.ts", notes: "No student approval queue (D2)." },
  { id: "ADM-03", route: "/admin/ingestion/new", status: "written_unverified", openedThisSession: false, testName: "src/domain/catalog/ingestion.test.ts", notes: "Needs catalog admin." },
  { id: "ADM-04", route: "/admin/ingestion/[jobId]/review", status: "written_unverified", openedThisSession: false, testName: "src/domain/catalog/ingestion.test.ts", notes: "Needs job id." },
  { id: "ADM-05", route: "/admin/catalog", status: "written_unverified", openedThisSession: false, testName: "src/domain/catalog/catalog.test.ts", notes: "Needs catalog admin." },
  { id: "ADM-06", route: "/admin/universities/[universityId]", status: "written_unverified", openedThisSession: false, testName: "src/domain/catalog/catalog.test.ts", notes: "No acceptance_rate field." },
  { id: "ADM-07", route: "/admin/programs/[programId]", status: "written_unverified", openedThisSession: false, testName: "src/domain/catalog/catalog.test.ts", notes: "Needs program id." },
  { id: "ADM-08", route: "/admin/programs/[programId]/requirements", status: "written_unverified", openedThisSession: false, testName: "src/domain/assessment/assessment.test.ts", notes: "Needs program id." },
  { id: "ADM-09", route: "/admin/visa", status: "written_unverified", openedThisSession: false, testName: "src/domain/catalog/guidance.test.ts", notes: "Needs catalog admin." },
  { id: "ADM-10", route: "/admin/rewards", status: "written_unverified", openedThisSession: false, testName: "src/domain/rewards/rewards.test.ts", notes: "Needs rewards admin." },
  { id: "ADM-11", route: "/admin/moderation", status: "written_unverified", openedThisSession: false, testName: "src/domain/news/news.test.ts", notes: "Needs moderation admin." },
  { id: "ADM-12", route: "/admin/analytics", status: "written_unverified", openedThisSession: false, testName: "src/domain/privacy/privacy.test.ts", notes: "No causal claim." },
  { id: "ADM-13", route: null, status: "not_started", openedThisSession: false, testName: "n/a", notes: "Jobs/replay runner missing." },
  { id: "ADM-14", route: "/admin/scholarships/[scholarshipId]", status: "written_unverified", openedThisSession: false, testName: "src/domain/scholarships/scholarships.test.ts", notes: "Needs scholarship id." },
  { id: "ADM-15", route: "/admin/content", status: "written_unverified", openedThisSession: false, testName: "src/domain/learning/learning.test.ts", notes: "Needs content admin." },
  { id: "REW-01", route: "/rewards", status: "written_unverified", openedThisSession: false, testName: "src/domain/rewards/rewards.test.ts", notes: "Needs member session." },
  { id: "REW-02", route: "/rewards/referrals", status: "written_unverified", openedThisSession: false, testName: "src/domain/rewards/rewards.test.ts", notes: "Needs member session." },
  { id: "REW-03", route: "/rewards/redeem", status: "written_unverified", openedThisSession: false, testName: "src/domain/rewards/rewards.test.ts", notes: "Needs member session." },
  { id: "REW-04", route: "/rewards/certificates", status: "written_unverified", openedThisSession: false, testName: "src/domain/rewards/rewards.test.ts", notes: "Needs member session." },
  { id: "LRN-01", route: "/learning", status: "written_unverified", openedThisSession: false, testName: "src/domain/learning/learning.test.ts", notes: "SYNTHETIC catalog." },
  { id: "LRN-02", route: "/learning/courses/[courseId]", status: "written_unverified", openedThisSession: false, testName: "src/domain/learning/learning.test.ts", notes: "Needs course id." },
  { id: "LRN-03", route: "/learning/library", status: "written_unverified", openedThisSession: false, testName: "src/domain/learning/learning.test.ts", notes: "SYNTHETIC library." },
  { id: "NEW-01", route: "/news", status: "written_unverified", openedThisSession: false, testName: "src/domain/news/news.test.ts", notes: "Needs member or published news." },
  { id: "NEW-02", route: "/news/[articleId]", status: "written_unverified", openedThisSession: false, testName: "src/domain/news/news.test.ts", notes: "Needs article id." },
  { id: "NEW-03", route: "/news/submit", status: "written_unverified", openedThisSession: false, testName: "src/domain/news/news.test.ts", notes: "Needs counselor session." },
  { id: "JRN-01", route: "/cases/[caseId]/roadmap", status: "written_unverified", openedThisSession: false, testName: "src/domain/journey/roadmap.test.ts", notes: "Needs counseling + target." },
  { id: "JRN-02", route: "/cases/[caseId]/visa", status: "written_unverified", openedThisSession: false, testName: "src/domain/catalog/guidance.test.ts", notes: "Needs counseling + target." },
  { id: "JRN-03", route: "/journey", status: "written_unverified", openedThisSession: false, testName: "src/domain/journey/milestones.test.ts", notes: "Needs member session." },
  { id: "SET-01", route: "/settings", status: "written_unverified", openedThisSession: false, testName: "n/a", notes: "Needs member session. Preferences row would 404 (SET-02 missing)." },
  { id: "SET-02", route: "/settings/preferences", status: "not_started", openedThisSession: false, testName: "n/a", notes: "No page, no notification-preference table writes." },
  { id: "SET-03", route: "/privacy", status: "written_unverified", openedThisSession: true, testName: "e2e/a11y.spec.ts", notes: "Public policy opened. Signed-in controls not opened." },
  { id: "SET-04", route: "/settings/security", status: "written_unverified", openedThisSession: false, testName: "src/domain/identity/identity.test.ts", notes: "Needs member session." },
  { id: "SET-05", route: "/help", status: "written_unverified", openedThisSession: true, testName: "e2e/a11y.spec.ts", notes: "Public help opened." },
  { id: "SET-06", route: "/notifications", status: "partial", openedThisSession: false, testName: "n/a", notes: "Leftover notifications table. Worker missing." },
];

export function screenCounts(): Record<ScreenAuditStatus, number> {
  const counts: Record<ScreenAuditStatus, number> = {
    written_unverified: 0,
    partial: 0,
    not_started: 0,
    removed: 0,
    deferred: 0,
  };
  for (const row of SPEC_SCREENS) {
    counts[row.status] += 1;
  }
  return counts;
}
