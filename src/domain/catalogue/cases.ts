export type CatalogueLayer =
  | "unit"
  | "db"
  | "api"
  | "e2e"
  | "manual"
  | "na";

export type CatalogueGroup =
  | "guest"
  | "identity"
  | "profile"
  | "finance"
  | "mentorship"
  | "parent-mentor"
  | "counselor"
  | "catalog"
  | "sessions"
  | "rewards"
  | "learning"
  | "news"
  | "journey"
  | "admin";

export interface CatalogueCase {
  id: `T${string}`;
  group: CatalogueGroup;
  qKey: string;
  title: string;
  automated: boolean;
  layer: CatalogueLayer;
  evidencePath: string | null;
  fixture: string;
  notes: string;
}

function row(
  id: CatalogueCase["id"],
  group: CatalogueGroup,
  qKey: string,
  title: string,
  automated: boolean,
  layer: CatalogueLayer,
  evidencePath: string | null,
  fixture: string,
  notes: string,
): CatalogueCase {
  return { id, group, qKey, title, automated, layer, evidencePath, fixture, notes };
}

export const CATALOGUE_CASES: readonly CatalogueCase[] = [
  row("T001", "guest", "Q-G", "Guest home shows published coverage only", true, "unit", "src/domain/catalog/catalog.test.ts", "SYNTHETIC catalog", "e2e/guest.spec.ts also loads /"),
  row("T002", "guest", "Q-G", "Guest match caps at 5 universities and 2 scholarships", true, "unit", "src/domain/recommendations/recommendations.test.ts", "SYNTHETIC catalog", "guestMatchLimit"),
  row("T003", "guest", "Q-G", "Guest never sees private catalog fields", true, "unit", "src/domain/catalog/catalog.test.ts", "SYNTHETIC DTO", "publicCatalogFields strips counselor_remarks"),
  row("T004", "guest", "Q-G", "Mentor teaser exposes only public mentor fields", true, "unit", "src/domain/mentorship/mentorship.test.ts", "SYNTHETIC mentor", "Directory hidden until verified"),
  row("T005", "guest", "Q-G", "Learning preview requires captions and keyboard controls", true, "unit", "src/domain/learning/learning.test.ts", "SYNTHETIC lesson", "Screen-reader confirmation stays on the manual sheet"),
  row("T006", "guest", "Q-G", "Five failed logins lock the window", true, "unit", "src/domain/identity/identity.test.ts", "frozen clock", "LOGIN_MAX_ATTEMPTS=5; live 429 is command-layer"),
  row("T007", "identity", "Q-M1", "Approval-pending cannot explore", false, "na", null, "n/a", "D2 removed public approval. Email-verified students explore immediately."),
  row("T008", "identity", "Q-M1", "Registration submission validates identity and consent", true, "unit", "src/domain/identity/identity.test.ts", "SYNTHETIC draft", "No role picker (D2)"),
  row("T009", "identity", "Q-M1", "Password 12–128 with mixed classes", true, "unit", "src/domain/identity/identity.test.ts", "n/a", ""),
  row("T010", "identity", "Q-M1", "Password internal spaces are kept", true, "unit", "src/domain/identity/identity.test.ts", "n/a", ""),
  row("T011", "identity", "Q-M1", "Phone OTP expires and is not stored raw", true, "unit", "src/domain/privacy/privacy.test.ts", "frozen clock", "Twilio Verify adapter is not mocked as success"),
  row("T012", "identity", "Q-M1", "Phone OTP send/attempt limits", true, "unit", "src/domain/privacy/privacy.test.ts", "frozen clock", "5 attempts invalidate; 5 sends/hour"),
  row("T013", "identity", "Q-M1", "Unverified email cannot open protected routes", true, "unit", "src/domain/identity/identity.test.ts", "n/a", "Vendor delivery stays manual"),
  row("T014", "identity", "Q-M1", "Concurrent approval / GSC-id race", false, "na", null, "n/a", "D2 removed approval queue. GSC-id assignment is not a public race."),
  row("T015", "identity", "Q-M1", "Under-18 age routing", true, "unit", "src/domain/identity/identity.test.ts", "frozen 2026-09-19", ""),
  row("T016", "identity", "Q-M1", "Age 18 is adult", true, "unit", "src/domain/identity/identity.test.ts", "frozen 2026-09-19", ""),
  row("T017", "identity", "Q-M1", "Parent grant cannot escalate to write without scope", true, "unit", "src/domain/parent/access.test.ts", "SYNTHETIC grants", "supabase/tests/parent_finance.test.sql Partial"),
  row("T018", "identity", "Q-M1", "Staff/counselor MFA aal2 gate", true, "unit", "src/domain/identity/identity.test.ts", "n/a", "Live AAL2 challenge is vendor/manual"),
  row("T019", "identity", "Q-M1", "Screen-reader signup journey", false, "manual", "docs/release/accessibility-checklist.md", "AT device", "VoiceOver/TalkBack/NVDA"),
  row("T020", "identity", "Q-M1", "Withdrawn story hidden from search", true, "unit", "src/domain/news/news.test.ts", "SYNTHETIC story", ""),
  row("T021", "profile", "Q-M2", "Unlike test scales stay Unknown", true, "unit", "src/domain/profile/profile.test.ts", "SYNTHETIC scores", ""),
  row("T022", "profile", "Q-M2", "Activities and goal-word limits", true, "unit", "src/domain/profile/profile.test.ts", "SYNTHETIC profile", ""),
  row("T023", "profile", "Q-M2", "At most three destination countries", true, "unit", "src/domain/profile/profile.test.ts", "SYNTHETIC profile", ""),
  row("T024", "profile", "Q-M2", "Fewer than three countries is valid", true, "unit", "src/domain/profile/profile.test.ts", "SYNTHETIC profile", ""),
  row("T025", "profile", "Q-M2", "Recommendations cap 10 distinct universities", true, "unit", "src/domain/recommendations/recommendations.test.ts", "SYNTHETIC catalog", ""),
  row("T026", "profile", "Q-M2", "Saved shortlist concurrent cap 3", true, "unit", "src/domain/shortlist/shortlist.concurrent.test.ts", "two connections", "Skips without COMMANDS_DATABASE_URL; domain cap also in shortlist.test.ts"),
  row("T027", "profile", "Q-M2", "Review flags only on saved rows", true, "unit", "src/domain/shortlist/shortlist.test.ts", "SYNTHETIC shortlist", ""),
  row("T028", "profile", "Q-M2", "Assessment 85/60 band boundaries", true, "unit", "src/domain/assessment/assessment.test.ts", "SYNTHETIC criteria", ""),
  row("T029", "profile", "Q-M2", "Hard unmet overrides score", true, "unit", "src/domain/assessment/assessment.test.ts", "SYNTHETIC criteria", ""),
  row("T030", "profile", "Q-M2", "Upload purpose, MIME and size", true, "unit", "src/domain/security/invariants.test.ts", "n/a", "Browser upload + antivirus stay manual"),
  row("T031", "finance", "Q-M3", "Finance unlock after disclosure", true, "unit", "src/domain/finance/finance.test.ts", "SYNTHETIC finance", ""),
  row("T032", "finance", "Q-M3", "Declined savings stored empty not zero", true, "unit", "src/domain/finance/finance.test.ts", "SYNTHETIC finance", ""),
  row("T033", "finance", "Q-M3", "Annual comparison 18000 example", true, "unit", "src/domain/finance/finance.test.ts", "SYNTHETIC 18000", "Never labelled total cost of attendance"),
  row("T034", "finance", "Q-M3", "Readiness 125% displays 125 while bar caps 100", true, "unit", "src/domain/finance/finance.test.ts", "SYNTHETIC 18000", ""),
  row("T035", "finance", "Q-M3", "Zero expense is not unknown-as-zero", true, "unit", "src/domain/costs/costs.test.ts", "SYNTHETIC costs", ""),
  row("T036", "finance", "Q-M3", "FX snapshot older than 72h is stale", true, "unit", "src/domain/costs/costs.test.ts", "frozen clock", "supabase/tests/cost_fx.test.sql"),
  row("T037", "finance", "Q-M3", "Scholarship counted once in comparison", true, "unit", "src/domain/scholarships/scholarships.test.ts", "SYNTHETIC awards", ""),
  row("T038", "finance", "Q-M3", "Parent cannot read finance without scope", true, "unit", "src/domain/parent/access.test.ts", "SYNTHETIC grants", "parent_finance.test.sql Partial"),
  row("T039", "finance", "Q-M3", "If-Match / unknown keys rejected", true, "unit", "src/server/http/headers.test.ts", "n/a", "Optimistic version on writes"),
  row("T040", "mentorship", "Q-M4", "Mentor at most three topics", true, "unit", "src/domain/mentorship/mentorship.test.ts", "SYNTHETIC mentor", ""),
  row("T041", "mentorship", "Q-M4", "Mentor weekly hours cap", true, "unit", "src/domain/mentorship/mentorship.test.ts", "SYNTHETIC mentor", ""),
  row("T042", "mentorship", "Q-M4", "Unverified mentor is not listed", true, "unit", "src/domain/mentorship/mentorship.test.ts", "SYNTHETIC mentor", ""),
  row("T043", "mentorship", "Q-M4", "No public alumni money directory", true, "unit", "src/domain/mentorship/mentorship.test.ts", "SYNTHETIC mentor", "Alumni folded into mentorship"),
  row("T044", "mentorship", "Q-M4", "Session identifiers stay scoped", true, "unit", "src/domain/sessions/sessions.test.ts", "SYNTHETIC booking", ""),
  row("T045", "mentorship", "Q-M4", "Feedback cannot award credits", true, "unit", "src/domain/rewards/rewards.test.ts", "SYNTHETIC ledger", "AI cannot award"),
  row("T046", "mentorship", "Q-M4", "Unique mentee pairing rules", true, "unit", "src/domain/mentorship/mentorship.test.ts", "SYNTHETIC requests", ""),
  row("T047", "parent-mentor", "Q-M5", "Parent mentor topics", true, "unit", "src/domain/mentorship/mentorship.test.ts", "SYNTHETIC parent mentor", ""),
  row("T048", "parent-mentor", "Q-M5", "Parent mentor hours", true, "unit", "src/domain/mentorship/mentorship.test.ts", "SYNTHETIC parent mentor", ""),
  row("T049", "parent-mentor", "Q-M5", "Parent mentor cannot see student finance", true, "unit", "src/domain/parent/access.test.ts", "SYNTHETIC grants", ""),
  row("T050", "parent-mentor", "Q-M5", "Parent mentor feedback isolation", true, "unit", "src/domain/mentorship/mentorship.test.ts", "SYNTHETIC feedback", ""),
  row("T051", "counselor", "Q-M6", "Counselor public selection profile", false, "manual", "docs/release/manual-tests.md", "n/a", "SES-01–05 counselor matching is not built"),
  row("T052", "counselor", "Q-M6", "Safety escalation path", true, "unit", "src/domain/counseling/counseling.test.ts", "SYNTHETIC case", ""),
  row("T053", "counselor", "Q-M6", "Suspended counselor cannot take bookings", true, "unit", "src/domain/admin/admin.test.ts", "SYNTHETIC account", ""),
  row("T054", "counselor", "Q-M6", "Public counselor fields only", true, "unit", "src/domain/counseling/counseling.test.ts", "SYNTHETIC profile", "Matching UI not built"),
  row("T055", "counselor", "Q-M6", "Privileged counselor action writes audit", true, "unit", "src/domain/admin/admin.test.ts", "SYNTHETIC audit", "supabase/tests/admin_operations.test.sql"),
  row("T056", "catalog", "Q-M7", "Draft cannot jump to published", true, "unit", "src/domain/catalog/catalog.test.ts", "SYNTHETIC states", "supabase/tests/catalog.test.sql"),
  row("T057", "catalog", "Q-M7", "Unknown costs sort after known", true, "unit", "src/domain/recommendations/recommendations.test.ts", "SYNTHETIC catalog", ""),
  row("T058", "catalog", "Q-M7", "Import never auto-publishes", true, "unit", "src/domain/catalog/ingestion.test.ts", "SYNTHETIC import", ""),
  row("T059", "catalog", "Q-M7", "Private hosts blocked", true, "unit", "src/domain/catalog/ingestion.test.ts", "SYNTHETIC URL", ""),
  row("T060", "catalog", "Q-M7", "Ranking representation stays sourced", true, "unit", "src/domain/catalog/display.test.ts", "SYNTHETIC rank", ""),
  row("T061", "catalog", "Q-M7", "acceptance_rate never in public DTO", true, "unit", "src/domain/catalog/catalog.test.ts", "SYNTHETIC DTO", "D5"),
  row("T062", "catalog", "Q-M7", "Month-only deadline is not invented last day", true, "unit", "src/domain/catalog/display.test.ts", "SYNTHETIC deadline", ""),
  row("T063", "catalog", "Q-M7", "Country guidance locked before counseling+target", true, "unit", "src/domain/catalog/guidance.test.ts", "SYNTHETIC guidance", ""),
  row("T064", "catalog", "Q-M7", "Guidance unlocks after both gates", true, "unit", "src/domain/catalog/guidance.test.ts", "SYNTHETIC guidance", ""),
  row("T065", "catalog", "Q-M7", "Scholarship requires official URL", true, "unit", "src/domain/catalog/ingestion.test.ts", "SYNTHETIC scholarship", "official_url must be public http(s)"),
  row("T066", "catalog", "Q-M7", "Closed award is not presented as open", true, "unit", "src/domain/scholarships/scholarships.test.ts", "SYNTHETIC scholarship", ""),
  row("T067", "catalog", "Q-M7", "Quarterly source review window", true, "unit", "src/domain/catalog/guidance.test.ts", "frozen clock", ""),
  row("T068", "sessions", "Q-M8", "Counselor matching by topic", false, "manual", "docs/release/manual-tests.md", "n/a", "SES-01 not built"),
  row("T069", "sessions", "Q-M8", "Counselor matching by language", false, "manual", "docs/release/manual-tests.md", "n/a", "SES-01 not built"),
  row("T070", "sessions", "Q-M8", "Counselor matching by availability", false, "manual", "docs/release/manual-tests.md", "n/a", "SES-01 not built"),
  row("T071", "sessions", "Q-M8", "30-minute slot with 15-minute buffer", true, "unit", "src/domain/sessions/sessions.test.ts", "frozen clock", "Booking UI for SES-03 is Partial"),
  row("T072", "sessions", "Q-M8", "Reschedule only 48+ hours before start", true, "unit", "src/domain/sessions/sessions.test.ts", "frozen clock", ""),
  row("T073", "sessions", "Q-M8", "Calendar failure leaves booking confirmed", true, "unit", "src/domain/sessions/sessions.test.ts", "SYNTHETIC adapter", "Preparing link state"),
  row("T074", "sessions", "Q-M8", "Video-link failure leaves booking confirmed", true, "unit", "src/domain/sessions/sessions.test.ts", "SYNTHETIC adapter", "Vendor Daily proving is manual"),
  row("T075", "sessions", "Q-M8", "Single active appointment invariant", true, "unit", "src/domain/sessions/sessions.test.ts", "SYNTHETIC occupancy", ""),
  row("T076", "sessions", "Q-M8", "Occupancy cannot double-book", true, "unit", "src/domain/sessions/sessions.test.ts", "SYNTHETIC occupancy", ""),
  row("T077", "sessions", "Q-M8", "Cancel rules", true, "unit", "src/domain/sessions/sessions.test.ts", "frozen clock", "SES-05 screen not built"),
  row("T078", "sessions", "Q-M8", "Lobby equipment check", false, "manual", "docs/release/manual-tests.md", "n/a", "Needs Daily room"),
  row("T079", "sessions", "Q-M8", "In-session roster", false, "manual", "docs/release/manual-tests.md", "n/a", "Needs Daily room"),
  row("T080", "sessions", "Q-M8", "Follow-up task from session", false, "manual", "docs/release/manual-tests.md", "n/a", "SES-12 folded; no session-to-task command yet"),
  row("T081", "sessions", "Q-M8", "Recording defaults off", true, "unit", "src/domain/sessions/sessions.test.ts", "flag off", "GSC_FEATURE_RECORDING_AI"),
  row("T082", "sessions", "Q-M8", "Recording consent withdrawal stops immediately", true, "unit", "src/domain/sessions/sessions.test.ts", "SYNTHETIC consent", ""),
  row("T083", "sessions", "Q-M8", "AI cannot grant, publish or award", true, "unit", "src/domain/ai/ai.test.ts", "SYNTHETIC prompt", ""),
  row("T084", "sessions", "Q-M8", "Private counselor notes never export", true, "unit", "src/domain/privacy/privacy.test.ts", "SYNTHETIC export", ""),
  row("T085", "sessions", "Q-M8", "No-show handling", true, "unit", "src/domain/sessions/sessions.test.ts", "frozen clock", ""),
  row("T086", "sessions", "Q-M8", "Protected safety content hidden from subject", true, "unit", "src/domain/privacy/privacy.test.ts", "SYNTHETIC safety", ""),
  row("T087", "rewards", "Q-R", "Ledger append-only award", true, "unit", "src/domain/rewards/rewards.test.ts", "SYNTHETIC ledger", ""),
  row("T088", "rewards", "Q-R", "Redemption cannot exceed balance", true, "unit", "src/domain/rewards/rewards.test.ts", "SYNTHETIC ledger", ""),
  row("T089", "rewards", "Q-R", "Concurrent redemption race", true, "unit", "src/domain/rewards/rewards.concurrent.test.ts", "two connections", "Skips without COMMANDS_DATABASE_URL"),
  row("T090", "rewards", "Q-R", "Gift cards stay behind flag", true, "unit", "src/domain/rewards/rewards.test.ts", "flag off", "GSC_FEATURE_GIFT_CARDS"),
  row("T091", "rewards", "Q-R", "Referral code idempotent", true, "unit", "src/domain/rewards/rewards.test.ts", "SYNTHETIC referral", ""),
  row("T092", "rewards", "Q-R", "Admin cannot invent balance", true, "unit", "src/domain/rewards/rewards.test.ts", "SYNTHETIC admin", ""),
  row("T093", "rewards", "Q-R", "Ledger reconciles to zero-sum", true, "unit", "src/domain/rewards/rewards.test.ts", "SYNTHETIC ledger", ""),
  row("T094", "rewards", "Q-R", "Mentoring credits only after ADM-10", true, "unit", "src/domain/rewards/rewards.test.ts", "SYNTHETIC award", ""),
  row("T095", "rewards", "Q-R", "Expired reward is not spendable", true, "unit", "src/domain/rewards/rewards.test.ts", "frozen clock", ""),
  row("T096", "rewards", "Q-R", "Idempotency-Key required on redeem", true, "unit", "src/server/http/headers.test.ts", "n/a", "API requireIdempotencyKey"),
  row("T097", "learning", "Q-M11", "Unpublished lesson hidden", true, "unit", "src/domain/learning/learning.test.ts", "SYNTHETIC lesson", ""),
  row("T098", "learning", "Q-M11", "Progress persist and reset", true, "unit", "src/domain/learning/learning.test.ts", "SYNTHETIC progress", ""),
  row("T099", "learning", "Q-M11", "Video 90% vs reading mark-only", true, "unit", "src/domain/learning/learning.test.ts", "SYNTHETIC lesson", ""),
  row("T100", "learning", "Q-M11", "Accredited copy rejected", true, "unit", "src/domain/learning/learning.test.ts", "SYNTHETIC copy", ""),
  row("T101", "news", "Q-M12", "Withdrawal hides from feed and search", true, "unit", "src/domain/news/news.test.ts", "SYNTHETIC story", ""),
  row("T102", "news", "Q-M12", "Consent independence", true, "unit", "src/domain/news/news.test.ts", "SYNTHETIC consent", ""),
  row("T103", "news", "Q-M12", "Counselor cannot publish stories", true, "unit", "src/domain/news/news.test.ts", "SYNTHETIC role", ""),
  row("T104", "news", "Q-M12", "Engagement uniqueness", true, "unit", "src/domain/news/news.test.ts", "SYNTHETIC engagement", ""),
  row("T105", "journey", "Q-J", "UCAS vs Common App derivation", true, "unit", "src/domain/journey/milestones.test.ts", "SYNTHETIC systems", ""),
  row("T106", "journey", "Q-J", "Inconsistent date flags", true, "unit", "src/domain/journey/milestones.test.ts", "SYNTHETIC dates", ""),
  row("T107", "journey", "Q-J", "Consent independence on journey", true, "unit", "src/domain/journey/roadmap.test.ts", "SYNTHETIC roadmap", ""),
  row("T108", "journey", "Q-J", "Roadmap tasks stay case-scoped", true, "unit", "src/domain/journey/roadmap.test.ts", "SYNTHETIC case", ""),
  row("T109", "admin", "Q-A", "IDOR and role escalation blocked", true, "unit", "src/domain/admin/admin.test.ts", "SYNTHETIC actor", "authenticated_grants.test.sql + rls_p0"),
  row("T110", "admin", "Q-A", "Outbox worker drains atomically", false, "manual", "docs/release/manual-tests.md", "n/a", "Worker not built (WP-17). Do not mock-pass."),
  row("T111", "admin", "Q-A", "Deletion 30-day hold and retained ledgers", true, "unit", "src/domain/privacy/privacy.test.ts", "SYNTHETIC deletion", ""),
  row("T112", "admin", "Q-A", "Export excludes others’ notes and safety", true, "unit", "src/domain/privacy/privacy.test.ts", "SYNTHETIC export", ""),
  row("T113", "admin", "Q-A", "Analytics suppress small cohorts and causal claims", true, "unit", "src/domain/privacy/privacy.test.ts", "SYNTHETIC metrics", "publishMetric min 10"),
  row("T114", "admin", "Q-A", "Automated axe on public routes", true, "e2e", "e2e/a11y.spec.ts", "public routes", "Authenticated routes need credentials; AT checklist is manual"),
  row("T115", "admin", "Q-A", "Point-in-time restore drill", false, "manual", "docs/release/manual-tests.md", "owner backup", "Needs owner PITR"),
  row("T116", "admin", "Q-A", "Unknown body keys rejected", true, "unit", "src/server/http/headers.test.ts", "n/a", "Envelope + body guards"),
];

export const CATALOGUE_IDS = CATALOGUE_CASES.map((row) => row.id);

export function catalogueByGroup(): Record<CatalogueGroup, CatalogueCase[]> {
  const groups: Record<CatalogueGroup, CatalogueCase[]> = {
    guest: [],
    identity: [],
    profile: [],
    finance: [],
    mentorship: [],
    "parent-mentor": [],
    counselor: [],
    catalog: [],
    sessions: [],
    rewards: [],
    learning: [],
    news: [],
    journey: [],
    admin: [],
  };
  for (const item of CATALOGUE_CASES) {
    groups[item.group].push(item);
  }
  return groups;
}
