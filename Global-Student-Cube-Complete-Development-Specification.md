**DEVELOPMENT HANDOFF / VERSION 1.0**

**Global Student Cube**

**Complete Development Specification**

Responsive website • Android • iOS

14 September 2026

From screen-level UI and interaction details to field validation, production architecture, permissions, operational workflows and release tests.

For UI / UX, web and mobile engineers, backend engineers, QA, content operators and delivery leads.

Implementation baseline, not completed software. Based on the supplied Global-Student-Cube-final-Document.docx, with missing details resolved as explicit development decisions.

# How to use this handoff

Start with the binding decisions and design-system rules. Use the screen catalogue for page composition, the domain specification for field and workflow rules, the backend specification for storage and API contracts, and the quality section for build sequencing and acceptance evidence.

The source document remains the product reference. New defaults are intentional, and source conflicts are resolved in the first chapter. Release gates require real implementation evidence; no tests or vendor integrations are represented as already executed.

Use the Word navigation pane or the contents below to jump to a screen or module. The companion Markdown contains the same substantive specification and is suitable for a repository or team wiki.

[How to use this handoff 2](#how-to-use-this-handoff)

[Product charter and binding implementation decisions 4](#product-charter-and-binding-implementation-decisions)

[Document purpose and authority 4](#document-purpose-and-authority)

[Problem, goals and non-goals 4](#problem-goals-and-non-goals)

[Platforms, roles and account boundaries 5](#platforms-roles-and-account-boundaries)

[Identity and safeguarding defaults 5](#identity-and-safeguarding-defaults)

[Adopted conflict resolutions 6](#adopted-conflict-resolutions)

[Recommendation, cost and publication rules 8](#recommendation-cost-and-publication-rules)

[AI, private notes and communications 8](#ai-private-notes-and-communications)

[Technical foundation and rationale 9](#technical-foundation-and-rationale)

[Document use by team 9](#document-use-by-team)

[Design system and interaction contracts 10](#design-system-and-interaction-contracts)

[Measurement and layout model 10](#measurement-and-layout-model)

[Brand tokens and typography 10](#brand-tokens-and-typography)

[Icon placement register 11](#icon-placement-register)

[Component contracts 13](#component-contracts)

[Universal state and microcopy contract 15](#universal-state-and-microcopy-contract)

[Accessibility, motion and cross-platform behavior 16](#accessibility-motion-and-cross-platform-behavior)

[UI handoff completeness rule 17](#ui-handoff-completeness-rule)

[Global Student Cube: Screen-by-Screen Experience Specification 18](#global-student-cube-screen-by-screen-experience-specification)

[Contract, notation and common implementation patterns 18](#contract-notation-and-common-implementation-patterns)

[Public discovery and onboarding 20](#public-discovery-and-onboarding)

[Registration, verification and access 22](#registration-verification-and-access)

[Student and linked-parent workspace 25](#student-and-linked-parent-workspace)

[University, program and scholarship planning 28](#university-program-and-scholarship-planning)

[Counseling, scheduling and follow-up 30](#counseling-scheduling-and-follow-up)

[Mentorship and community 34](#mentorship-and-community)

[Counselor workspace 36](#counselor-workspace)

[Messaging and communication 38](#messaging-and-communication)

[Administration and editorial operations 39](#administration-and-editorial-operations)

[Rewards, referrals and recognition 43](#rewards-referrals-and-recognition)

[Learning and development 44](#learning-and-development)

[News and reviewed updates 45](#news-and-reviewed-updates)

[Application roadmap and lifelong journey 46](#application-roadmap-and-lifelong-journey)

[Settings, privacy, safety and notifications 47](#settings-privacy-safety-and-notifications)

[Compact annotated responsive wireframes 49](#compact-annotated-responsive-wireframes)

[Cross-screen invariants and implementation handoff 51](#cross-screen-invariants-and-implementation-handoff)

[Global Student Cube: domain, fields and business workflows 52](#global-student-cube-domain-fields-and-business-workflows)

[Contract and notation 52](#contract-and-notation)

[Public overview and Guest Mode 53](#public-overview-and-guest-mode)

[Module 1: Basic Registration and approval 53](#module-1-basic-registration-and-approval)

[Module 2: Student’s Full Profile and Academic Details 56](#module-2-students-full-profile-and-academic-details)

[Module 3: Parent and Financial Information 59](#module-3-parent-and-financial-information)

[Modules 4 and 5: Alumni and parent mentorship 59](#modules-4-and-5-alumni-and-parent-mentorship)

[Rewards, referrals and recognition 61](#rewards-referrals-and-recognition-1)

[Module 6: Career counselors and consultancy companies 62](#module-6-career-counselors-and-consultancy-companies)

[Module 7: University, program and supporting catalog 64](#module-7-university-program-and-supporting-catalog)

[Deterministic recommendations, affordability and assessment 67](#deterministic-recommendations-affordability-and-assessment)

[Module 8: assignment, booking, sessions and advisory 68](#module-8-assignment-booking-sessions-and-advisory)

[Learning, news and Alumni Journey Tracking 71](#learning-news-and-alumni-journey-tracking)

[Taxonomy annex: complete supplied alumni options 72](#taxonomy-annex-complete-supplied-alumni-options)

[Cross-cutting failure handling and synthetic ledger check 73](#cross-cutting-failure-handling-and-synthetic-ledger-check)

[Global Student Cube: Backend Architecture and Implementation Contract 75](#global-student-cube-backend-architecture-and-implementation-contract)

[Status, boundaries, and operating decisions 75](#status-boundaries-and-operating-decisions)

[Identity, relationships, and access control 76](#identity-relationships-and-access-control)

[Relational schema and data classification 78](#relational-schema-and-data-classification)

[Database enforcement and sensitive resource security 91](#database-enforcement-and-sensitive-resource-security)

[Transactional domain behavior 93](#transactional-domain-behavior)

[Messaging, consent, AI, and content processing 95](#messaging-consent-ai-and-content-processing)

[REST API contract 96](#rest-api-contract)

[Durable integrations and operational readiness 105](#durable-integrations-and-operational-readiness)

[Global Student Cube: team execution, quality assurance and release 108](#global-student-cube-team-execution-quality-assurance-and-release)

[Delivery contract and scope 108](#delivery-contract-and-scope)

[Role stories and ownership 108](#role-stories-and-ownership)

[Dependency-aware epic and work-package backlog 110](#dependency-aware-epic-and-work-package-backlog)

[Design handoff and usability 113](#design-handoff-and-usability)

[QA method and platform coverage 114](#qa-method-and-platform-coverage)

[Requirement traceability and reconciliation 114](#requirement-traceability-and-reconciliation)

[Specified test catalogue 116](#specified-test-catalogue)

[Threat model and data-quality invariants 122](#threat-model-and-data-quality-invariants)

[Success measurement without misleading attribution 122](#success-measurement-without-misleading-attribution)

[Phased release and evidence gates 124](#phased-release-and-evidence-gates)

# Product charter and binding implementation decisions

## Document purpose and authority

Global Student Cube is an education-guidance platform connecting prospective students and their families with university information, financial planning, counselors, alumni mentors and continued learning. This specification turns the supplied “Global Student Cube – (Draft) Comprehensive Framework / Complete Edition” into a coordinated development handoff for product design, UX, web, Android, iOS, backend, content operations, quality assurance and deployment.

The original document is the product source. It contains detailed ideas, duplicate passages, contradictory limits, missing attachments and unfinished policy text, but no existing implementation, database schema, API contract, final brand system or chosen technology stack. The user confirmed that development starts from scratch and delegated missing implementation decisions to the architect. Consequently, this document defines a new implementation baseline for the existing product, not a description of software already built.

“Must” denotes a release requirement for the feature concerned. “Default” denotes a selected initial configuration, not a question awaiting product approval. “Release evidence” denotes proof the team must produce through implementation, testing, vendor setup or professional review; this document does not claim that those activities have happened.

The business decisions in this chapter take precedence over incidental examples elsewhere. The design-system chapter governs component behavior unless a screen explicitly supplies a narrower rule. Domain validation governs client and server; a screen hiding an action never substitutes for authorization. The backend chapter governs storage and wire contracts; QA verifies the integrated result.

Use stable screen, field, API and test identifiers in Figma, tickets, pull requests and test evidence. If a later implementation reveals an incompatibility, record the change, affected identifiers and migration/test impacts in version control instead of quietly choosing a different rule on one platform.

## Problem, goals and non-goals

The source describes a fragmented student journey: identity verification, academic records, affordability, university comparison, expert guidance and follow-up information need to remain connected to the same student case. The platform must make the next action understandable without making claims that admission, scholarships, visas or employment are guaranteed.

- **Student outcome:** A student can progress from guest discovery through verified registration, profile completion, sourced recommendations and counseling to a practical roadmap.

<!-- -->

- **Family outcome:** A properly linked parent can contribute to the correct student case, understand indicative costs and see only information authorized for that relationship.

- **Advisor outcome:** Counselors and mentors have distinct, permission-limited workspaces, availability management, session records and clear follow-up tasks.

- **Operational outcome:** Staff can verify accounts, publish sourced catalog information, moderate content, resolve exceptional cases and trace changes.

- **Engineering outcome:** Website and native clients implement the same business rules, while adapting layouts and device interactions appropriately.

The following are not product commitments: a university application submission gateway, tuition payments, paid counselor marketplace, automated visa filing, unrestricted social-network directory, clinical advice service, accredited learning credentials, autonomous admission decisions or guaranteed financial outcomes. Official application links, guidance, checklists and user-reported progress are in scope. Payments, commissions and subscriptions are not introduced merely because the source asks whether counselors might charge.

Full scope includes all original Modules 1–8, Module 11, Module 12, rewards/referrals, admin oversight and alumni journey tracking. Source numbering skips Modules 9 and 10; this document does not invent them. Build stages order work and reduce integration risk; they do not remove later source modules from the full-product specification.

## Platforms, roles and account boundaries

The responsive website serves guests, students, parents, mentors, counselors and staff. Android and iPhone apps serve the member roles with the same student-facing capabilities. Staff administration and complex catalog-authoring tools are responsive-web workspaces, not separate native admin apps. Tablet layout is adaptive rather than a stretched phone layout.

An account represents a person with verified credentials. A student case represents the education journey. A counselor company represents an organization associated with individually accountable staff accounts. These entities must not be collapsed into one record or one shared password.

| Actor                         | Baseline access                                              | Boundary                                                               |
|-------------------------------|--------------------------------------------------------------|------------------------------------------------------------------------|
| Guest                         | Published public catalog, overview, tour and limited matches | No private student profile, contact details or saved private state     |
| Prospective student           | Own case and authorized guidance                             | Cannot approve self, publish official data or edit computed results    |
| Parent/guardian               | Explicitly linked cases and granted scopes                   | A known email address or shared surname is not a verified relationship |
| Alumni/current-student mentor | Published mentor profile and accepted mentee connections     | No general access to academic files, religion or household finances    |
| Parent mentor                 | Parent-to-parent guidance and own contributions              | Does not inherit the access rights of a mentee’s guardian              |
| Counselor                     | Assigned cases, own professional profile and sessions        | No unrelated cases or broad company-wide disclosure                    |
| Content operator              | Sourced catalog and approved content tasks                   | Cannot inspect private family records merely to edit universities      |
| Admin reviewer                | Scoped verification and operational queues                   | Privileged actions require stronger authentication and audit           |
| Admin supervisor              | Escalations, exceptional overrides and role management       | No deletion of audit history or unilateral reward balance editing      |

## Identity and safeguarding defaults

Registration uses email and password, email verification and phone OTP before review. Phone verification is not advertised as ongoing two-factor login. Staff accounts require TOTP MFA; members may enable it. Passwords are 12–128 characters with upper case, lower case, a number and a symbol, retaining the stronger source policy. Internal spaces and password-manager paste are allowed; passwords are never trimmed or logged.

The OTP challenge is six digits, expires after five minutes, allows five attempts, and has a 60-second resend delay. Limit sends to five per hour per phone, with additional IP/device abuse controls; a stricter provider restriction wins. Resending invalidates the previous challenge. Error text must not reveal whether another person’s email has an account.

The relational primary key is an immutable UUID. Login email is mutable and normalized for uniqueness; email and preferred country are not database primary keys despite that wording in the source. Approval allocates a non-recycled public reference from GSC-000001 through GSC-999999; rollover uses GSC-A000001 onward. Public references never grant access.

The community-limited pilot eligibility described in the source is retained for student/family private services, while public guest exploration remains available to everyone. Use self-declaration, not surname, geography, photograph or AI inference. Selecting “No” ends the private registration path with truthful, respectful copy and a return to guest mode, without persisting a religious profile. Counselors are verified professionally; their community affiliation is optional and is not a matching factor.

Religion/community responses are visible only to authorized verification staff and excluded from mentor directories, ordinary counselor views, matching features and analytics exports. The policy’s lawful operation, sensitive-data basis and published wording require professional review before activation in each launch jurisdiction. This is a release safeguard, not a claim that the policy is legally cleared.

Under-13 students have guardian-operated cases, not independent logins. Ages 13–17 require verified guardian linkage before full activation, private contacts or recorded sessions. Adults may use the service independently and decide whether to link a parent. A declaration checkbox alone is not evidence that a guardian relationship is genuine. Guardian verification records and escalation procedures are private.

## Adopted conflict resolutions

The following decisions deliberately resolve conflicts rather than leaving them for individual developers. Their rationale should accompany tickets that implement the relevant behavior.

| Decision                               | Adopted rule                                                                                                                                                | Rationale                                                                                      |
|----------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| DEC-01: university limits              | Up to 10 shortlist/recommendation universities; at most 3 saved university-program pairs; at most 3 marked for counselor review, drawn from saved pairs     | Preserves both source numbers as distinct concepts                                             |
| DEC-02: recommendation count           | At most 10 total results, not 10 additional results plus selected universities                                                                              | Aligns the source’s numbered ten-position example                                              |
| DEC-03: parent financial participation | Student or linked parent may complete Module 3; optional financial values may be explicitly declined                                                        | Preserves shared access without forcing an adult to involve a parent                           |
| DEC-04: financial gate                 | Module 3 completion unlocks personalized costs and save functions; parent sharing additionally requires a verified linked parent                            | Keeps public information separate from personalized private outputs                            |
| DEC-05: rescheduling                   | Self-service until 48 hours before the start; audited staff exception thereafter                                                                            | Resolves 24-hour versus two-day instructions conservatively                                    |
| DEC-06: same-day scheduling            | No same-day appointment in counselor time zone and at least 24 hours’ lead                                                                                  | Interprets “no appointment on same day” as no same-day booking, not one session per entire day |
| DEC-07: session rules                  | 30-minute sessions, 15-minute buffer, last end time at least 60 minutes before workday closes                                                               | Gives implementable meaning to the source examples                                             |
| DEC-08: active appointments            | One active counseling booking per student and one active mentor booking per mentee, separately                                                              | Prevents duplicates without blocking the two support channels                                  |
| DEC-09: matching weights               | Field 30, country 20, availability 10, rating 10, workload 30                                                                                               | Completes the source’s incomplete 100-point model                                              |
| DEC-10: assessment                     | Source thresholds 85%/60% remain self-assessment bands; hard failures and unknown mandatory criteria override positive labels                               | Prevents a checklist percentage being mistaken for an admission prediction                     |
| DEC-11: omitted catalog fields         | Do not collect acceptance rate or visa sponsorship; do not use acceptance rate as a tiebreaker                                                              | Honors explicit removal notes over older examples                                              |
| DEC-12: scholarships                   | URL-first published cards with necessary verified filter metadata; extended details only where sourced                                                      | Reconciles “no full fields needed” with the source’s rich data table                           |
| DEC-13: application and visa links     | General information is public; application action links unlock after completed counseling and target selection; visa guidance follows finalized destination | Preserves the source’s staged guidance                                                         |
| DEC-14: recordings and AI              | Recording off unless every required participant consents; AI produces drafts; counselor approves student-facing advice                                      | Makes the source’s automation safe and accountable                                             |
| DEC-15: tiers                          | Star/Silver/Gold/Platinum count 5/10/15/25 unique supported, verified mentees, not session count                                                            | Preserves the source’s student-based tier definition                                           |
| DEC-16: rewards                        | 25 points per approved mentoring session and eligible referral; minimum redemption 500                                                                      | Preserves numeric business commitments                                                         |
| DEC-17: reward inventory               | Initial reward is a 500-point recognition pack; funded gift cards require configured inventory                                                              | Avoids promising unfunded rewards while specifying a working redemption path                   |
| DEC-18: charging                       | Initial counseling and mentoring are free; no payment collection                                                                                            | Smallest safe decision where source asks but does not define pricing                           |
| DEC-19: module routing                 | Prospective parent uses shared case/Module 3; current-student/alumni mentor uses Module 4; parent mentor uses Module 5                                      | Resolves conflicting “current student / alumni parent” routing text                            |
| DEC-20: roadmap                        | Case-level tasks derive from selected program criteria and counselor advice                                                                                 | Implements the final source request without building an external application gateway           |

## Recommendation, cost and publication rules

Country preferences are three ordered choices for a complete student profile, except when the supported catalog contains fewer than three countries. Program discipline and optional specialization are shown for master’s-level planning, retaining the source rule; field of interest remains available at other levels. A current-student mentor records anticipated graduation rather than falsely asserting a completed degree.

Manual selections lead recommendations, followed by a same-city alternative, same-country alternative, four lowest comparable annual-cost options and up to three strong course-ranking alternatives. Remove duplicates and fill remaining positions deterministically. If manual selections use more positions, the remaining ordered buckets fill only available space. Unknown costs never sort as zero. Only comparable ranking publisher/year/subject data may determine ordering.

The annual comparison subtotal is annual tuition plus twelve months of accommodation. Label it “Tuition and accommodation estimate,” not “Total cost of studying.” Broader planning separately itemizes other costs and states the period, currency and exclusions. Financial readiness uses savings/reserves divided by the selected period’s expenses, initially the first academic year; it does not assume all annual household income is available for tuition.

Store original currency, original amount and the conversion snapshot. Refresh the selected FX source daily; after 72 hours show a stale-rate warning rather than claim a current conversion. Unknown or zero expenses produce “Not enough information,” not a percentage. Readiness can exceed 100%; only a graphical bar may cap, never the numeric value.

University, scholarship and visa data carry source URL, source type, retrieved date, verification date, reviewer and next review date. Scraping and AI extraction produce review candidates, not published truth. Rights-cleared QS/THE ranking feeds or permitted attributed entries may be used; no unrestricted ranking API is assumed.

“40% faster counselor responses,” examples of admission probability, hypothetical mentor names/ratings and invented success stories are not live marketing claims. Retain the purpose of the introduction video but remove that unsupported incentive from launch copy. Introduction video is optional and cannot lower a student’s service eligibility.

## AI, private notes and communications

AI supports catalog extraction, explanations, session transcription, advisory drafts, follow-up suggestions and private counselor quality coaching. It does not approve users, grant admission, issue a definitive visa answer, settle complaints, spend reward points or publish a private recording without an authorized human-controlled workflow.

Three records remain separate: private counselor notes, private quality/coaching feedback and an approved shareable advisory. An AI draft must never include internal notes merely because they are present in the same case. Email, push and WhatsApp carry minimal notices with authenticated links, not household financial data, raw transcripts or full reports.

Consent to record is session-specific and separate from general terms. A late participant pauses recording until the consent policy is satisfied. Refusal does not cancel the educational session: use unrecorded conversation and a manual summary. Default retention is 30 days for raw recordings and 90 days for transcripts; case/advisory history remains while the account is active, then enters the deletion workflow.

Calendar synchronization is an integration side effect of a committed booking. A provider outage cannot make the application silently lose a confirmed appointment. A generated meeting link may be “Preparing,” with retries and visible support escalation. Cancellation or rescheduling invalidates old reminders and provider actions through version checks.

Changing counselor requires a reason and an orderly prospective handoff. Ordinary improvement feedback may reach the former counselor, but a safeguarding or abuse complaint is restricted to the investigation team and must not be forwarded to the subject as routine feedback.

## Technical foundation and rationale

The selected architecture is a TypeScript monorepo with a separate Next.js responsive website and Expo React Native mobile application, sharing contracts, validation, domain rules, API client and design tokens. Expo documents workspace-based monorepo support; the chosen design deliberately keeps native rendering separate from the web renderer rather than treating Next.js as a native application engine (Expo monorepo documentation[^1]).

The web application and /api/v1 modular backend deploy to Vercel. Supabase supplies PostgreSQL, authentication, private object storage and authorized realtime; its Next.js guidance covers cookie-based authentication, TypeScript integration and the need to review production row-level policies (Supabase Next.js guide[^2]).

Long-running jobs execute in a separate Node worker on Render, reading a durable PostgreSQL queue/outbox. There is no initial microservice fleet or additional Redis dependency. Sensitive writes go through server-authorized domain operations and database transactions. Database constraints enforce limits even when requests arrive from multiple clients simultaneously.

The selected integration adapters are Resend for email; Twilio Verify for phone verification; Twilio WhatsApp for opt-in messaging; Daily for conferencing; OpenAI behind a replaceable AI adapter; Google and Microsoft for calendar integrations; ExchangeRate-API for FX; and external Google Maps direction links. These selections define what the team will integrate, not a claim that accounts, contracts, provider approvals or production compatibility already exist.

Use EU Frankfurt hosting where the selected services provide it, and explicitly inventory all exceptions and subprocessors. Region configuration, recordings, retention, data transfer arrangements and vendor training/data-use settings must be checked before real personal data is used. Public previews may use synthetic fixtures only.

## Document use by team

UX starts with role journeys, eligibility explanations, interruption handling and the screen contracts. UI builds the token system and component states before page-specific decoration. Frontend implements shared validation and API-driven permissions, not duplicated guesses. Backend implements constraints and authorization before exposing routes. Content staff populate taxonomy and official catalog data with provenance. QA executes the specified cases on all surfaces and records evidence.

This handoff is a specification, not a finished Figma library, compiled app, deployed backend, executed penetration test or legal opinion. Working software, production credentials, approved operational copy, rights-cleared data, provider integration tests and launch checks are separate implementation outputs. No unresolved product-choice questionnaire is required to begin the defined work.

# Design system and interaction contracts

## Measurement and layout model

Web measurements use CSS pixels and native measurements use logical layout units, not physical screen pixels. Raster assets must be supplied at appropriate pixel density without changing logical placement. Screens flow with content and text scaling; absolute coordinates are used only for overlays anchored to a containing component.

| Viewport  | Layout baseline                                                        | Navigation and gutters                               |
|-----------|------------------------------------------------------------------------|------------------------------------------------------|
| 320–359   | Compact single column, 4-column alignment grid                         | 16 side gutters; mobile header and bottom navigation |
| 360–599   | Phone, single-column forms/cards                                       | 16 side gutters; safe-area-aware bottom navigation   |
| 600–899   | Portrait tablet; 8-column alignment grid, optional 2-column card lists | 24 side gutters; navigation drawer                   |
| 900–1199  | Landscape tablet/small laptop; 8-column grid, 2-column forms           | 80-wide navigation rail; 24 content gutters          |
| 1200–1599 | Desktop; 12-column grid                                                | 240-wide sidebar; 32 content gutters                 |
| 1600+     | Wide desktop; 12-column grid, centered content                         | Sidebar remains 240; content max 1440                |

Subtract sidebar width before evaluating available content space; a 1200-wide viewport does not grant a 1200-wide content canvas. Form and reading columns have a 720-unit maximum. A master-detail layout needs at least 320 units for the list and 480 for the detail with a 24 gap; otherwise it becomes drill-down navigation. Do not display a squeezed split view merely because a nominal breakpoint is reached.

At 320 width with 16-unit side gutters, the usable content is 288 units. A 48-unit icon action plus an 8-unit gap leaves 232 units for adjacent text. Two 48-unit icon targets and two 8-unit gaps leave 176 units. Use this arithmetic in long titles and card headers rather than overlapping labels.

Headers are 56 units on phone and 64 on desktop, excluding native safe areas. The member bottom bar is 64 plus bottom safe inset. Reserve bottom content padding for the bar, any sticky CTA and an additional 16-unit clearance; the last field and error text must remain scrollable above them. When the keyboard appears, hide the bottom navigation on form/edit screens and move the primary action into the scrollable form footer if a sticky button would obscure inputs.

Forms use one column below 900 and two above it, with a 24-unit column gap and 16–24-unit row spacing. Labels stay above inputs. Text areas, address blocks, consent, error summaries, videos and uploads span full width. Never rearrange field DOM/accessibility order to achieve a visual grid.

## Brand tokens and typography

The initial brand uses restrained teal, readable navy text and neutral surfaces. This is an adopted design foundation, not an existing trademark or logo system. Use a text wordmark “Global Student Cube” until the team supplies a rights-cleared final logo; a decorative cube mark is not necessary for functional development.

| Token               | Value    | Usage                                              |
|---------------------|----------|----------------------------------------------------|
| color.background    | \#F7F8FA | Main page canvas                                   |
| color.surface       | \#FFFFFF | Cards, form panels, menus                          |
| color.text          | \#172B4D | Body and headings                                  |
| color.textMuted     | \#526175 | Supporting text                                    |
| color.primary       | \#005A63 | Main CTA and selected navigation                   |
| color.border        | \#D8DEE8 | Nonessential dividers                              |
| color.controlBorder | \#718096 | Input/control boundaries where needed for contrast |
| color.focus         | \#2563EB | Keyboard focus ring                                |
| color.error         | \#B42318 | Errors plus text/icon                              |
| color.success       | \#177245 | Completed/verified states plus text                |
| color.warning       | \#8A4B08 | Stale data and caution                             |

Inter is the bundled UI font, with platform system fallback. Use 400, 500 and 600/700 weights only where hierarchy requires them. Body is 16/24; labels 14/20; helper/caption 12/18; phone page title 24/32; desktop title 32/40; section heading 20/28. Native text respects system scaling. Essential labels are never truncated to maintain an aesthetic line count.

Use a spacing scale of 4, 8, 12, 16, 24, 32, 48 and 64. Default input radius is 8, card radius 12 and modal radius 16. Cards use border separation rather than large decorative shadows; floating menus may use a subtle shadow. Modal backdrop opacity is 40% over the current surface.

Initial release is light theme with complete accessibility support. A dark theme is not implied by the source and is not a hidden setting with untested colors. Device dark mode must not invert document previews or create unreadable native system controls.

## Icon placement register

Use one consistent outline icon family. Standard icons are 24 units, inline action icons 20 and passive metadata icons 16, with a two-unit stroke at nominal size. Buttons containing only icons have a 48×48 hit target; explanatory information targets may be 44×44. The visible glyph is centered inside the target. Decorative glyphs are hidden from assistive technology; interactive glyphs receive action-specific names.

| Control/icon                | Exact placement                                            | Label and interaction                                            |
|-----------------------------|------------------------------------------------------------|------------------------------------------------------------------|
| Menu                        | Leading edge of compact header, 48 target inside 56 header | “Open navigation”; opens modal drawer                            |
| Back / ArrowLeft            | Leading header slot on detail/form screens, replaces menu  | “Back to \[destination\]”; restores prior position               |
| Close / X                   | Trailing top corner of dialog, 8 inset from dialog edge    | “Close \[dialog title\]”; unsaved edits invoke discard guard     |
| Search                      | 16 inside leading input edge, 20 glyph                     | Decorative when input label already names search                 |
| Search clear / X            | Trailing 48 target inside search control                   | “Clear search”; keeps input focused                              |
| Filters / SlidersHorizontal | After search field, right-aligned desktop; next row phone  | “Filters, \[count\] active”; opens filters panel                 |
| Sort / ArrowDownUp          | Before results count or after filter control               | Explicit sort label, never an unlabeled arrow                    |
| ChevronDown                 | 16 from trailing control edge, 20 glyph                    | Select affordance; entire control opens choices                  |
| Eye / EyeOff                | Trailing 48 target inside password input                   | “Show password” / “Hide password”; maintains caret               |
| Info                        | After label, 8 gap; 44 target                              | “About \[field\]”; click/tap explanation, not hover-only         |
| AlertCircle                 | Leading error text, 16 glyph, 8 gap                        | Error sentence provides meaning; icon decorative                 |
| CheckCircle                 | Leading completion/status text, 16–20 glyph                | “Verified,” “Saved” or specific state, not color alone           |
| CalendarDays                | Leading 20 glyph within date-select button                 | “Choose date”; typed accessible equivalent also available        |
| Clock                       | Leading time-zone/duration metadata, 16 glyph              | Not a substitute for explicit start/end time                     |
| Globe                       | Leading country/time-zone selector, 20 glyph               | Uses country/time-zone name, not flag-only choices               |
| MapPin                      | Before city and country, 16 glyph                          | External maps action separately labeled                          |
| GraduationCap               | Explore university tab and dashboard shortcut              | “Universities”                                                   |
| Award                       | Scholarship tab/shortcut, equal prominence to Universities | “Scholarships”                                                   |
| Bookmark                    | Card top-right 48 target; detail action row                | “Save \[program\]” / “Remove saved \[program\]”                  |
| Flag                        | Beside saved pair’s counselor-review action                | “Mark for counselor review”; independent of bookmark             |
| Bell                        | Header trailing utility slot                               | “Notifications, \[count\] unread”; badge max visual 99+          |
| MessageSquare               | Role navigation and profile connect action                 | “Messages” or “Message \[person\]”                               |
| Send                        | Right of chat composer, 48 target                          | “Send message”; disabled when trimmed message empty              |
| Paperclip                   | Left of composer, 48 target                                | “Attach a file”; permission/size feedback before upload          |
| Camera                      | Photo chooser option before text                           | “Take photo”; never auto-opens camera on page entry              |
| Upload                      | Leading upload button icon with 8 gap                      | “Upload \[document type\]”                                       |
| Download                    | Leading report/resource button icon                        | “Download \[title\], \[format\]”                                 |
| ExternalLink                | After official-link text, 8 gap                            | Name includes “opens external website”                           |
| Video                       | Leading join-session CTA                                   | “Join session”; not enabled until authorized link ready          |
| Mic / MicOff                | Session toolbar 48 target                                  | “Mute microphone” / “Unmute microphone”                          |
| VideoOff                    | Session toolbar 48 target                                  | “Turn camera off” / “Turn camera on”                             |
| ShieldCheck                 | Beside mentor verification text                            | “Identity verified”; never means professional outcome guaranteed |
| Star                        | Rating summary preceding numeric score and count           | Contribution tier rendered as separate badge                     |
| MoreHorizontal              | Trailing card/list action 48 target                        | “More actions for \[record\]”                                    |
| Pencil                      | Trailing section heading action                            | “Edit \[section\]”; not used to edit computed values             |
| Trash2                      | In overflow or secondary destructive action                | “Remove \[item\]”; confirmation for destructive persistence      |
| Copy                        | Next to referral code/reference, 48 target                 | “Copy referral link”; announce “Link copied”                     |
| QrCode                      | Referral share options, after copy action                  | “Show referral QR code”; also provide text link                  |
| Heart                       | News-card bottom actions with count if shown               | “Like update” / “Unlike update”; toggle state exposed            |
| Settings                    | More menu or desktop bottom sidebar                        | “Settings”; never used as a generic overflow icon                |

Web tooltips appear after a 400ms hover or keyboard focus, offset 8 units from their trigger; tapping information opens a persistent popover or sheet. Tooltips cannot contain the only instructions for a required task. At viewport edges flip and constrain the popover instead of letting it leave the screen.

## Component contracts

### Buttons, links and navigation

Primary buttons are 48 high, full available width on narrow forms and at least 160 wide on desktop form footers. Horizontal padding is 16 and icon-label gap is 8. Labels use verbs: “Save profile,” “Confirm appointment,” “Send invitation.” “Submit” is used only where the purpose is explicit in the surrounding context.

Each button has idle, hover, focus, pressed, disabled and loading states. Loading retains the width, replaces the leading icon with a spinner and preserves the action label. Disable duplicate requests immediately, but enforce idempotency on the server as well. Do not put a spinner on an operation that already failed; show retryable error feedback.

Back means navigation without submitting. Cancel means abandoning a draft or cancelling an operation and must say which. Destructive controls are visually secondary to safe navigation until their confirmation step. A confirmation names the affected record and effect; the safe action receives initial focus when loss is possible.

Bottom navigation contains no more than five labeled destinations. Student/parent: Home, Explore, Sessions, Messages, More. Mentor: Home, Requests, Sessions, Messages, More. Counselor: Home, Students, Sessions, Messages, More. Desktop navigation mirrors the role structure; More destinations become grouped sidebar sections rather than a different product taxonomy.

Persist selected tab and scroll position when returning from a detail screen. Browser Back and Android system Back first close a transient overlay, then pop the current screen. On iOS, preserve the standard back gesture where compatible with the unsaved-change guard. Deep links pass through authentication and permission checks, then return to the intended resource or a safe access-denied page.

### Inputs, selectors and validation

Input height is 48, horizontal padding 12, text 16. Labels sit 8 units above; helper or error text begins 4 units below. Required fields use “Required” in the accessible description and a consistent visible indicator explained once at the form top. Optional values are labeled “Optional”; do not infer that a user must provide every field to save a draft.

Validate format on blur, dependent fields when their controlling answer changes and the whole step on Continue. Do not show “required” errors on untouched initial render. After submit errors, place focus on an error summary linked to each offending field; clicking an error reveals the correct section and focuses the input. Retain valid values after server errors.

Dropdowns with more than seven options include search. Country lists display full names and dialing codes as appropriate. Never assume residence equals nationality or a dialing prefix identifies the current country. Automatic suggestions are editable and clearly identified; browser inability to access a SIM card is not an error. Date entry accepts accessible typing on web as well as a picker; native date UI is wrapped by the same validity rules.

Money controls display a currency selector next to the amount, with period in the label. Show localized formatting only after parsing; validation must not silently reinterpret “1,500” as “1.5.” Keep canonical decimal values in the data layer and explain whether an amount is annual, monthly, one-time or full-program.

Radio groups use a legend and individually labeled 48-high rows. Checkboxes have a 20-unit visual box inside a 48-high row. Multi-select chips wrap; removal has its own labeled hit target. Ordered country choices support “Move up” and “Move down” buttons as an accessible alternative to dragging.

### Uploads, documents and media

The uploader displays permitted types, size and count before selection. It offers Choose file and, where appropriate, Take photo; camera permission is requested only after that action. Drag/drop on web is optional enhancement, never the sole path.

Each selected file row shows filename, size, status, progress and a trailing Cancel or Remove control. States are selected, uploading, scanning, ready, rejected, failed and cancelled. “Uploaded” is not shown until server confirmation; “Ready” waits for the security scan. Scan failure provides a clear retry/replacement path without exposing scanner internals.

For photos, offer crop/rotate, confirm and replace; cancel preserves the existing photo. For optional introduction video, show duration and file-size limits before upload, playback controls and explicit optionality. Never auto-play audio. Mentor quick tips may auto-play muted when visible and permitted by device settings, with pause, captions and reduced-motion/data-saving respect; otherwise show a poster and Play.

Reports open in an authenticated viewer or platform document view, with a download action after current authorization. A copied signed URL is short-lived and is not a permanent share mechanism. “Share with parent” initiates authorized in-app delivery, not the operating-system share sheet for confidential PDFs.

### Cards, tables, tabs and pagination

Cards use 16-unit internal padding on phone and 24 on desktop. The heading is upper-left, key metadata beneath, state/action controls upper-right where adequate width exists and the primary action at the bottom. Interactive child controls cannot sit inside one giant nested button; make the title the detail link and bookmark a separate button.

Catalog card order is title, institution/location, program level/duration, verified estimate or “Not available,” source freshness, matching explanation and actions. A price is always accompanied by currency and period. Ratings show both mean and sample count; no rating is not zero stars.

Tables use semantic headings and a visible sort state. Text aligns left, comparable amounts right, status labels consistently. On phone, case/reward/admin rows become label-value cards. The university comparison table may retain a dedicated horizontal scroller because comparison needs two-dimensional reading, but provide a one-university card mode and an explicit scroll hint. The whole page must not scroll horizontally.

Use server pagination for large lists. Default 20 records with next-page affordance; preserve filters in URL/web navigation state and native screen state. Search is debounced 300ms and previous requests are cancelled or ignored by sequence number, so late results cannot overwrite newer queries.

### Dialogs, drawers and sheets

Desktop dialogs have max-width 560 for confirmations and 720 for complex forms, with 24 padding. At narrow widths use a full-width sheet with 16 side padding or full-screen form for long content. Dialog content has a maximum viewport-aware height, its own scroll area and a visible title.

Initial focus goes to the title or first appropriate input, then remains trapped until close. Escape, Android Back and the Close button share the same safe-close policy. Returning focus goes to the triggering control or a sensible successor if the record was removed. Never stack multiple dialogs; a confirmation replaces the current overlay state or uses an inline confirmation.

Filter sheets place Reset on the leading footer edge and “Show results” on the trailing/full-width primary action. Closing without applying restores the last applied filter state; Reset changes the draft filters and is applied only on confirmation.

## Universal state and microcopy contract

Every data screen implements initial loading, loaded data, genuine empty state, filtered-empty state, partial data, request error, offline/unreachable, expired session, forbidden access and stale data. These states are distinct. “No universities found” must not be used for a network failure; “Not available” must not be rendered as a zero price.

| State           | Required behavior                                     | Baseline copy                                                                  |
|-----------------|-------------------------------------------------------|--------------------------------------------------------------------------------|
| Loading         | Skeleton approximates stable layout; label long tasks | “Loading your appointments…”                                                   |
| Empty           | Explain why and provide the next relevant action      | “You have no saved programs yet. Explore universities to choose up to three.”  |
| Filtered empty  | Preserve entered filters and offer reset              | “No results match these filters. Try a different country or clear filters.”    |
| Retryable error | Keep prior/draft data; local Retry control            | “We couldn’t load this section. Your saved information is unchanged.”          |
| Offline         | Do not claim server persistence or confirmed booking  | “You’re offline. Reconnect to save these changes.”                             |
| Save failed     | Dirty state remains visible                           | “Changes weren’t saved. Retry before leaving.”                                 |
| Conflict        | Show that another authorized edit occurred            | “This information changed elsewhere. Review the latest version before saving.” |
| Locked feature  | Explain exact prerequisite, with route to it          | “Complete your financial-planning section to save a program.”                  |
| Forbidden       | Do not disclose protected resource existence/details  | “This page isn’t available to your account.”                                   |
| Expired session | Reauthenticate and restore only safe state            | “Sign in again to continue.”                                                   |
| Stale source    | Show verified date and caveat                         | “This estimate needs a freshness check. Confirm it with your counselor.”       |

Success feedback for an explicit form save is a persistent saved timestamp near the section plus a short polite announcement. Toasts may supplement but never carry the only evidence of a booking, cancellation, uploaded document or financial action. General informational toasts last six seconds, pause on focus/hover and are dismissible; errors remain until action or dismissal.

Autosave uses an 800ms idle delay for authenticated nonsecret profile drafts. Do not autosave passwords, OTPs, consent acceptance or irreversible commands. Show “Saving…”, “Saved \[time\]” or “Not saved.” A navigation attempt with unresolved dirty state offers Stay or Leave without saving; it must not imply that a draft saved when it did not.

## Accessibility, motion and cross-platform behavior

The project target is WCAG 2.2 AA for web, with native platform accessibility equivalents tested separately. W3C’s reflow criterion addresses content at a width equivalent to 320 CSS pixels, and its minimum target criterion is 24×24 CSS pixels with specified exceptions; this project intentionally uses larger 48-unit primary targets rather than incorrectly describing 48 as the AA minimum (WCAG 2.2[^3]).

Body text contrast must be at least 4.5: 1, large text 3: 1, and meaningful control/focus boundaries 3: 1 as part of the project’s accessibility verification. A light divider token does not automatically qualify as an input boundary. Verify actual token combinations, disabled-state legibility, text over images and focused states in the implemented clients.

Every form has a programmatic label, logical reading order and text error association. OTP accepts paste/autofill; six visual boxes, if used, expose a coherent input rather than six confusing unlabeled fields. Password requirements update in text as well as color. Focus indicators remain visible and are never obscured by fixed headers or footers.

Use 150ms control transitions and 200ms sheet/dialog transitions. Respect reduced motion by removing travel, parallax and nonessential animated progress. No celebratory animation blocks the completion action. Do not animate information out of view before a screen reader has announced it.

Support keyboard-only completion of every web task, including reorder controls, rating scales, upload, booking and modal dialogs. Native VoiceOver/TalkBack labels include role, current state and actionable value. At increased text sizes allow wrapping and greater component height; do not shrink the font to force a nominal 48-unit row.

Launch UI language is English; all strings are externalized, dates/numbers localized and layout uses logical leading/trailing properties. User-entered names and text accept Unicode. Full translated interfaces are not claimed without translated content and QA. Preserve mixed-script names and do not infer names, relationships or gender from an image.

Native apps handle notification permission denial, camera denial, storage selection cancellation, lost connectivity, background upload interruption, meeting-app interruption and app restart. No secret or full financial draft is stored in unencrypted general local storage. Returning from an external university page restores the originating screen, filters and scroll position.

## UI handoff completeness rule

A screen is design-ready only when it has its role, entry conditions, content order, field mapping, action destinations, state variants and responsive behavior. It is build-ready only when the relevant API contract and permission checks exist. It is release-ready only after test evidence confirms that the implementation matches those contracts.

The screen catalogue below supplies page-specific behavior; the rules above are inherited by every screen, not optional background guidance. Designers may improve appearance without changing task order, semantics, constraints or authorization. Any such functional change updates the specification, implementation and tests together.

# Global Student Cube: Screen-by-Screen Experience Specification

## Contract, notation and common implementation patterns

This is the canonical screen register for responsive website, iOS and Android experiences. It implements the binding implementation decisions chapter over conflicting language in the supplied Global Student Cube document. Screen IDs identify experiences, not individual modal instances. A route parameter such as :caseId is an opaque identifier, never an email address. Routes below are web paths; unless explicitly marked **web-only**, the native navigation destination is the same screen ID with the same typed parameters. Native deep links resolve through authentication, approval and case authorization before opening the destination. A browser URL is not evidence of permission.

Every screen inherits **B**, the baseline below, and its named layout pattern. Each screen’s **States** adds to, rather than replaces, the baseline loading, empty, error, disabled and permission behavior. **Responsive** specifies the screen’s distinctive change in addition to its inherited pattern. Ordered **Layout** clauses describe the top-to-bottom reading and keyboard order. **Actions** names the primary action first; secondary actions follow. A named action with no new route changes the current screen’s state. All adopted decisions are requirements, not requests for later product approval.

### B: shared geometry, accessibility and behavior

- Use Inter, bundled under its license, with system fallback. Body is 16/24, labels 14/20, helper text 12/18, phone title 24/32 and desktop title 32/40. Light tokens are background \#F7F8FA, surface \#FFFFFF, text \#172B4D, muted \#526175, primary \#005A63, border \#D8DEE8, focus \#2563EB, error \#B42318, success \#177245, warning \#8A4B08. Status always combines text with shape or icon.

<!-- -->

- Spacing tokens are 4, 8, 12, 16, 24, 32, 48 and 64. Inputs have radius 8, cards 12 and modals 16. Cards have 16 padding below 600 and 24 otherwise. Fields are minimum 48 high with a visible label above, 8 label-to-control gap and 4 helper gap. Field groups have 24 separation. Text areas start at 120 high and grow.

- Width classes are compact 320–359, phone 360–599, portrait tablet 600–899, landscape tablet 900–1199, desktop 1200–1599, wide 1600+. Safe horizontal page padding is 16 below 600, 24 at 600–1199 and 32 above. Main content maxes at 1440; prose and form content maxes at 720. Layout uses 4/8/12 conceptual mobile/tablet/desktop columns. Forms have one column below 900 and two above; long text spans both.

- Web header height is 56 below 900 and 64 above; native header is 56 plus top safe area. Desktop navigation is 240 wide at 1200+, an 80 rail at 900–1199, and a drawer below 900. Member bottom navigation is 64 plus safe inset below 900, including native tablets in portrait. Add 16 clearance above fixed bars; reserve their full height in scroll content. Keyboard appearance moves the composer or action bar above the keyboard, never above the last unread field.

- Student/parent navigation: Home, Explore, Sessions, Messages, More. Mentor: Home, Requests, Sessions, Messages, More. Counselor: Home, Students, Sessions, Messages, More. More lists Learning, News, Rewards when eligible, Journey, Settings and Help. Desktop labels mirror this organization. Scholarship has its own GraduationCap shortcut in dashboards and a labeled Explore tab, not a sixth bottom item.

- Lucide-style outline icons use 2px strokes, normally 24, inline 20 and metadata 16. Essential touch targets are 48 square even for a smaller glyph; inline information targets are 44 square. Leading action icons sit 12 from the left edge with 8 to text. Trailing chevrons sit 12 from the right edge. Header Back is top-left, Notifications and account menu top-right; names are announced. No decorative icon substitutes for a label.

- Primary buttons are 48 high, full width below 600 and minimum 160 wide otherwise. Secondary actions are outlined or text buttons of the same target size. Destructive actions require an explicit object-specific confirmation. Confirmation modals max at 560 wide, complex form dialogs at 720, and side drawers at 480; below 600 complex dialogs become full-height sheets. Focus traps, Escape/native Back, unsaved-change confirmation and focus restoration are mandatory.

- **Loading:** preserve header, current case and navigation; skeleton only the requested content, with aria-busy. Announce completion once, not every skeleton. **Empty:** show a domain-specific explanation and the defined recovery action, never invented records. **Error:** retain safe entered values, put an alert before the affected region and offer a scoped Retry. Failed writes never show success.

- **Disabled:** explain the unmet prerequisite beside the control; do not rely on a hover tooltip. Pending mutations disable only conflicting actions and are idempotent. **Permission:** guests receive a sign-in/register gate with a safe return destination; unapproved members return to AUTH-07; revoked case access clears private content and offers PAR-03 or the role home. Forbidden resources disclose neither existence nor owner. Native camera, microphone, photo and notification permissions are requested just in time with an alternative where feasible.

- Persist form drafts to the authenticated private case, showing Saving, Saved and Not saved. Never persist passwords, OTPs or private uploads in guest browser storage. Logout, case change and permission revocation clear private view caches. Offline shows last-refresh time; permit safe local drafting but not apparent completion of bookings, approvals, redemptions or sharing.

- Search fields have leading Search and trailing Clear. Search starts after a short debounce and explicit submit also works; stale responses cannot replace newer queries. Preserve filters, pagination and scroll on detail-return. Announce result counts. Lists paginate after 20 records, with a labeled Load more, rather than endless inaccessible loading.

- Upload rows show filename, file type, size, progress, scan status and trailing Remove. Adopt private PDF/JPEG/PNG/WebP up to 20MB for documents, JPEG/PNG/WebP up to 5MB for avatars, MP4 up to 100MB and 60 seconds for introductions. Validate on client and server; quarantined files cannot be viewed or shared. Camera/gallery denial still offers file selection. Media has captions or text alternatives, pause controls and no audible autoplay.

- Show currencies with ISO code, original amount and conversion snapshot date/provider. Unknown means unknown, not zero. Dates identify precision: exact day or month-only. Session times show the viewer’s IANA zone and counselor’s zone when different. Explain external destinations before leaving; public information URLs are separate from gated application URLs.

### Layout inheritance

**P, public:** header with logo left and Log in/Register right, no member sidebar; main sections have 32/48 vertical spacing; footer contains Privacy, Terms, Help. At 320, menu replaces horizontal links and actions stack. At 768, content is 720 wide. At 1440, main width is 1376 before its own cap.

**F, form:** header, breadcrumb/back, title and purpose, optional 48-high step strip, error summary, one 720-max card of ordered fields, then action bar. On desktop the bar stays within the form, on phones it is sticky above bottom navigation or safe area. At 320/390 the inner field widths are 256/326 inside a padded card; remove the card’s outer border and padding for very long forms to recover 288/358 when noted.

**D, dashboard:** member shell, title/case context, next-action card, metric strip, main task/feed cards and contextual secondary column. At 1440 the 240 sidebar leaves 1136 usable main width after 32 margins; split 744/368 with 24 gap. At 768, 720-wide main stacks, with two metric columns. At 390/320, 358/288-wide main stacks with two compact metrics only if labels fit.

**L, list/discovery:** shell, title, search, filters, result count and sort, cards/rows, pagination. Desktop filter panel is 240 wide with 24 gap; below 900 filters use a 48-high Filter button opening a sheet, with Apply and Clear. At 768 cards use two columns when each is at least 320; below 600 one column. No essential text is ellipsized without an accessible expanded view.

**T, detail:** shell, Back and title, status/identity summary, local section navigation, main detail cards, side summary/actions. Desktop main/detail split is 744/368; below 900 summary follows title, then sections. At 320 sections use a labeled select instead of overflowing horizontal tabs. Public variants inherit P’s header, not private member context.

**W, workbench:** authorized staff shell, title/status, controls, work queue or editor, audit/history, action bar. At 1440 editor and evidence panes split 2: 1 with 24 gap. At 768 stack evidence after the associated field. At 320/390 replace rows with labeled cards; never require desktop to finish an authorized task. Admin remains web-only, including mobile web.

### Source-family references and explicit source corrections

References below are to the supplied source’s actual heading names, not Word page numbers. There are no Modules 9 or 10. Acceptance rate and visa sponsorship fields marked for removal stay removed. Work-integrated learning is a counselor discussion topic rather than an unsupported catalog metric. Source claims about guaranteed clarity, faster responses or admissions probability are not product promises. No payment, scholarship-submission, university-role portal or ticketed-events system is introduced.

## Public discovery and onboarding

Source family: “Before going to Registration”, “Guest Mode”, “Interactive Guest Features”, “Leaderboard”, and “Mentee Success Story”.

### PUB-01 · Overview and guest home

**Route/entry:** /; everyone, including first native launch. **Pattern:** P.

**Layout:** 1. Header. 2. H1 “Your pathway to global education”, source tagline beneath at 16/24. 3. Published coverage counters and 30-minute free counseling explanation in a 24-padded card. 4. Feature links in reading order: Match, Universities, Scholarships, Counselors, Alumni/Parent Mentors, Roadmap, Rewards. 5. Optional labeled announcement panel, then verified mentor leaderboard and approved stories. 6. Preparation checklist and footer.

**Actions:** “Start my journey” with leading ArrowRight goes AUTH-01; “Try a 60-second match” goes PUB-03; “Take the tour” goes PUB-02. GraduationCap scholarship card goes PUB-04.

**States:** B; unavailable coverage says “Coverage updating”; absent announcements collapse; unpublished testimonials never render. **Responsive:** desktop hero 8/4 columns, phone all stacked.

**Acceptance:** With zero published universities, the counter shows zero and no fabricated examples. Choosing any teaser never creates a private profile.

### PUB-02 · Role-aware app tour

**Route/entry:** /tour?audience=:audience; guest or member from Help. **Pattern:** P.

**Layout:** 1. Close top-right. 2. Audience selector for student/parent, mentor, counselor or overall. 3. Step title and 16: 9 demonstration player with captions. 4. Three concrete instructions. 5. Text step count, progress indicator and Previous/Next controls. 6. Preparation list for registration, academic evidence and optional finances.

**Actions:** “Next” advances the indexed tour state; final “Register” goes AUTH-01, or “Return to dashboard” to the authenticated role home. “Skip tour” returns to the recorded entry screen.

**States:** B; failed video leaves the complete text walkthrough; missing audience content falls back to overall with explanation. **Responsive:** desktop player max 720; phone controls remain below text, not over video.

**Acceptance:** With reduced motion enabled, steps change without animated panning. Skipping never marks onboarding modules complete.

### PUB-03 · Guest course and university match

**Route/entry:** /quick-match; no account needed. **Pattern:** F with result list.

**Layout:** 1. Title and “No personal details required”. 2. Country and subject selects. 3. Search preview action. 4. Result heading, 3–5 university cards and 1–2 scholarship cards when available. 5. Each university shows name, city, course, public fee range and source date. 6. Registration invitation.

**Actions:** “Show matches” runs a public-catalog query; “View university” goes CAT-02; scholarship goes CAT-08; “Personalize my matches” goes AUTH-01 with country/subject carried only as optional preferences. Leading Sparkles labels the preview, not an AI confidence score.

**States:** B; fewer matches are explicitly counted; empty offers “Change subject”; missing fee says “Not published”. **Responsive:** result cards become two columns at 768, inputs remain one.

**Acceptance:** Results contain at most five universities and two scholarships. Search submits no name, contact or financial data.

### PUB-04 · Scholarship preview

**Route/entry:** /preview/scholarships; guests. **Pattern:** L inside P.

**Layout:** 1. GraduationCap title. 2. Banner “Register to view the full scholarship directory”; supporting text explains applications happen on providers’ websites. 3. Country/level filters. 4. Curated URL-first cards with title, provider, open/upcoming/closed status and verified date. 5. Registration CTA and footer.

**Actions:** “View scholarship” goes CAT-08 public mode; “Unlock full directory” goes AUTH-01, returning to CAT-07 after approval. Filter changes stay here.

**States:** B; no curated entries shows truthful empty state and retains registration; unsafe or withdrawn links are disabled with explanation. **Responsive:** filter panel becomes sheet below 900; no paywall-style blurred fake rows.

**Acceptance:** Guest requests cannot enumerate non-preview scholarship records. The banner never implies that GSC submits scholarship applications.

### PUB-05 · Mentor teaser

**Route/entry:** /preview/mentors/:mentorId; public approved, published mentor only. **Pattern:** T/P.

**Layout:** 1. Back and 64-avatar identity. 2. Separate ShieldCheck “Verified mentor” and contribution-tier labels. 3. University/course or parent experience, exactly published topics. 4. Thirty-second tip player, muted with visible pause. 5. Top-five answered questions, then consented testimonials. 6. Connect gate.

**Actions:** “Register to ask a question” goes AUTH-01 with mentor intent; “Browse mentors” goes MEN-01 public variant. Play icon is centered in the media poster, label “Play mentor tip”.

**States:** B; no tip replaces player with text reflection; no testimonial hides that section; revoked publication returns unavailable. **Responsive:** desktop media at right of biography; mobile biography precedes media.

**Acceptance:** A teaser includes neither private contact details nor mentee identity without publication consent. Autoplay is suppressed for reduced motion/data-saving preferences.

### PUB-06 · Success stories wall

**Route/entry:** /stories; public; detail uses ?story=:storyId on this screen. **Pattern:** L/P.

**Layout:** 1. Title and “Shared with permission”. 2. Country/topic filters. 3. Story cards with approved headline, excerpt and consented attribution. 4. Selecting a card expands a readable 720-max story with publication date and related mentor. 5. “Share your journey” footer CTA.

**Actions:** “Read story” opens selected-story state; “Share your journey” goes JRN-03 if eligible, otherwise AUTH-01. Share2 at card footer shares only the published URL.

**States:** B; no published stories gives invitation without sample achievements; withdrawn story removes attribution and returns list. **Responsive:** three desktop columns, two tablet, one phone; detail is never a narrow side panel.

**Acceptance:** Admin approval without subject publication consent cannot publish a story. Revocation removes the public detail on refresh and cached authorization revalidation.

## Registration, verification and access

Source family: “Module 1: Basic Registration (Pre-Approval)”, “Global Student Cube - Data Consent”, “Registration Approval Email”, and Module 6 registration fields.

### AUTH-01 · Role, purpose and eligibility

**Route/entry:** /register; first-time applicants. **Pattern:** F/P.

**Layout:** 1. Back to guest home. 2. “Create your account”, step1/4. 3. 72-min-height role radio cards: Student, Parent, Admission counselor/advisor. 4. Student/parent intent: seeking university, currently studying, alumni/family of alumni. 5. Pilot eligibility question for student/parent only. 6. Privacy explanation and continuation.

**Actions:** “Continue” goes AUTH-02; counselor branches to professional verification later. “No” to pilot eligibility opens truthful soft-exit explanation, “Continue as guest” goes PUB-01 and discards this draft. Leading UserRound/Users/Briefcase icons belong inside role cards.

**States:** B; Continue disabled until selections; no inferred eligibility; counselor community association remains optional. **Responsive:** role cards one column below 900, three across above within 720.

**Acceptance:** Selecting No creates no private profile. Existing authenticated applicants opening this route resume AUTH-07 rather than create a duplicate.

### AUTH-02 · Identity and age routing

**Route/entry:** /register/identity; valid AUTH-01 draft. **Pattern:** F/P.

**Layout:** 1. Step2/4. 2. Full name, editable surname suggestion and father/husband name. 3. Gender radios. 4. Date of birth with native date picker and explicit DD/MM/YYYY helper. 5. Nationality, residence country/city, street/address/postcode. 6. Age-specific guidance and actions.

**Actions:** “Continue” validates then AUTH-03; “Back” AUTH-01. CalendarDays sits trailing in birth-date control. Name parsing suggests only; it never assumes a family relationship. Adopt Unicode letters, spaces, apostrophes and hyphens instead of ASCII-only rejection.

**States:** B; impossible/future birthdate rejected; under 13 independent signup stops and offers parent registration; ages 13–17 see mandatory guardian activation requirement. **Responsive:** compact form removes outer card padding; country precedes dependent city on all widths.

**Acceptance:** Editing suggested surname preserves the user’s correction. A twelve-year-old cannot proceed as an independent student account.

### AUTH-03 · Contact and password

**Route/entry:** /register/contact; valid identity draft. **Pattern:** F/P.

**Layout:** 1. Step3/4. 2. Login email. 3. Phone country-code picker plus phone. 4. “WhatsApp is the same” checkbox, conditional separate number, separate opt-in. 5. Password and confirmation with trailing Eye “Show password”. 6. Five textual rule indicators and action bar.

**Actions:** “Continue” goes AUTH-04 after validation; “Back” AUTH-02. Password policy is 12–128 characters, upper/lower/number/symbol, internal spaces allowed, no trimming. Country-code suggestion is editable and never requires SIM access.

**States:** B; duplicate-email response offers AUTH-08 without exposing account details to unauthenticated probes; mismatch explained beside confirmation; paste/autofill allowed. **Responsive:** phone code and number share a row at 320 with96 code width, remaining field flexible.

**Acceptance:** A valid password containing spaces is submitted unchanged. Opting out of WhatsApp leaves registration available.

### AUTH-04 · Evidence, privacy and submission

**Route/entry:** /register/review; previous draft valid. **Pattern:** F/P.

**Layout:** 1. Step4/4 and editable identity summary. 2. Avatar Camera upload. 3. Passport status Yes/No/In process for university-seeking student/parent cases only. 4. At least one professional/social URL, additional optional URLs. 5. Counselor company/individual selection and evidence prompt when relevant. 6. Versioned data-use policy, required acknowledgement and separate optional communication choices.

**Actions:** “Create account and verify” creates the UUID-backed pending account, goes AUTH-05; “Edit contact” AUTH-03. Policy link opens SET-03 public document state without losing draft.

**States:** B; unsafe URL or unscanned evidence blocks submission; unchecked required consent explains why; optional marketing is not prechecked. **Responsive:** review summary is a definition list on320, never a wide table.

**Acceptance:** Submission cannot set approved status or allocate a GSC number. A counselor is not asked for passport status.

### AUTH-05 · Email verification

**Route/entry:** /verify-email; signed-in unverified account or valid email deep link. **Pattern:** F/P.

**Layout:** 1. Mail icon above title, not replacing it. 2. Masked destination address. 3. Verification instructions and resend countdown. 4. Change email row. 5. Verified confirmation when challenge succeeds.

**Actions:** “Open email app” invokes device mail where available; “I have verified” rechecks then AUTH-06; “Resend verification” issues a throttled link; “Change email” returns AUTH-03 in account-update mode and invalidates previous challenge.

**States:** B; expired/used link gives resend, not generic failure; offline cannot claim verified; address-update error retains prior address. **Responsive:** central panel max 480; actions stack at 320/390.

**Acceptance:** Opening an expired link does not activate the account. Verification on another device is recognized after recheck without requiring registration again.

### AUTH-06 · Phone verification

**Route/entry:** /verify-phone; verified email, pending phone. **Pattern:** F/P.

**Layout:** 1. Smartphone title icon. 2. Masked phone and “This verifies your phone, not two-factor login”. 3. Single logical six-digit OTP input with visual character spacing. 4. Five-minute expiry and 60-second resend countdown. 5. Change phone and verification action.

**Actions:** “Verify phone” consumes challenge then AUTH-07; “Resend code” issues SMS within five sends/hour/phone and stricter provider limits; “Change phone” returns AUTH-03 contact-update mode.

**States:** B; five failed attempts invalidates challenge; rate limit displays retry time; expired entry clears digits but preserves phone. **Responsive:** OTP remains one accessible field, width full on320, max 320 otherwise.

**Acceptance:** Pasting six digits fills the complete input. Successful OTP alone cannot bypass email verification, guardian requirements or admin approval.

### AUTH-07 · Approval, guardian and correction status

**Route/entry:** /account/status; verified applicant or restricted member. **Pattern:** F.

**Layout:** 1. Status icon and Pending/Changes requested/Rejected/Approved/Suspended text. 2. Submitted date and review timeline. 3. Required evidence/guardian task cards. 4. Applicant-facing reviewer message, never internal notes. 5. Help and guest exploration.

**Actions:** Pending “Explore public universities” goes CAT-01 public mode; “Provide requested information” opens AUTH-04 or COU-02/03 as appropriate; “Verify guardian” goes PAR-02. Approved “Continue” routes student STU-02, parent PAR-03, mentor MEN-03/04, counselor COU-02 or MFA first.

**States:** B; after seven days display “Escalated for review”, not guaranteed approval; suspended access does not reveal cached cases. **Responsive:** timeline vertical at all widths.

**Acceptance:** Approved account shows its allocated GSC identifier once, including rollover format. A minor stays inactive until verified guardian requirements pass.

### AUTH-08 · Login

**Route/entry:** /login; signed-out users. **Pattern:** F/P.

**Layout:** 1. Logo/title. 2. Email and password. 3. Trailing Eye and “Forgot password?” row. 4. Log in. 5. Register and guest links. 6. Staff access explanation, without a privileged bypass.

**Actions:** “Log in” validates session, then AUTH-10 when MFA applies, AUTH-07 when approval/verification incomplete, otherwise recorded authorized destination or role home. “Forgot password” goes AUTH-09; “Create account” AUTH-01.

**States:** B; invalid credentials show a generic message; throttling states retry time; session expiry preserves safe intended route, never sensitive route contents. **Responsive:** panel max 480; no sidebar or bottom navigation before authentication.

**Acceptance:** A supplied return URL cannot redirect to an untrusted origin. Successful login for a suspended counselor never opens a student case.

### AUTH-09 · Password reset

**Route/entry:** /password-reset; request state, email-sent state or valid reset-token state. **Pattern:** F/P.

**Layout:** 1. KeyRound title. 2. Request email field, or new password/confirmation with AUTH-03 rule indicators. 3. Generic confirmation text. 4. Primary action and return-to-login.

**Actions:** “Send reset link” stays with generic confirmation; valid-token “Save new password” changes password, invalidates other sessions and goes AUTH-08. “Back to log in” AUTH-08. Resend is throttled.

**States:** B; unknown email receives the same confirmation; expired token offers a new request; password values never survive navigation or errors requiring fresh authentication. **Responsive:** one-column max 480, password helper list wraps at 320.

**Acceptance:** Resetting a password does not reset staff MFA or approval state. Reusing a consumed token cannot change credentials.

### AUTH-10 · MFA enrollment and challenge

**Route/entry:** /mfa; admin/counselor staff mandatory, other members optional via SET-04. **Pattern:** F.

**Layout:** 1. ShieldCheck heading. 2. Enrollment QR plus selectable setup key, or challenge input. 3. Authenticator instructions. 4. Recovery-code reveal/save step after verified enrollment. 5. Confirm and help controls.

**Actions:** “Verify authenticator” confirms TOTP then permitted destination; “Use recovery code” changes the input mode; “Need help” SET-05 restricted support state. Copy icon sits beside key, with explicit “Copy setup key”.

**States:** B; invalid code doesn’t expose secret; enrollment incomplete cannot reach staff routes; recovery codes are single-use and never emailed. **Responsive:** QR192 square on320,224 otherwise; text alternative always available.

**Acceptance:** A staff member without enrolled MFA is forced through enrollment. Consumed recovery code is rejected on the next attempt.

## Student and linked-parent workspace

Source family: “Module 2: Student’s Full Profile & Academic Details”, “Module 3: Parent & Financial Information”, and “Student process”. All case routes require ownership or explicit relationship scopes. Guardian operation is visibly attributed to the guardian, never impersonation.

### STU-01 · Student dashboard

**Route/entry:** /home; approved student with guardian activation where required. **Pattern:** D.

**Layout:** 1. Greeting, GSC ID and Bell “Notifications” top-right. 2. Profile completion and single next required step. 3. Cards for recommendations count, saved count /3, next session and task count. 4. Upcoming appointment with local time. 5. University recommendations, separate GraduationCap “Scholarships”, mentorship shortcut. 6. Learning/news and private journey.

**Actions:** “Continue profile” opens first incomplete STU-02–07 step; completed profile instead offers “Explore matches” CAT-01. Session opens SES-04; tasks SES-12; Bell SET-06.

**States:** B; incomplete finance gates personalized costs/save, not public ranges; no assignment offers SES-01. **Responsive:** next session moves above metrics on320; desktop secondary column holds tasks.

**Acceptance:** Dashboard displays three saved combinations separately from ten recommendations. Declined optional financial amounts never produce a fake readiness percentage.

### STU-02 · Academic history

**Route/entry:** /cases/:caseId/profile/education; student or parent with profile-edit scope. **Pattern:** F.

**Layout:** 1. Case strip and Module2 progress. 2. Current/last education level and completed years. 3. Repeatable school, college and university records: institution, city/country, score system, score, year and completion date. 4. Board/exam system with IB/CBSE/IGCSE/National/Other. 5. Transcript upload rows. 6. Save status.

**Actions:** “Save and continue” STU-03; Plus “Add institution” adds a card; Pencil “Edit identity” AUTH-02 account-edit mode. Academic records retain their original grading scale.

**States:** B; conditional institution fields disappear only after confirmation of removing their values; unsupported grades permit original textual scale. **Responsive:** repeatable cards are fullwidth even in desktop two-column forms.

**Acceptance:** Entering a percentage cannot silently convert it to GPA. Parent edits record actor and selected case.

### STU-03 · Tests and result evidence

**Route/entry:** /cases/:caseId/profile/tests; same scope as STU-02. **Pattern:** F.

**Layout:** 1. Case/progress. 2. “Have you taken standardized tests?” Yes/No. 3. Selectable test cards IELTS, TOEFL, SAT, GRE and catalog-supported language tests. 4. Expanded score, component scores where configured, date/year and result upload. 5. Other-test name and original scale if needed.

**Actions:** “Save and continue” STU-04; selected card opens its inline editor; Trash2 “Remove test” confirms deletion of that record only. “Back” STU-02.

**States:** B; No permits completion without tests; out-of-range scores explain test-specific limits; missing requirements are not marked met. **Responsive:** selectable cards wrap into a vertical list at 320 rather than inaccessible carousel-only input.

**Acceptance:** Choosing No after entering results asks before removing them. Test evidence remains private and available only under case permissions.

### STU-04 · Study and destination preferences

**Route/entry:** /cases/:caseId/profile/preferences; case editor. **Pattern:** F.

**Layout:** 1. Desired level, same/change field radios and field name. 2. Field-of-interest selector. 3. Masters-only discipline and optional specialization. 4. Exactly three ordered countries, move-up/down buttons. 5. Optional cities/regions. 6. Intake month/year or Undecided, accommodation Dorm/Apartment/Shared. 7. Optional manually nominated university/program picks.

**Actions:** “Save and continue” STU-05; “Preview recommendations” CAT-01 preserving draft warning; MapPin labels country rows. Priority changes invalidate dependent recommendation calculations after save.

**States:** B; supported catalog under three countries permits available number with explanation; removed country prompts about dependent city removal. **Responsive:** ordering uses48 targets, never drag-only.

**Acceptance:** Duplicate country selections are rejected. Switching out of Masters clears hidden specialization only after confirmation and never uses it in matching afterward.

### STU-05 · Interests, achievements and introduction

**Route/entry:** /cases/:caseId/profile/experience; case editor. **Pattern:** F.

**Layout:** 1. Career goal/interests textarea,200-word counter. 2. Up to five optional activity cards: type, name, role, duration, hours/week, achievements. 3. Previous scholarship received/applied-not-granted toggles, name, original amount/currency, year and evidence. 4. Optional relative abroad, relation/city/country. 5. Optional60-second introduction video and 50px upload row.

**Actions:** “Save and continue” STU-06; Video “Record introduction” requests camera/microphone; “Upload instead” uses file picker; “Skip optional details” saves explicit omissions.

**States:** B; sixth activity disabled with limit; overlong video rejected; no video never lowers service priority. **Responsive:** long form removes outer card padding on phones.

**Acceptance:** A user can finish without a video or extracurricular activities. Two hundred and one words prevents saving the goal with an inline error.

### STU-06 · Parent and financial information

**Route/entry:** /cases/:caseId/profile/finances; student or linked parent with finance-edit scope. **Pattern:** F.

**Layout:** 1. Case and “Parent collaboration encouraged, not required for independent adults”. 2. Occupation and optional annual income with currency/Decline. 3. Housing status: self-owned, inherited, private rent, subsidized rent, employer, relatives, temporary. 4. Structure: flat, semi-detached, bungalow, villa, shared, informal, Other; material: permanent/semi-permanent/temporary/earthen; rooms1/2/3–4/5+. 5. Optional sponsor and income-proof availability. 6. Optional savings/reserves currency and Decline. 7. USD snapshot and readiness explanation.

**Actions:** “Complete financial section” STU-07; “Invite parent” PAR-02; Calculator “View estimate” CAT-04 when target exists.

**States:** B; missing FX keeps originals and marks conversion unavailable; savings declined means Unknown readiness. **Responsive:** currencies stack below amounts at 320.

**Acceptance:** Explicitly declining optional figures satisfies completion. Income is never automatically added to reserves.

### STU-07 · Complete-profile review and document vault

**Route/entry:** /cases/:caseId/profile; authorized case reader/editor. **Pattern:** T.

**Layout:** 1. Case identity, completion status and last actor. 2. Module2/3 section summaries with Pencil edits. 3. Private document list grouped by academics, tests and funding. 4. Scoped parent access summary. 5. Missing required items followed by next-step panel.

**Actions:** “Explore personalized matches” CAT-01 when complete; otherwise “Finish required details” opens first incomplete section. “Manage family access” PAR-02; “View document” opens authorized viewer with expiring download.

**States:** B; quarantine shows pending scan; revoked document access removes preview; incomplete sections explain exact remaining fields. **Responsive:** desktop summary/evidence split becomes section-by-section cards below 900.

**Acceptance:** Completion is computed from server validation, not a client percentage. A parent lacking finance scope sees “Not shared”, not financial values or filenames.

### PAR-01 · Parent dashboard

**Route/entry:** /parent/home; approved parent, optional selected case. **Pattern:** D.

**Layout:** 1. Parent name and 48-high “Student case” switcher. 2. Link-status banner. 3. Selected student’s next step and visible module progress. 4. Finance, saved universities, shared advisory and invitations according to scopes. 5. Parent mentorship/learning shortcuts. 6. No combined balances across children.

**Actions:** “Continue this student’s plan” opens next permitted STU section; no case “Link a student” PAR-02; case switcher PAR-03. GraduationCap scholarship shortcut CAT-07 retains case.

**States:** B; pending relationship shows only its status; adult case without finance scope hides finance card. **Responsive:** switcher is fullwidth on phones,240 wide desktop.

**Acceptance:** Switching students changes every count, appointment and message link atomically. Parent mentoring rewards remain account-level, not attributed to the selected child.

### PAR-02 · Family linkage and permission review

**Route/entry:** /family-links/:linkId?; approved student/parent or restricted guardian-verification applicant. **Pattern:** F.

**Layout:** 1. Relationship explanation. 2. Invite by verified account/GSC ID or email, explicitly not automatic matching. 3. Adult authorization or minor guardian evidence flow. 4. Separate scopes: profile, finance, advisory, tasks and session invitations. 5. Expiry/status, consent receipt and revoke controls.

**Actions:** “Send invitation” creates pending linkage; recipient “Authorize access” grants selected scopes after verification; “Submit guardian evidence” queues ADM-02 review. UserRoundPlus leads Invite. “Revoke access” confirms, revokes and refreshes affected sessions.

**States:** B; expired invite can be reissued; unmatched email reveals no account existence; under 13 offers guardian-operated case creation here. **Responsive:** scope controls stack at 320.

**Acceptance:** Sharing a surname grants no access. Revoking finance scope immediately prevents a previously opened financial API response and subsequent document download.

### PAR-03 · Student case chooser

**Route/entry:** /parent/cases; parent after login or switch action. **Pattern:** L.

**Layout:** 1. Parent account context. 2. Search within authorized cases. 3. Cards with student display name, GSC/case reference, age-routing status, granted scopes and last update. 4. Pending invitations separated below. 5. Link/create action.

**Actions:** “Open case” sets selected case and goes PAR-01; Plus “Link or create case” PAR-02. Selecting an existing case never changes the parent’s role.

**States:** B; no approved links invites linking; unsaved work prompts before switch; withdrawn relationship disappears without exposing another family’s records. **Responsive:** two columns at 768, one phone; scope chips wrap.

**Acceptance:** A revoked case cannot be selected from stale cached cards. Under13 case opens under guardian identity without creating child login credentials.

## University, program and scholarship planning

Source family: Module2 “Flow & Process”, “AI-Assessment Checklist”, “Module 7: University & Scholarship Database”, “Entry Requirements”, “Accommodation Details”, “Visa Requirements” and “Scholarship Details”.

### CAT-01 · University discovery and recommendations

**Route/entry:** /explore/universities?case=:caseId; public catalog for everyone, personalized set for complete academic profile. **Pattern:** L.

**Layout:** 1. University/Scholarship tabs. 2. Search university/program. 3. Country, city, subject, level, intake, annual-comparison-cost and ranking filters. 4. “Recommendations, up to 10” versus “All universities” selector. 5. Cards: university/program, city, annual tuition, monthly accommodation, comparable annual sum, rank/source/year and reason. 6. Saved count /3.

**Actions:** “View program” CAT-03; Bookmark “Save” updates CAT-06 only after Module3 completion; SlidersHorizontal opens filters.

**States:** B; unknown costs sort after comparable known costs; fewer than 10 explains available coverage. **Responsive:** desktop filters240, cards two columns; compact rows remain fullwidth.

**Acceptance:** Recommendations contain at most10 distinct universities with attached programs. Manual selections lead, followed by canonical city/country/cost/rank slots without duplicate filler.

### CAT-02 · University detail

**Route/entry:** /universities/:universityId; published records public. **Pattern:** T.

**Layout:** 1. Back preserving discovery. 2.64-logo, name/alias, type and city/country. 3. Ranking source/year, accreditation and international-student ratio when sourced. 4. Overview, program list, accommodation, location and official contacts. 5. Campus-tour media. 6. Sources/last verified/next review.

**Actions:** “Browse programs” focuses program list then CAT-03; ExternalLink “Official information” opens public URL; MapPin “Directions” opens external maps. Save remains program-specific, not a university-only favorite.

**States:** B; unpublished detail unavailable; absent ratio/rank says “Not provided”; no acceptance-rate field. **Responsive:** logo48 on320; contacts stack and URLs wrap rather than overflow.

**Acceptance:** Guest sees public published fee ranges. University detail never exposes a gated application URL in markup, native data or API payload.

### CAT-03 · Program detail

**Route/entry:** /universities/:universityId/programs/:programId; published program. **Pattern:** T.

**Layout:** 1. University breadcrumb and program title. 2. Level, duration with unit, mode, intake and deadline precision. 3. Annual tuition and full-course fee separately labeled. 4. Entry requirements, tests/exemptions, prerequisites, documents and conditional-admission information. 5. Accommodation and scholarships. 6. Assessment/cost/save action card, source metadata.

**Actions:** “Check my requirements” CAT-05; Calculator “Plan costs” CAT-04; Bookmark “Save combination” CAT-06 mutation; “Application steps” JRN-01 only after completed counseling and chosen target.

**States:** B; incomplete users get actionable Module3 gate; guests register for personalized self-check; unknown data doesn’t mean waived requirement. **Responsive:** action card inline below summary on phones.

**Acceptance:** Month-only deadline never becomes an invented last day. Public information link remains available while application action stays locked.

### CAT-04 · Cost comparison and financial readiness

**Route/entry:** /cases/:caseId/costs?program=:programId; complete Module3 for personalization. **Pattern:** T.

**Layout:** 1. Target and first-academic-year horizon. 2. Annual tuition +12×monthly accommodation comparison. 3. Separate broader budget: meals, transport, insurance, travel, visa/application fees and other sourced/user-entered expenses. 4. Included-cost indicators prevent duplicate meal/housing charges. 5. Savings/reserves, confirmed funding treatment, readiness number and capped visual bar. 6. Original currencies, USD snapshot and caveat.

**Actions:** “Save budget assumptions” updates case; “Edit finances” STU-06; Share2 “Share with linked parent” sends minimal authenticated notice only to authorized link.

**States:** B; denominator zero/unknown means no score; FX older72h warns; unconfirmed scholarship excluded. **Responsive:** all formula lines wrap at 320; bar number remains outside.

**Acceptance:** Reserves120/expense100 displays120%, even if bar caps100. Annual comparison is never labeled total cost of attendance.

### CAT-05 · Program self-assessment

**Route/entry:** /cases/:caseId/assessment/:programId; approved case user; one program per assessment. **Pattern:** F.

**Layout:** 1. Program/version context and “Self-reported, not an admission probability”. 2. Criteria cards with original threshold, weight and trailing Info. 3. Met/Not met/Unknown radios plus evidence reference. 4. Live weighted score, missing mandatory criteria and hard-requirement alerts. 5. Result explanation and next steps.

**Actions:** “Save self-check” stores responses/version; “View costs” CAT-04; “See alternatives” CAT-01. No “Mark all met” shortcut.

**States:** B; unavailable weights use disclosed equal weights; unavailable criterion remains Unknown; criterion updates request reassessment. **Responsive:** criteria use vertical cards even at desktop, result sticky only where it cannot hide fields.

**Acceptance:**85/60 thresholds apply only to complete configured data. A hard unmet criterion overrides “Likely eligible”; unknown mandatory criteria produce provisional result.

### CAT-06 · Saved shortlist and counselor-review flags

**Route/entry:** /cases/:caseId/shortlist; Module3 complete, authorized case. **Pattern:** L.

**Layout:** 1. “Saved university + program combinations,0–3”. 2. Separate recommendation-count link, “up to 10 recommendations, not saved slots”. 3. Saved cards with assessment status, comparison cost and Flag “For counselor review”. 4. Compare selected details and share summary. 5. Find-more footer.

**Actions:** “Review with counselor” SES-01, or assigned SES-02; “Remove saved combination” confirms server deletion; flag toggle updates review subset; “Explore recommendations” CAT-01.

**States:** B; cap reached explains replacing an existing choice; concurrent cap rejection restores authoritative list; removing saved clears its review flag. **Responsive:** three desktop cards, one on320/390, two at 768.

**Acceptance:** Two concurrent saves cannot exceed three. Every review-flagged combination must belong to the saved set.

### CAT-07 · Full scholarship directory

**Route/entry:** /explore/scholarships; approved members; guests redirected PUB-04. **Pattern:** L.

**Layout:** 1. GraduationCap title and University/Scholarship tabs. 2. Search. 3. Verified minimal filters: country, level, field, type and availability. 4. URL-first cards with provider, eligibility excerpt if sourced, deadline precision and last verified. 5. Result count/pagination.

**Actions:** “View details” CAT-08; “Back to universities” CAT-01. Filter Reset preserves active student context. “Follow scholarship news” NEW-01 filtered topic, rather than creating an application.

**States:** B; unavailable metadata is Unknown, not inferred; closed cards clearly labeled; broken destinations expose “Report information” SET-05 prefilled with record ID. **Responsive:** filter chips wrap below search, no horizontal-only filter access.

**Acceptance:** A field filter only matches verified metadata. Selecting an award cannot add funding to a student’s savings or budget automatically.

### CAT-08 · Scholarship detail and provider handoff

**Route/entry:** /scholarships/:scholarshipId; approved members or published-preview guest. **Pattern:** T.

**Layout:** 1. Name/provider/status. 2. Official URL card and source date. 3. Country/university, level/field/type metadata. 4. Optional sourced eligibility, age/citizenship, coverage, amount/unit, duration/renewal, application mode/fee, required documents, contact and result date. 5. Deadline and “Provider decides eligibility” caveat.

**Actions:** “Visit official scholarship information” external browser with ExternalLink; “Discuss with counselor” MSG-02 when assigned, otherwise SES-01. Guests see AUTH-01 for private discussion.

**States:** B; missing extended details collapse with “See provider for full terms”; withdrawn unsafe URL disabled; no “Submit application” form. **Responsive:** essential provider CTA follows summary on phones; definitions stack.

**Acceptance:** A closed award remains readable but is never labeled open. Visiting the provider does not mark an application submitted.

## Counseling, scheduling and follow-up

Source family: “Module 8: Education Counselor Assignment & Feedback”, “Smart Appointment Scheduling”, “Appointment Screen”, “SUMMARY: Full Post-Appointment Workflow”, and the opening process table. SES-03–09 also support mentor sessions with explicit kind=mentor, separate eligibility and appointment cap. All sessions are virtual,30 minutes and free initially.

### SES-01 · Counselor selection

**Route/entry:** /cases/:caseId/counselors; approved active case, valid Module2/3 completion. **Pattern:** L.

**Layout:** 1. Case requirements summary. 2. Expertise/country/language/availability filters. 3. Recommended counselors with64-avatar, verification, rating/count, next slot and match score /100. 4. Expandable score explanation. 5. Other eligible options.

**Actions:** “View counselor” SES-02; “Edit preferences” STU-04. Leading SlidersHorizontal labels filters, not algorithm settings.

**States:** B; approved active experts with availability only; no suitable experts shows request-help SET-05, never invented matches. **Responsive:** explanation expands within its card at 320, side panel desktop.

**Acceptance:** Score is field30+country20+availability10+rating10+workload30. No rating receives neutral5; the student always makes final selection.

### SES-02 · Counselor public profile and selection

**Route/entry:** /counselors/:counselorId?case=:caseId; approved published fields public, selection case-gated. **Pattern:** T.

**Layout:** 1. Avatar/name/designation/company. 2. Verification separate from ratings. 3. Domains, countries, specialization, experience and languages. 4. Services, approved certifications, partner universities and portfolio/testimonials. 5. Match breakdown and next available slot. 6. Free30-minute session statement.

**Actions:** “Choose and book” SES-03 records prospective selection, final assignment on confirmed booking; “See other counselors” SES-01. CalendarDays sits before booking label.

**States:** B; capacity/availability changes disable booking with refresh; private association/community evidence excluded. **Responsive:** mobile action follows match summary; all biography remains accessible without accordion-only truncation.

**Acceptance:** Match explanation uses normalized overlap, country20/15/10 and bounded workload formula. An unavailable counselor cannot be selected through stale profile data.

### SES-03 · Book or reschedule appointment

**Route/entry:** /cases/:caseId/book/:expertId?kind=&reschedule=:sessionId; eligible student or authorized booking parent; accepted mentorship request for mentor kind. **Pattern:** F.

**Layout:** 1. Expert and 30-minute/free summary. 2. Viewer/expert zones. 3. Available-day picker and 48-high slot buttons grouped morning/afternoon/evening. 4. Topics: university, program, requirements, scholarship, planning, Other. 5. Optional authorized parent invitation. 6.24h/2h/10m reminders. 7. Exact summary and confirmation.

**Actions:** “Confirm appointment” atomically books, then SES-04; reschedule “Confirm new time” replaces booking/reminder jobs; “Back” SES-02 or MEN-02.

**States:** B; slot conflict retains topics and refreshes availability; reschedule under 48h disabled; calendar failure doesn’t undo booking. **Responsive:**320 uses available-date list rather than undersized calendar targets.

**Acceptance:** Earliest slot satisfies both next counselor-calendar-day and 24h lead.15-minute buffer and end60 minutes before workday close are enforced server-side.

### SES-04 · Appointment detail and confirmation

**Route/entry:** /sessions/:sessionId; participants and assigned expert only. **Pattern:** T.

**Layout:** 1. Confirmed/Preparing link/Cancelled/Completed/No-show status. 2. Expert, date, both zones, topics, virtual mode. 3. Invited participants and acceptance. 4. Preparation checklist and standard questions. 5. Calendar/reminder status. 6. Session actions.

**Actions:** “Enter lobby” SES-06 when join window opens; “Reschedule” SES-03 if48h remaining; “Cancel appointment” SES-05; “Add to calendar” SET-02 provider connection or calendar export. FileText “Prepare questions” expands curriculum/accreditation/switching/prerequisite/SOP/document/scholarship/work/refund/outcome prompts.

**States:** B; preparing link shows retry, not bogus URL; no-show offers rebooking and dispute/help; canceled reminders disappear. **Responsive:** summary precedes preparation on all widths.

**Acceptance:** A second active counseling appointment is rejected while one mentor appointment can coexist. Missing expert triggers apology/rebooking without blaming the student.

### SES-05 · Cancel appointment

**Route/entry:** /sessions/:sessionId/cancel; authorized appointment owner/booking parent or expert. **Pattern:** F.

**Layout:** 1. Back and “Cancel this appointment?” 2. Exact expert/time summary. 3. Optional reason, required expert explanation. 4. Late-cancel notice when under 24h, explicitly no monetary penalty. 5. Consequences for reminders and participants.

**Actions:** “Cancel appointment” confirms cancellation, frees slot and routes SES-04 canceled state; “Keep appointment” returns SES-04 unchanged. CalendarX icon accompanies destructive heading, not a payment warning.

**States:** B; already canceled is safe success; started/completed session cannot be canceled retrospectively and offers support. **Responsive:** phone fullpage, desktop560-max centered confirmation.

**Acceptance:** Cancellation remains available inside24h before start. Repeated requests cancel once and never create duplicate participant notices.

### SES-06 · Session lobby and equipment check

**Route/entry:** /sessions/:sessionId/lobby; invited authorized participant, join from 10 minutes before scheduled start. **Pattern:** T.

**Layout:** 1. Session context and expert presence. 2.16: 9 self-preview. 3. Camera/microphone selectors and test indicators. 4. Participant identity and consent state. 5. Connection instructions and join control.

**Actions:** “Join session” SES-07; “Review recording choices” SES-08; “Back to appointment” SES-04. Mic/Video toggles have on/off labels; permission instructions open device settings only on request.

**States:** B; denied camera permits audio; denied microphone permits listen/chat; unready meeting offers waiting/retry and support; too early shows countdown. **Responsive:** preview240 high phone,360 desktop; controls wrap.

**Acceptance:** Join token is issued only for authorized participants. Neither successful device check nor entering lobby constitutes recording consent.

### SES-07 · Live video session

**Route/entry:** /sessions/:sessionId/live; authorized joined participants. **Pattern:** dedicated session shell inheriting B, no bottom navigation.

**Layout:** 1.56-high session title/time/connection bar. 2. Flexible video stage, participant tiles and captions. 3. Optional right320 chat/agenda pane. 4. Recording status with text. 5. Bottom controls Mic, Camera, Participants, Chat, More and red Leave; expert “End for everyone” in More.

**Actions:** “Leave” returns SES-04; expert confirmed end records actual duration and opens COU-06 or MEN-07; recording request opens SES-08.

**States:** B; reconnect preserves session identity; late join pauses recording; no consent allows full unrecorded meeting/manual summary. **Responsive:**320 controls become two rows of48 targets; chat replaces stage through labeled toggle.

**Acceptance:** Recording remains off until every present participant and required guardian consents. A reconnect never resets or fabricates attendance minutes.

### SES-08 · Per-session recording consent

**Route/entry:** /sessions/:sessionId/consent; current participant or verified guardian. **Pattern:** F.

**Layout:** 1. Session-specific title. 2. Recording purpose, recipients and AI draft explanation. 3. Retention: recording30 days, transcript90 days, advisory/case-history deletion workflow. 4. Explicit consent checkbox initially off. 5. Participant consent status without private reasons.

**Actions:** “Save my choice” records consent or decline and returns lobby/live entry; “Continue without recording” explicitly declines. Shield icon leads privacy text; “Privacy details” SET-03.

**States:** B; withdrawn consent immediately pauses/stops recording; unresolved guardian consent prevents recording, not permitted unrecorded participation; stale consent version requests fresh choice. **Responsive:** no condensed/legal-only tooltip on320.

**Acceptance:** Account-level data consent cannot precheck this checkbox. Late join cannot inherit another participant’s consent.

### SES-09 · Approved advisory report

**Route/entry:** /sessions/:sessionId/report; student and explicitly authorized parent; own expert. **Pattern:** T.

**Layout:** 1. Approval/version/date and counselor identity. 2. Academic profile summary. 3. Shareable guidance, options, requirement checklist and scholarship suggestions. 4. Action items and 1–5 counselor fit assessments. 5. PDF viewer/download, recommended universities and follow-up.

**Actions:** “View next steps” JRN-01; Download “Download advisory PDF”; “Share with parent” sends authenticated notice to selected scoped link; “Book follow-up” SES-03; “Give feedback” SES-10.

**States:** B; draft not delivered shows “Counselor reviewing”; failed generation leaves approved accessible text; no parent link offers PAR-02. **Responsive:** PDF has text alternative, not pinch-only viewing.

**Acceptance:** Private counselor notes and AI quality coaching never appear in report. Parent notices contain no transcript or financial figures.

### SES-10 · Counseling feedback

**Route/entry:** /sessions/:sessionId/feedback; completed session participant; expert gets counselor variant. **Pattern:** F.

**Layout:** 1. Session summary. 2. Student five1–5 labeled questions: clarity, helpfulness, knowledge, relevance, overall. 3. Expert variant: preparation, document readiness, engagement, goal clarity. 4. Optional comment and separate safety-report link. 5. Submission status.

**Actions:** “Submit feedback” saves once and returns SES-09 or COU-05; “Report a safety concern” SET-05 protected intake; “Request another counselor” SES-11. Star glyphs supplement radio labels.

**States:** B; unfinished questions show inline errors; canceled/no-show meetings cannot receive a completed-session rating; submitted state is readable. **Responsive:**320 uses two-line labels and 48 radio targets.

**Acceptance:** Published aggregate excludes unpublished/unverified feedback. Safety reports do not enter the counselor’s ordinary improvement summary.

### SES-11 · Counselor change and handoff

**Route/entry:** /cases/:caseId/change-counselor; student/authorized guardian with assignment. **Pattern:** F.

**Layout:** 1. Current counselor and future appointments. 2. Reason category and explanation. 3. Protected “Safety concern” route. 4. Clear distinction between ordinary improvement summary and confidential report. 5. Handoff checklist/status.

**Actions:** “Request counselor change” creates audited handoff request and holds prospective replacement until safe release; approved handoff offers SES-01. “Keep current counselor” returns SES-04 or STU-01. ArrowRightLeft labels change action.

**States:** B; duplicate pending request opens existing status; active meeting cannot be reassigned mid-session; private notes remain restricted. **Responsive:** handoff timeline vertical; primary sticky phone.

**Acceptance:** Ordinary reason summary can reach previous counselor, but protected complaint cannot. Request submission alone never grants the next counselor all historical private notes.

### SES-12 · Follow-up tasks and evidence

**Route/entry:** /cases/:caseId/tasks/:taskId?; scoped case participants. **Pattern:** L with F selected task.

**Layout:** 1. Case and open/overdue/completed counts. 2. Owner/status/due filters. 3. Task cards with requested evidence, due date and owner. 4. Selected task detail, attachment rows, comment and revised ETA. 5. Activity history.

**Actions:** Student “Submit evidence” updates task for expert review; expert “Accept and complete” closes task and outstanding reminder; “Need more time” stores proposed ETA. Plus “Create task” available to assigned counselor, opens inline editor.

**States:** B; no ETA says “Date requested”, not a fabricated deadline; overdue notice includes GSC ID only for authorized counselor. **Responsive:** detail replaces list on phones, split desktop.

**Acceptance:** Uploading evidence notifies counselor once. Completing a task cancels its pending reminders without deleting history.

## Mentorship and community

Source family: “Module 4: Alumni & Mentorship”, “Module 5: Alumni & Mentorship”, “Leaderboard”, “Alumni Ex-student Process”, “Alumni Parent Process”. All source topic subitems and job-sector taxonomies are selectable, searchable catalog content; the grouped headings below do not remove their subitems. There is no public student directory.

### MEN-01 · Mentor community and leaderboard

**Route/entry:** /mentors; members, public published teaser subset for guests. **Pattern:** L.

**Layout:** 1. Reviewed announcement panel when present. 2. Top10 monthly/annual leaderboard with rating counts and unique supported mentees. 3. Student/alumni mentor versus parent mentor selector. 4. Topic, university, country, sector and experience filters. 5. Approved mentor cards.

**Actions:** “View mentor” MEN-02, or PUB-05 for guest; Trophy “View contribution rules” REW-01 public explanation state. No unsolicited student-search action.

**States:** B; empty leaderboard says insufficient activity; unverified mentors excluded; absent rating says “Not yet rated”. **Responsive:** leaderboard is compact vertical rows on320, not a wide ranking table.

**Acceptance:** Contribution tier and verification remain separate labels. Filtered mentor discovery reveals no mentee private details.

### MEN-02 · Mentor profile and connection request

**Route/entry:** /mentors/:mentorId; approved mentor profile, member connection permission. **Pattern:** T.

**Layout:** 1. Identity/verification/tier. 2. University/course/graduation or parent background. 3. Published topics, sector, role and experience. 4. Reflection, tip, testimonials and availability. 5. Request form: topic, short question, chat/session preference.

**Actions:** “Send request” creates pending request shown MEN-06; “Message” MSG-02 only after acceptance; CalendarDays “Book session” SES-03 after accepted connection. Guests are routed PUB-05.

**States:** B; no available hours explains request limits; blocked/restricted/minor-without-guardian cannot privately connect; duplicate pending request displays current state. **Responsive:** request card follows topics on phones.

**Acceptance:** Sending a request grants no finance or transcript access. Acceptance enables only agreed communication scope.

### MEN-03 · Alumni/current-student mentor profile

**Route/entry:** /mentor/profile; approved alumni or verified current-student mentor applicant. **Pattern:** F.

**Layout:** 1. Current/graduate status. 2. University, course and graduation/anticipated year. 3. Exactly3 topic selections grouped Academic, Career, Life abroad, Finance, Housing, Community, Wellbeing, Post-graduation. 4. Industry sectors, organization, role/employer URL and portfolio. 5. Experience years, minimum2 hours/month,50-word reflection. 6. Publishable-field preview.

**Actions:** “Submit mentor profile” queues verification and goes MEN-05; “Set availability” COU-04 mentor mode; Upload “Add experience evidence” uses private evidence row.

**States:** B; incomplete topics/hours block completion; current-student status never masquerades as graduation. **Responsive:** topic groups use expanded searchable checklist on phones.

**Acceptance:** Selecting a fourth topic is rejected with “Choose exactly3”. Two hours availability alone does not grant a verified badge.

### MEN-04 · Parent mentor profile

**Route/entry:** /mentor/parent-profile; approved parent of current/alumni student. **Pattern:** F.

**Layout:** 1. Education level and parent-experience context. 2. Up to 3 topics: admissions, finance, accommodation, academic/career, wellbeing, community, digital setup, health/insurance. 3. Topic subitems retained. 4. Mentoring years, monthly hours default2 and minimum2. 5. Optional50-word reflection and published profile preview.

**Actions:** “Submit parent mentor profile” MEN-05 pending verification; “Set availability” COU-04 mentor mode; “Back” PAR-01. Users icon leads topic context, never implies child data publication.

**States:** B; empty topic selection blocks completion; fourth topic disabled; no child’s name appears in public preview without specific consent. **Responsive:** grouped topics collapse individually only after selection.

**Acceptance:** Parent profile can complete with one to three topics. Parent mentor status cannot grant access to unrelated student cases.

### MEN-05 · Mentor dashboard

**Route/entry:** /mentor/home; mentor applicant/approved mentor. **Pattern:** D.

**Layout:** 1. Verification and availability status. 2. Next request/session card. 3. Unique mentees supported, verified session count and actual minutes. 4. Feedback-to-submit list. 5. Points/tier shortcut, learning and approved Gold+ invitation content.

**Actions:** “Review requests” MEN-06; next session SES-04; “Complete summary” MEN-07; Award “Rewards” REW-01. “Update profile” MEN-03/04 by subtype.

**States:** B; pending mentors see completion tasks instead of private contacts; zero contributions remain zero; no Gold invitation hides panel. **Responsive:** phones prioritize due summary before leaderboard position.

**Acceptance:** Repeated sessions with one mentee count once toward tier. Pending approval points are visually separate from spendable points.

### MEN-06 · Mentoring requests and connections

**Route/entry:** /mentoring/requests/:requestId?; mentor or request owner. **Pattern:** L.

**Layout:** 1. Incoming/outgoing/accepted tabs by role. 2. Request cards with permitted name, topic, question, date and safety status. 3. Selected request detail. 4. Accept/decline or withdraw controls. 5. Accepted connection’s chat and booking links.

**Actions:** Mentor “Accept request” creates scoped connection; “Decline” sends minimal response; mentee “Withdraw request” cancels pending only; MessageSquare “Open conversation” MSG-02 after acceptance.

**States:** B; empty shows community discovery MEN-01; guardian pending disables acceptance/private contact; blocked users cannot re-request through old detail. **Responsive:** selected request becomes fullpage below 900.

**Acceptance:** Accepting twice creates one connection. Request list never becomes a browsable directory of all registered students.

### MEN-07 · Mentor session summary and mutual feedback

**Route/entry:** /mentoring/sessions/:sessionId/summary; completed-session mentor/mentee. **Pattern:** F.

**Layout:** 1. Auto names/IDs, date, actual duration, Career/Admission/Finance/Accommodation type and status. 2. One good point and one challenge. 3. Mentee questions: clarity, relevance, knowledge, action clarity, satisfaction, challenge checklist. 4. Mentor questions: preparation, engagement, follow-through, overall experience, technical issues, scope difficulty. Parent-mentee variant uses source relevance/organization/practicality/recommendation questions. 5. Verification status.

**Actions:** “Submit summary and feedback” queues reward review ADM-10; “View session” SES-04. CheckCircle labels verified status only after review.

**States:** B; None challenge is exclusive; unfinished meeting cannot earn points; feedback completion remains pending admin. **Responsive:** full-width question groups, two-column answer options only where48 targets fit.

**Acceptance:**25 points are awarded once only after logged, rated and admin-approved completion.

## Counselor workspace

Source family: “Module 6: Career Counselors”, Module7 contributor responsibilities, Module8 “Session Notes”, “Gap Analysis”, “University Fit Score”, “Final Advisory PDF Upload” and “Counselor Feedback”. These screens are available on responsive web and native, not delegated to desktop-only administration.

### COU-01 · Counselor dashboard

**Route/entry:** /counselor/home; approved counselor with MFA. **Pattern:** D.

**Layout:** 1. Availability/capacity state. 2. Next appointment and preparation action. 3. Active cases/capacity, overdue tasks, reports due and feedback counts. 4. Student follow-up queue with GSC IDs. 5. Private AI coaching alerts and calendar connection health.

**Actions:** “Open next case” COU-05; “Manage students” COU-05 list state; CalendarDays “Availability” COU-04; “Review coaching” COU-07.

**States:** B; no cases offers profile/availability review, not arbitrary student lookup; overdue advisory marked after 24h; disconnected calendar doesn’t erase bookings. **Responsive:** upcoming session first on320; coach alerts secondary below tasks.

**Acceptance:** A counselor sees only authorized caseload. Updating a task to completed removes its outstanding dashboard reminder.

### COU-02 · Counselor professional profile

**Route/entry:** /counselor/profile; counselor applicant or active staff. **Pattern:** F.

**Layout:** 1. Individual/company type. 2. Designation, experience range and numeric years. 3. Domains, countries/regions, specialization and services. 4. Certifications/evidence and approved portfolio. 5. Client demographics, associations, referral source and optional community linkage. 6. Confidentiality acknowledgement and publication preview.

**Actions:** “Submit for verification” AUTH-07 or COU-01 with pending-change banner; “Company details” COU-03; “Availability” COU-04. ShieldCheck marks evidence status, not self-declared expertise.

**States:** B; pending edits don’t replace last approved public profile; sensitive linkage restricted to verification staff. **Responsive:** fullwidth evidence cards; no oversized taxonomy matrix.

**Acceptance:** Changing professional evidence triggers review. Community linkage is never used as counselor matching input.

### COU-03 · Company and affiliation details

**Route/entry:** /counselor/company; company counselor or authorized company representative. **Pattern:** F.

**Layout:** 1. Company name/country/city/address. 2. Registration identifier and private proof. 3. Official contacts and website. 4. Team size, experience and up to 10 partner universities with verification status. 5. Affiliated counselors, individually verified. 6. Sharing/confidentiality declaration.

**Actions:** “Save company details” submits changes for ADM-02 verification; “Return to professional profile” COU-02. Building2 leads company title; Plus adds a partner row.

**States:** B; affiliation pending explicitly labeled; individual counselor sees optional conversion explanation, not editable company data; team membership alone grants no case access. **Responsive:** partners are card rows on phones.

**Acceptance:** Eleven partner universities cannot be added. Company representative cannot read all employee cases merely through affiliation.

### COU-04 · Availability and calendar connections

**Route/entry:** /availability?role=counselor\|mentor; own approved expert profile; applicants may draft. **Pattern:** F.

**Layout:** 1. IANA timezone. 2. Weekly workday/time ranges. 3. Date exceptions, blocked dates and monthly availability total. 4. Case capacity for counselors, monthly mentor minimum. 5. Google/Outlook connection status and sync conflicts. 6. Generated-slot preview showing30-minute length,15-minute buffer and cutoff.

**Actions:** “Save availability” updates future slots without canceling appointments; “Connect calendar” SET-02; Plus “Add exception” inserts date/range editor.

**States:** B; overlapping/negative ranges invalid; disconnect warns about busy-time freshness; conflicts require review, not silent cancellation. **Responsive:** day rows stack at 320; calendar preview becomes list below 600.

**Acceptance:** Daylight-saving changes use named timezone rules. A workday-close change never silently moves a confirmed session.

### COU-05 · Caseload and student case workbench

**Route/entry:** /counselor/students/:caseId?; approved assigned counselor. **Pattern:** W.

**Layout:** 1. Caseload search by permitted name/GSC ID and status filter. 2. Selected case identity/permissions/last update. 3. Academic, Finance, Shortlist, Sessions, Tasks, Notes sections. 4. Original grades/evidence and financial Unknown states. 5. Up to 3 review-flagged combinations and separate recommendations. 6. Timeline and private-notes editor.

**Actions:** “Prepare session” SES-04; “Create follow-up task” SES-12; “Draft advisory” COU-06; MessageSquare “Message student” MSG-02; “Recommend university” selects catalog record without bypassing saved cap.

**States:** B; handoff limits historical confidential notes; withdrawn assignment clears case; no evidence never implies verified. **Responsive:**320 case sections use select;768 list/detail separate;1440 split.

**Acceptance:** Changing case cannot retain previous financial pane. Notes labeled private never enter shareable advisory automatically.

### COU-06 · Session report editor and approval

**Route/entry:** /counselor/sessions/:sessionId/report; assigned session counselor with MFA. **Pattern:** W.

**Layout:** 1. Session/attendance and 24h report due status. 2. AI draft with provenance or manual editor. 3. Academic/language/financial gaps and university fit1–5 with reason. 4. Shareable guidance, universities, requirements, scholarships and tasks. 5. Optional final advisory PDF upload. 6. Private notes clearly separated, student-visible preview and approval declaration.

**Actions:** “Approve and deliver advisory” creates approved version and SES-09 notice; “Save draft” stays; “Regenerate draft” queues job without overwriting edits; “Submit student feedback” SES-10.

**States:** B; transcription absent offers manual summary; failed PDF leaves draft; optional admin review holds delivery if flagged. **Responsive:** mobile preview is labeled tab, not external desktop requirement.

**Acceptance:** AI output cannot auto-deliver. Fit1–5 never appears as the student’s self-check percentage.

### COU-07 · Private AI coaching and improvement

**Route/entry:** /counselor/coaching/:sessionId?; own counselor or separately authorized quality reviewer. **Pattern:** T.

**Layout:** 1. “Private coaching, AI-assisted” heading. 2. Reviewed sessions and quality status. 3. Answer gaps, clarity opportunities and supported transcript references where retained. 4. Suggested preparation/resources. 5. Counselor response and correction history.

**Actions:** “Acknowledge and plan improvement” saves private action; “Flag inaccurate feedback” creates quality-review issue ADM-11; “Open learning resource” LRN-02. Lightbulb precedes suggestion headings.

**States:** B; no recording/transcript says limited evidence, no invented quote; expired transcript removes playback reference while retaining permitted approved feedback. **Responsive:** evidence collapses directly under each finding on phones.

**Acceptance:** Student, mentor and linked-parent requests cannot access coaching. Safety complaint text is excluded from routine AI improvement summaries.

### COU-08 · Counselor catalog contributions

**Route/entry:** /counselor/catalog-contributions/:draftId?; approved counselor, own submissions. **Pattern:** F.

**Layout:** 1. University/program/scholarship/requirement correction type. 2. Existing record search or proposed entity name. 3. Official source URL and retrieval-permission declaration. 4. Suggested values, original currency/unit and evidence. 5. Phone-readable public preview and submission history.

**Actions:** “Submit catalog contribution” queues ADM-03/04 review without publishing; “Save draft” stays; “View published record” opens CAT-02/03/08 by entity. Link leads source field.

**States:** B; forbidden URL blocks submission; rejected contribution shows revision reason; counselors cannot open admin editors without separate privileges. **Responsive:** single-column mobile editor supports the complete task.

**Acceptance:** A native counselor can submit sourced catalog corrections without visiting admin web. Approved contribution retains both submitter and reviewing publisher attribution.

## Messaging and communication

Source family: opening “Mentorship & Peer Support”, “Alumni Ex-student Process”, “Alumni Parent Process”, and Module8 follow-up. These are scoped case or accepted-connection conversations, not unrestricted direct messages.

### MSG-01 · Conversation inbox

**Route/entry:** /messages; approved members with authorized conversations. **Pattern:** L.

**Layout:** 1. Messages title and selected-case filter where applicable. 2. Search within permitted conversations. 3. Unread/all controls. 4.72-high rows with40-avatar, name, role, case reference, safe preview, time and unread text/count. 5. Load more.

**Actions:** “Open conversation” MSG-02; “Find a mentor” MEN-01 when no connection; counselor new conversation starts from COU-05 only. MessageSquare leads title.

**States:** B; empty explains how connections work; blocked conversations remain identifiable only to existing participants; private previews are cleared on logout. **Responsive:** desktop320-wide inbox alongside chat; phones use separate routes.

**Acceptance:** Searching an unrelated GSC ID returns no conversation or identity.

### MSG-02 · Scoped conversation

**Route/entry:** /messages/:conversationId; current authorized participants. **Pattern:** dedicated chat within B.

**Layout:** 1.56-high participant/case header, Back left, More right. 2. Permission/safety banner when applicable. 3. Date-grouped message timeline, incoming left/outgoing right, maximum75% width. 4. Attachment rows and explicit delivery states. 5. Sticky composer, Paperclip left, multiline input, Send right, each48 target.

**Actions:** “Send” posts idempotently; “Attach file” uploads/scans before sending; More opens Report/Block and session context; session link SES-04. Financial documents require case scope, not merely chat membership.

**States:** B; failed bubble offers Retry; removed permission disables composer and clears unauthorized history; offline draft says unsent. **Responsive:**320 composer grows upward, chat pane fills width; desktop inbox stays320.

**Acceptance:** Retrying a failed send creates one message. Blocking prevents new private messages without deleting safety evidence.

## Administration and editorial operations

Source family: “Admin & Oversight”, Module1/6 “Admin Approval Comments”, Module7 “Data Verification Protocol”, “Rewards & Incentive Policy” admin sections, Modules11/12, and “System Logging”. **All ADM screens are web-only**, including responsive mobile web. Native admin links display “Open administration in your browser” without embedding privileged controls. Require MFA and role-specific verification, catalog, rewards, moderation, analytics or operations permission. Sensitive evidence and financial fields are hidden from administrators without that exact scope. W and B apply to every ADM screen.

### ADM-01 · Admin overview

**Route/entry:** /admin; authorized staff. **Pattern:** W/D.

**Layout:** 1. Environment and staff role. 2. Pending approvals/escalations, publication reviews, reward verifications and failed jobs. 3. Operational alerts. 4. Recent audited actions. 5. Saved queue shortcuts.

**Actions:** “Review oldest pending” ADM-02; ingestion ADM-03; moderation ADM-11; BarChart3 “Analytics” ADM-12. Queue counts navigate with matching filters.

**States:** B; unpermitted metrics omitted, not zero; partial-service failure isolates affected count. **Responsive:**320 alert cards precede metrics; desktop two-column queues.

**Acceptance:** Approval items older seven days appear in supervisor escalation counts. Admin homepage never loads unnecessary applicant evidence.

### ADM-02 · Registration, guardian and professional review

**Route/entry:** /admin/approvals/:applicationId?; verification staff; supervisor for escalation. **Pattern:** W.

**Layout:** 1. Role/status/age/risk/age-of-request filters. 2. Queue cards. 3. Selected applicant UUID, verified email/phone and timeline. 4. Identity/guardian/professional evidence with source status. 5. Duplicate-risk flags. 6. Separate applicant-facing message and internal notes. 7. Decision bar.

**Actions:** “Approve” validates prerequisites, allocates nonrecycled GSC ID and notifies AUTH-07; “Request changes” creates correction task; “Reject” requires reason; “Escalate” transfers supervisor ownership. ShieldCheck labels approval.

**States:** B; stale version blocks conflicting decision; unavailable scan blocks evidence approval; community data verification-only. **Responsive:**320 fields then evidence then decision;1440 review/evidence split.

**Acceptance:** Two reviewers cannot approve twice. Guardian approval is independently recorded, not assumed from matching surnames.

### ADM-03 · Data ingestion submission

**Route/entry:** /admin/ingestion/new; catalog ingestion staff. **Pattern:** F/W.

**Layout:** 1. Source type: official URL, licensed feed, manual sourced entry. 2. University/program context and exact URL. 3. Allowlist/retrieval-permission evidence. 4. Proposed fields and review owner. 5. Job preview.

**Actions:** “Queue extraction” creates durable job and opens ADM-13; “Enter manually” ADM-06/07; Link icon labels URL. No automatic publication.

**States:** B; disallowed URL blocked; unsupported provider offers manual route; failed validation preserves input. **Responsive:** one-column720 form; source evidence beneath URL at 320.

**Acceptance:** Private-network/nonallowed destinations cannot be submitted. Ranking feed import requires documented license/permission rather than an assumed unrestricted API.

### ADM-04 · Extracted data review and reconciliation

**Route/entry:** /admin/ingestion/:jobId/review; assigned catalog reviewer. **Pattern:** W.

**Layout:** 1. Job/source/time and extraction status. 2. Field-by-field current versus proposed values. 3. Original-currency units and exact evidence excerpt/URL. 4. Confidence/unknown flags and conflict controls. 5. Reviewer, verification method and next-review date.

**Actions:** “Approve selected changes” creates reviewed catalog draft or publishes only if publication permission also granted; “Reject extraction” records reason; “Edit manually” ADM-06/07. Check/X controls have field-specific labels.

**States:** B; changed live version requires reconciliation; absent evidence stays Unknown. **Responsive:**320 comparisons stack “Current” then “Proposed”; desktop evidence right.

**Acceptance:** Extraction success alone changes no public value. Rejected fields remain unchanged.

### ADM-05 · Catalog management

**Route/entry:** /admin/catalog; catalog staff. **Pattern:** L/W.

**Layout:** 1. Universities/Programs/Requirements/Accommodation/Scholarships/Visa/Taxonomies selectors. 2. Search, country/status/source/review-due filters. 3. Entity cards or four-column table: Name, Type, Status, Review due. 4. Pagination and audit summary.

**Actions:** Plus “New university” ADM-06; existing entity opens ADM-06/07/08/09/14; “Import source” ADM-03. Taxonomy selection opens inline name/parent/status editor preserving source categories.

**States:** B; no rows offers manual creation; referenced entity cannot hard-delete; archive explains downstream effects. **Responsive:** card fallback below 900.

**Acceptance:** Archived programs disappear from discovery but remain named in historical reports. Unpublished taxonomy changes cannot corrupt saved preferences.

### ADM-06 · University and accommodation editor

**Route/entry:** /admin/universities/:universityId; catalog editor. **Pattern:** F/W.

**Layout:** 1. Name/aliases/logo/type. 2. Country/state/city/GPS/address/contacts/public URL. 3. Sourced accreditation, international ratio and rankings with year/license. 4. Accommodation repeaters: type/name, cost/unit/currency, meals/inclusions, distance evidence, transit, optional community amenities. 5. Verification metadata and preview.

**Actions:** “Save draft” stores version; “Publish reviewed university” updates CAT-02 with publisher permission; “Manage programs” ADM-07. MapPin leads location section.

**States:** B; unknown distances stay unknown; no acceptance-rate field; invalid coordinates/unsafe URLs rejected. **Responsive:** map optional;320 uses coordinate inputs and list.

**Acceptance:** Community proximity never affects matching score. Nightly price cannot silently populate monthly cost.

### ADM-07 · Program and pricing editor

**Route/entry:** /admin/programs/:programId; catalog staff. **Pattern:** F/W.

**Layout:** 1. Parent university/name/level/field/discipline/specialization. 2. Duration/unit, study mode and intake. 3. Deadline with day/month precision. 4. Annual/full-course tuition, original currency and fee basis. 5. Separate public information and gated application URLs. 6. Ranking/source/effective dates and review preview.

**Actions:** “Save draft”; “Publish reviewed program” CAT-03 publication; “Edit requirements” ADM-08; Plus adds sourced fee period.

**States:** B; ambiguous fee units prevent comparable-cost eligibility, not all publication; stale-source banner. **Responsive:** fee cards stack at 320; desktop period/value pairs share row.

**Acceptance:** Fee annualization requires explicit basis/duration. Application URLs are excluded from public catalog payloads.

### ADM-08 · Entry requirement rules

**Route/entry:** /admin/programs/:programId/requirements; requirement editor. **Pattern:** F/W.

**Layout:** 1. Program/version. 2. Minimum original grade/scale and official equivalence reference if available. 3. Subject prerequisites, transcript/document types. 4. Language/test minima, components and exemptions. 5. Conditional-admission conditions. 6. Per-criterion weight, hard/mandatory flags, source and effective date. 7. Sample self-check preview.

**Actions:** “Publish reviewed rules” versions criteria and marks old assessments stale; “Save draft” stays; Info next to weight explains equal-weight fallback.

**States:** B; unsupported conversion cannot be entered as universal rule; weight validation blocks malformed totals. **Responsive:**320 each criterion its own card.

**Acceptance:** Rule publication cannot change previously recorded answers. Hard requirement preview overrides a high weighted score.

### ADM-09 · Visa and destination guidance editor

**Route/entry:** /admin/visa/:visaRuleId; authorized destination-content staff. **Pattern:** F/W.

**Layout:** 1. Destination, nationality applicability and study level/type. 2. Visa category and official authority URL. 3. Fees/payment information, processing-time range/date, documents and country rules. 4. Work-hour guidance with source/effective date. 5. FAQ/reapplication content and review schedule.

**Actions:** “Publish reviewed guidance” updates JRN-02 eligible views; “Save draft” stays; ExternalLink previews official authority.

**States:** B; expired guidance flagged; no current data says Unknown, not historical certainty. **Responsive:** long rules fullwidth, no dense matrix at 320.

**Acceptance:** Student visa guidance remains gated until counseling completion and chosen destination. Counselor notes are not published as official requirements.

### ADM-10 · Rewards verification and fulfillment

**Route/entry:** /admin/rewards/:itemId?; rewards staff. **Pattern:** W.

**Layout:** 1. Session/referral verification, catalog, redemption tabs. 2. Evidence: logged duration, rating, prior awards or onboarding completion. 3. Ledger preview. 4. Reward catalog inventory/funding and 500-point recognition pack. 5. Fulfillment status and audit reason.

**Actions:** “Approve qualifying activity” appends25 points once; “Approve redemption fulfillment” advances reserved request; “Publish reward” requires configured inventory. GiftCard labels gift-card controls, disabled initially.

**States:** B; duplicate award prevented; unfunded gift card cannot activate; failed fulfillment retains traceable reservation state. **Responsive:**320 evidence before decision, table becomes cards.

**Acceptance:** Staff cannot directly overwrite balances. Gift-card estimates, when enabled, say10–12 working days, never instant.

### ADM-11 · Moderation, quality and safety review

**Route/entry:** /admin/moderation/:reviewId?; scoped moderator, protected safety cases limited to safety staff. **Pattern:** W.

**Layout:** 1. Queue type/severity/status filters. 2. Reported content and redacted context. 3. Consent/publication evidence or coaching-correction details. 4. Prior actions. 5. Decision, participant-facing response and private notes.

**Actions:** “Resolve with action” records approved/publish/remove/restrict outcome; “Escalate safety case” assigns restricted owner; “Request revision” returns submitter. Flag icon labels report status.

**States:** B; deleted material retained only under permitted evidence rules; insufficient privileges hide safety content entirely. **Responsive:**320 content preview precedes reason field.

**Acceptance:** Routine moderators cannot read protected safety complaints. Publishing story/spotlight requires subject consent and admin approval.

### ADM-12 · Operational and outcome analytics

**Route/entry:** /admin/analytics; analytics-scoped staff. **Pattern:** W/D.

**Layout:** 1. Date/cohort/country/role filters and refreshed timestamp. 2. Registration completion/approval funnel. 3. Match/save/booking/attendance/duration/satisfaction metrics. 4. Active mentors, unique mentees, points issued, top referrers and redemptions. 5. Journey academic standing, internship/placement intervals and self-reported attribution. 6. Accessible data table and definitions.

**Actions:** “Apply filters” recalculates; Download “Export permitted aggregate data” starts secure export; “Inspect failures” ADM-13.

**States:** B; missing outcomes shown as missing denominator; small/sensitive cohorts suppressed; no causal success claim. **Responsive:**320 charts become readable metric cards plus tables.

**Acceptance:** Placement metrics distinguish self-reported outcomes from verified evidence. Unreported alumni are not silently counted as failures or successes.

### ADM-13 · Jobs, delivery and integration operations

**Route/entry:** /admin/jobs/:jobId?; operations staff. **Pattern:** W.

**Layout:** 1. Job type/status/provider/date filters. 2. Queue rows. 3. Selected job attempts, scheduled time, correlation ID and sanitized errors. 4. Calendar/email/WhatsApp/video/FX/media/AI/ingestion status. 5. Retry/cancel eligibility and audit log.

**Actions:** “Retry safely” enqueues idempotent retry; “Cancel pending job” cancels only safe pending work; “Open review” ADM-04 for extraction. RefreshCw leads Retry.

**States:** B; in-flight job cannot be blindly replayed; permanent failure offers manual workflow; secrets and sensitive message bodies excluded. **Responsive:**320 log lines wrap and expand individually.

**Acceptance:** Retrying reminders after reschedule cannot notify an obsolete time. Canceling a failed calendar job never cancels the appointment.

### ADM-14 · Scholarship URL and metadata editor

**Route/entry:** /admin/scholarships/:scholarshipId; catalog staff. **Pattern:** F/W.

**Layout:** 1. Name/provider/official URL. 2. Minimal country/university, level, field, type, status and deadline precision. 3. Optional sourced extended details corresponding to CAT-08. 4. Guest-preview eligibility. 5. Source/verification date/next review and publication preview.

**Actions:** “Publish reviewed scholarship” updates CAT-07/08; “Save draft” stays; “Check destination” queues safe link verification. ExternalLink labels preview.

**States:** B; missing extended data allowed; unsafe URL blocks publication; closed status doesn’t erase historic references. **Responsive:** metadata single-column below 900.

**Acceptance:** Publication requires verified minimal metadata or explicit Unknown. Editor offers no in-app scholarship submission schema.

### ADM-15 · Learning, news and recognition content editor

**Route/entry:** /admin/content/:contentId?; content editor/publisher. **Pattern:** F/W.

**Layout:** 1. Type: course/lesson/resource/news/tour/announcement/Gold+ invitation/spotlight. 2. Title, topic, audience and author attribution. 3. Body/media/captions/source URLs. 4. Consent evidence for named people. 5. Schedule, review status and phone preview.

**Actions:** “Submit for review” queues ADM-11; publisher “Publish approved version” exposes correct LRN/NEW/PUB/REW destination; “Archive” confirms withdrawal. Eye labels preview.

**States:** B; media processing blocks media publication; university-supplied content requires verified provenance, not a university account role. **Responsive:**320 preview below fields;1440 right pane.

**Acceptance:** Counselor submissions never self-publish without review. Quarterly invitations remain content with external meeting details, not ticket sales.

## Rewards, referrals and recognition

Source family: “Rewards & Incentive Policy”, “Referral Program”, “Redeemable Rewards”, “User Dashboard”, and referral/notification templates. Rewards are for verified parent/alumni mentors and eligible verified current-student mentors under the same safeguards.

### REW-01 · Points, tiers and activity ledger

**Route/entry:** /rewards; eligible members; public rules-only state from mentor teasers. **Pattern:** D.

**Layout:** 1. Available, reserved, redeemed, expired and lifetime earned points. 2. Verification badge separate from tier. 3. Unique verified mentees progress5/10/15/25. 4. Immutable activity ledger and pending verification. 5. Inactivity deadline and Gold+ invitation content.

**Actions:** “Redeem points” REW-03; “Invite a student” REW-02; Award “Certificates” REW-04.

**States:** B; no activity explains qualifying rules; five-month warning; six-calendar-month expiry posts ledger debit; signed-in session resets inactivity. **Responsive:**320 balances stack to avoid number clipping.

**Acceptance:** Ten sessions with one mentee cannot award Silver. Expiry never deletes historical ledger entries.

### REW-02 · Referral sharing and status

**Route/entry:** /rewards/referrals; eligible referrer. **Pattern:** T.

**Layout:** 1.25-point qualification explanation. 2. Personal referral URL, Copy button and 192-square QR. 3. WhatsApp, Email, SMS labeled share controls. 4. Editable invitation preview. 5. Status list: invited, onboarding, qualified, not eligible, awarded without sensitive profile details.

**Actions:** “Share invitation” opens selected native/web channel; “Copy referral link” copies only referral URL; “View points” REW-01.

**States:** B; unavailable share app offers Copy; no referrals truthful empty; rejected/self-referral shows generic eligibility explanation. **Responsive:** QR below buttons on320.

**Acceptance:**25 points require approved referred student and completed Modules2+3. Sharing, clicking or merely registering awards nothing.

### REW-03 · Reward catalog and redemption

**Route/entry:** /rewards/redeem/:redemptionId?; eligible member. **Pattern:** L with F confirmation.

**Layout:** 1. Spendable balance and minimum500. 2.500-point recognition pack, certificate plus appreciation letter. 3. Disabled gift-card area until funded inventory. 4. Selected reward terms, verified delivery destination and confirmation. 5. Request timeline: reserved, processing, fulfilled/failed.

**Actions:** “Confirm redemption” atomically reserves points and creates request; “View request” stays selected state; “Download recognition” REW-04 after fulfillment.

**States:** B; insufficient balance explains shortfall; race rejection refreshes balance; failure releases via ledger reversal, not deletion. **Responsive:** phone confirmation fullpage.

**Acceptance:** Simultaneous requests cannot overspend. Confirmation never claims gift-card fulfillment happened instantly.

### REW-04 · Certificates and appreciation letters

**Route/entry:** /rewards/certificates/:certificateId?; certificate owner, authorized reward staff. **Pattern:** T.

**Layout:** 1. Certificate/letter list. 2. Name, verified contribution date range and actual minutes/hours. 3. Accessible document preview. 4. Issue ID/date and correction status. 5. Download/share controls.

**Actions:** Download “Download PDF” uses authorized file; Share2 “Share certificate” requires deliberate system share; “Request correction” SET-05 with certificate ID.

**States:** B; generation pending displays status; no eligible document explains recognition rules; revoked certificate marked withdrawn. **Responsive:** text view precedes zoomable document on320.

**Acceptance:** A90-minute contribution produces1.5 hours, not a fixed20-hour claim. Private details beyond approved certificate content are excluded.

## Learning and development

Source family: “Module 11: Learning and Development”. Full source categories remain available: interactive tutorials, career/university selection, counselor-led application/SOP/interview lessons, micro-learning, soft/academic skills, parent guidance and resource library. No exams or accredited qualification claims.

### LRN-01 · Learning home and course discovery

**Route/entry:** /learning; approved members; published tour content accessible through PUB-02. **Pattern:** L.

**Layout:** 1. Continue-learning card. 2. Category/audience filters. 3. Search. 4. Course cards with title, author, lesson count, duration and personal progress. 5. Library shortcut and recently added content.

**Actions:** “Continue learning” LRN-02 at saved position; “View course” LRN-02 overview state; Library “Resource library” LRN-03.

**States:** B; no progress offers introductory role tutorial; withdrawn course preserves historical progress label without inaccessible lesson links. **Responsive:** two tablet columns, one phone.

**Acceptance:** Parent guidance remains independently discoverable. Learning completion does not claim an accredited award.

### LRN-02 · Course overview and lesson player

**Route/entry:** /learning/courses/:courseId/lessons/:lessonId?; permitted audience member. **Pattern:** T.

**Layout:** 1. Course title/author and progress. 2. Overview or16: 9 lesson player. 3. Captions/transcript and readable lesson body. 4. Downloadable resources. 5. Ordered lesson navigation and completion action.

**Actions:** “Start course” opens first lesson here; “Mark lesson complete” stores progress and offers next lesson here; “Open resource” LRN-03 selected resource; ArrowRight leads Next.

**States:** B; failed media leaves transcript; offline progress says pending sync; prerequisites explain locked sequence if authored. **Responsive:** lesson list becomes dropdown at 320, right panel desktop.

**Acceptance:** Reopening a lesson restores last confirmed position. Watching a video cannot generate reward points or a professional qualification.

### LRN-03 · Resource library and downloads

**Route/entry:** /learning/library/:resourceId?; approved members. **Pattern:** L/T.

**Layout:** 1. Search/category/file-type filters. 2. SOP templates, resume samples, timelines, budgeting sheets and guides. 3. Selected resource title, version, author/source and format/size. 4. Accessible preview and download controls.

**Actions:** “Download resource” retrieves published file; Bookmark “Save to my library” updates library membership; “Related lesson” LRN-02 if linked.

**States:** B; unscanned/unpublished resources unavailable; expired download can regenerate after authorization; empty saved library offers browse. **Responsive:**320 file details wrap; PDF includes text description.

**Acceptance:** Download failure does not show completed. Updating a template clearly identifies its new version.

## News and reviewed updates

Source family: “Module 12: News Feed”, “University”, “Scholarship Alerts”, “Save and Share”. Includes requirements, scholarships, education fairs, program launches, deadlines/intakes/open days, early-bird awards, features, improvements, webinars/workshops, alumni stories and mentorship updates.

### NEW-01 · News feed and followed topics

**Route/entry:** /news; members; approved public items may be linked from PUB-01. **Pattern:** L.

**Layout:** 1. All/Following/Saved controls. 2. Topic filters and search. 3. Cards with two-to-three-line excerpt, publication/source date and topic. 4. Save/Like/Share actions below each. 5. Scholarship alerts shortcut.

**Actions:** “Read update” NEW-02; Bookmark toggles save; Heart toggles like; “Follow topic” updates following filter; “Submit update” NEW-03 for counselors.

**States:** B; no followed topics offers selector; removed article becomes unavailable; public readers sign in for persistence. **Responsive:** card action labels wrap at 320, never icon-only.

**Acceptance:** Following scholarships does not enroll the user in unwanted WhatsApp notifications.

### NEW-02 · News detail

**Route/entry:** /news/:articleId; published article with audience permission. **Pattern:** T.

**Layout:** 1. Headline/topic/date/author. 2. Source and verification note. 3. Body/media/captions. 4. Related university/scholarship records. 5. Save/Like/Follow/Share bar and correction notice where applicable.

**Actions:** “Open related record” CAT-02 or CAT-08 according to typed relation; Share2 opens public URL sharing or scoped parent/counselor conversation MSG-02. “Back to feed” NEW-01.

**States:** B; expired news carries historical date; invalid relation hides only its action; private article uses authenticated share link. **Responsive:** prose max 720,320 media never exceeds content.

**Acceptance:** Sharing to parent requires an authorized relationship for private content. Article dates never substitute for official application deadlines.

### NEW-03 · Counselor news submission

**Route/entry:** /news/submit/:draftId?; approved counselor, own drafts. **Pattern:** F.

**Layout:** 1. Topic and headline. 2. Two-to-three-line summary. 3. Source URL, full body and related catalog record. 4. Media/captions, rights declaration. 5. Preview and review-status history.

**Actions:** “Submit for review” queues ADM-11 and stays pending; “Save draft” stays; Eye “Preview” opens read-only NEW-02 draft mode for author only.

**States:** B; rejected submission shows revision reason; missing source blocks factual update submission; pending edits create new draft version. **Responsive:** editor controls wrap into labeled menu on320.

**Acceptance:** A counselor cannot set publication status. University-origin material must enter verified editorial workflow, not an invented university portal.

## Application roadmap and lifelong journey

Source family: concluding roadmap requirement, “Platform Alumni Success tracking module”, “Alumni Journey Tracking” and “Enhanced Alumni Success Tracking”.

### JRN-01 · Selected-target application roadmap

**Route/entry:** /cases/:caseId/roadmap; authorized case; application actions require completed counseling and chosen target. **Pattern:** T.

**Layout:** 1. Target university/program confirmation. 2. Counseling/unlock state. 3. Ordered tasks from selected program criteria: documents, tests, SOP/LOR, deadlines and counselor actions. 4. Owner/status/due/evidence per step. 5. Visa shortcut and official application handoff.

**Actions:** “Choose this target” confirms a saved combination and rebuilds draft roadmap with change review; “Open task” SES-12; “Visa guidance” JRN-02; ExternalLink “Continue on official application site” opens gated URL.

**States:** B; missing deadline remains unspecified; target change preserves history. **Responsive:** timeline vertical on phones, grouped phases desktop.

**Acceptance:** Opening an external application does not mark submission complete.

### JRN-02 · Destination visa and work guidance

**Route/entry:** /cases/:caseId/visa; counseling completed, target country/level chosen. **Pattern:** T.

**Layout:** 1. Destination and applicability summary. 2. Official authority/source date. 3. Visa type, fees, processing estimate and required documents. 4. Passport/offer/financial proof/photo/form/medical/insurance checklist where applicable. 5. Work rules, FAQ and counselor advisory separately labeled.

**Actions:** “Add requirement to roadmap” creates SES-12 task without duplicating existing requirement; “Visit official authority” external browser; “Ask counselor” MSG-02.

**States:** B; outdated data warns to verify; unconfigured nationality/level says no matched guidance; pre-unlock screen explains JRN-01 prerequisites. **Responsive:** checklists48-high, long rules fullwidth.

**Acceptance:** Guidance never claims a visa approval or fixed processing guarantee.

### JRN-03 · Private milestones and success-story submission

**Route/entry:** /journey; student/alumni or scoped parent acting on selected case. **Pattern:** F/T.

**Layout:** 1. Private-by-default timeline. 2. Admission outcome, visa approval, university arrival/start, semester GPA/scale/standing, internship offer/relevance, graduation, first job offer/position/company/industry. 3. Platform-influence Yes/No and optional evidence. 4. Story preview with separately selected public fields. 5. Explicit named-story/spotlight consent.

**Actions:** “Save private milestone” updates timeline; “Submit success story” queues ADM-11 only after consent; “Become a mentor” MEN-03; “Withdraw publication consent” requests immediate public withdrawal.

**States:** B; dates validated against chronology with explainable exceptions; unknown outcomes allowed. **Responsive:**320 edit one milestone at a time.

**Acceptance:** Saving an admission success never automatically publishes it or notifies a named mentor publicly.

## Settings, privacy, safety and notifications

Source family: Module1 data-consent rights, Module6 confidentiality, Module8 notification/recording/calendar workflows, Module11 tutorials, and rewards inactivity notifications. Account settings do not bypass case permissions.

### SET-01 · More and account settings

**Route/entry:** /settings; authenticated member; More entry can open this screen’s navigation state. **Pattern:** L.

**Layout:** 1. Avatar/name/GSC ID and active role. 2. Role switcher for approved entitlements. 3. Grouped Learning/News/Rewards/Journey links. 4. Account identity/contact/language/timezone. 5. Notifications, Privacy, Security, Help and Log out rows, each56 high with leading icon/trailing chevron.

**Actions:** “Edit account details” AUTH-02/03 account-edit state; “Preferences” SET-02; “Privacy” SET-03; “Security” SET-04; “Help” SET-05; logout clears session and goes PUB-01.

**States:** B; unavailable role cannot be selected; email changes require reverification. **Responsive:** phone single list, desktop grouped720 content.

**Acceptance:** Changing login email never changes immutable UUID or GSC ID.

### SET-02 · Notification and integration preferences

**Route/entry:** /settings/preferences; authenticated member. **Pattern:** F.

**Layout:** 1. Timezone/language. 2. In-app/email/push/WhatsApp channel choices by category. 3.24h/2h/10m reminder defaults. 4. Calendar Google/Microsoft connection status and disconnect. 5. OS permission state and last successful sync.

**Actions:** “Save preferences” updates future jobs; “Connect Google/Outlook” starts OAuth and returns here; Bell “Enable push” requests OS permission; “Disconnect calendar” revokes integration without canceling bookings.

**States:** B; denied push offers instructions; OAuth error preserves confirmed sessions; WhatsApp requires explicit opt-in. **Responsive:**320 switches follow labels on their own row.

**Acceptance:** Opted-out channels receive no optional reminders. Rescheduling supersedes old scheduled notification jobs.

### SET-03 · Privacy, consent and data rights

**Route/entry:** /privacy?document=:document; public policy; authenticated privacy controls. **Pattern:** T/F.

**Layout:** 1. Policy version/effective date and controller contact. 2. Data purposes/recipients/subprocessors/regions. 3. Consent receipts and recording-retention explanation. 4. Family scopes link. 5. Export request and deletion workflow with30-day processing and lawful-hold exception clearly explained.

**Actions:** “Request my data export” creates secure asynchronous request; “Request account deletion” requires recent authentication and explicit confirmation; “Manage family access” PAR-02. Shield leads title.

**States:** B; pending requests display status; hold explains restricted processing without promising immediate deletion. **Responsive:** policy prose720 max, action cards stacked320.

**Acceptance:** Data export excludes another participant’s confidential notes. Recording consent withdrawal remains separate from account deletion.

### SET-04 · Password, MFA and active sessions

**Route/entry:** /settings/security; authenticated member with recent-auth challenge for sensitive actions. **Pattern:** F.

**Layout:** 1. Password change. 2. MFA status and recovery-code regeneration. 3. Active device/session list with time and current-session label. 4. Sign-out controls and security event history.

**Actions:** “Change password” validates current and new credentials; “Set up authenticator” AUTH-10; “Sign out other sessions” revokes tokens; “Regenerate recovery codes” invalidates prior codes after MFA.

**States:** B; mandatory staff MFA cannot be disabled; expired recent-auth returns AUTH-08 with safe destination. **Responsive:**320 session rows become stacked cards.

**Acceptance:** Phone OTP verification is never displayed as enrolled login MFA. Revoked session cannot continue fetching private case data.

### SET-05 · Help, issue reporting and protected safety intake

**Route/entry:** /help/:requestId?; everyone, role-sensitive support intake. **Pattern:** L/F.

**Layout:** 1. Help search and FAQ categories. 2. Role tour shortcut. 3. Contact support form with category, description and optional safe attachment. 4. Separate protected safety-report explanation and participant/record context. 5. Request receipt/status and account-safe response history.

**Actions:** “Send request” creates support/moderation work item with reference; safety routes restricted ADM-11 queue; “Take app tour” PUB-02. LifeBuoy labels Help, Flag labels safety.

**States:** B; anonymous requests need reply channel; upload redaction reminder; no invented support email or emergency guarantee. **Responsive:**320 form replaces FAQ list when opened.

**Acceptance:** Safety intake never forwards full complaint to reported counselor. Submission failure preserves text and does not show a receipt.

### SET-06 · Notification center

**Route/entry:** /notifications; authenticated member. **Pattern:** L.

**Layout:** 1. Unread/all/category filters. 2.64-min-height rows with leading contextual icon, title, safe summary, timestamp and unread label. 3. Group by Today/Earlier. 4. Preference shortcut and load-more.

**Actions:** “Open notification” marks read and routes typed object: SES-04 appointment, SES-09 advisory, SES-12 task, MEN-06 request, REW-01 reward, JRN-03 journey or AUTH-07 approval. “Mark all read” changes read state only; settings SET-02.

**States:** B; removed object says unavailable; revoked scope prevents detail; no notices shows quiet empty state. **Responsive:**320 summary wraps to full width below title.

**Acceptance:** Notification deep links recheck permissions. A “Silver earned” notice refers to 10 unique verified mentees, not 10 sessions.

## Compact annotated responsive wireframes

These are layout contracts, not decorative mockups. Numbers are CSS pixels/logical dp. \> means the next vertically stacked region, \| means columns, \* marks a sticky region with reserved scroll clearance. Header/bottom navigation exclude safe insets. Each diagram lists actual usable widths; nested card padding follows B. Nothing in these sketches permits reducing a 48 touch target. Browser/native equivalents use the same content order.

### Signup contact step · AUTH-03

> 320: H56\[Back \| Step3/4\]
>
> x16,w288: Title \> Email48 \> \[Code96 \| Phone180,g12\]
>
> WhatsApp choice \> Password48\[Eye\] \> Rules \> Confirm48
>
> \*Bottom\[Continue48,w288\]; no member navigation
>
> 390: H56; x16,w358; same order, code96/phone250/g12
>
> Rules wrap naturally; \*Continue48,w358
>
> 768: H56; x24,w720 form card
>
> Title \> progress48 \> one-column fields \> actions48
>
> 1440:H64; centered w720 form, x360
>
> Card padding24; inner672; \[Email324 \| Phone324,g24\]
>
> WhatsApp fullwidth \> \[Password324 \| Confirm324,g24\]
>
> Rules \> actions48

At320 this long form removes outer card padding, preserving288-wide fields. Error summary inserts before Email and receives focus; keyboard scrolling keeps Password and its rule list visible.

### Student dashboard · STU-01

> 320: H56\[Menu \| Home \| Bell\] \> x16,w288
>
> Case \> Next session \> Next step \> Metrics \> Tasks \> Feed
>
> \*Bottom64\[Home Explore Sessions Messages More\]
>
> 390: H56 \> x16,w358; two167-wide metrics,g24
>
> Next step \> Session \> Metrics \> Tasks \> Feed \> \*Bottom64
>
> 768: H56 \> x24,w720; two348-wide metrics,g24
>
> Next step \> Session \> Metrics \> Tasks \> Feed \> \*Bottom64
>
> 1440:H64; Sidebar240 \| x272,w1136
>
> Title \> Next step \> Metrics
>
> Main744\[Session, matches, feed\] \| Side368\[Tasks\],g24

On320 metric labels force a single column when two would clip. Bell opens SET-06 without changing the active student.

### Discovery · CAT-01

> 320: H56 \> x16,w288
>
> Title \> Search48 \> Filter48 \> Count/Sort \> Card \> Card
>
> \*Bottom64; Filter opens fullheight sheet
>
> 390: H56 \> x16,w358; search fullwidth
>
> \[Filter167 \| Sort167,g24\] \> Cards \> \*Bottom64
>
> 768: H56 \> x24,w720
>
> Search \> Filter/Sort \> \[Card348 \| Card348,g24\] \> \*Bottom64
>
> 1440:H64; Sidebar240 \| Main1136
>
> Title/Search \> Filters240 \| Results872,g24
>
> Results: \[Card424 \| Card424,g24\] \> pagination

The result count distinguishes recommendation set from saved count. Returning from CAT-03 restores query, filters and focused result card.

### Program details · CAT-03

> 320: H56\[Back\] \> x16,w288
>
> Title \> Program facts \> Action card \> Section select48
>
> Requirements \> Fees \> Sources \> \*Bottom64
>
> 390: H56 \> x16,w358; same order, facts wrap two columns
>
> 768: H56 \> x24,w720
>
> Title \> Summary \> Actions \> Section links \> Detail cards
>
> 1440:H64; Sidebar240 \| Main1136
>
> Breadcrumb \> Title
>
> Content744\[Requirements, fees, sources\] \| Actions368,g24

The personalized-cost gate replaces the relevant action, never public fee text. At320 a long program name grows the title rather than pushing content sideways.

### Appointment booking · SES-03

> 320: H56\[Back\] \> x16,w288, no outer card padding
>
> Expert \> Zones \> Date list48/row \> Slots48/row
>
> Topics \> Invite \> Reminders \> Summary \> \*Confirm48
>
> 390: H56 \> x16,w358; slot buttons173 each,g12
>
> Same vertical order; \*Confirm48 above Bottom64
>
> 768: H56 \> x24,w720
>
> Expert \> Zones \> Available-date picker \> Slots
>
> Topics \> Invite \> Summary \> Confirm48 \> Bottom64
>
> 1440:H64; Sidebar240 \| centered w720 form
>
> Expert \> Zones \> \[Dates348 \| Slots348,g24\]
>
> Topics/Invite fullwidth \> Summary \> Confirm48

Calendar cells cannot use sub48 targets; when seven day columns do not fit, use the available-date list. Confirmation repeats date, start/end and both zones.

### Conversation · MSG-02

> 320: H56\[Back \| Participant \| More\]
>
> x16,w288: Safety \> Timeline, bubbles\<=216
>
> \*Composer\[Attach48 \| Text168 \| Send48,g12\]
>
> 390: H56; x16,w358; bubbles\<=268
>
> \*Composer\[48 \| Text238 \| 48,g12\]
>
> 768: H56; x24,w720; conversation fullwidth
>
> Timeline \> \*Composer; inbox reached with Back
>
> 1440:H64; Sidebar240 \| Main1136
>
> Inbox320 \| Conversation792,g24
>
> Chat header56 \> Timeline \> \*Composer

In an active conversation, phone bottom navigation is hidden to preserve keyboard space; Back returns MSG-01 where normal navigation resumes. Attachment scanning status sits above the composer.

### Counselor student case · COU-05

> 320: H56\[Back \| GSC ID\] \> x16,w288
>
> Identity \> Scope banner \> Section select48
>
> Selected section \> Evidence \> \*Case action48
>
> 390: H56 \> x16,w358; same order, task metadata wraps
>
> 768: H56 \> x24,w720
>
> Caseload list OR selected case; Back switches views
>
> Case sections \> Evidence cards \> actions \> Bottom64
>
> 1440:H64; Sidebar240 \| Main1136
>
> Search/Case selector \> Identity \> Sections
>
> Case744\[Academics, shortlist, timeline\] \| Evidence368,g24

Selecting another case closes the evidence viewer before fetching new content. Private notes have a visible confidentiality label above their editor.

### Admin application review · ADM-02, web-only

> 320: H56\[Menu \| Review\] \> x16,w288
>
> Queue selector \> Applicant \> Verification \> Evidence
>
> Public response \> Private notes \> \*Decision48
>
> 390: H56 \> x16,w358; same order
>
> Decision menu lists Approve/Changes/Reject with48 rows
>
> 768: H56 \> x24,w720
>
> Queue tabs \> Applicant \> Evidence beside its field
>
> Public response \> Private notes \> decision bar
>
> 1440:H64; Sidebar240 \| Main1136
>
> Queue filter \> Applicant/version
>
> Review744 \| Evidence368,g24 \> \*Decision bar

Approval confirmation repeats applicant and role. An optimistic approval toast is forbidden; wait for server-confirmed decision/version. Native has no corresponding privileged review screen.

## Cross-screen invariants and implementation handoff

- Recommendation ordering is manual university choices first, then same-city and same-country alternatives, four lowest comparable annual-cost slots, then up to three strongest course-rank slots. Deduplicate universities across categories and fill deterministically from eligible remaining records, never exceeding10 total. Unknown cost is excluded from lowest-cost selection; unknown rank cannot claim a strongest-rank slot. Preserve published source/year in every ranking explanation.

<!-- -->

- Counselor score uses normalized field overlap up to 30, best country priority20/15/10, availability10 for a slot within 14 days, rating 10 × mean / 5 or neutral5 with insufficient ratings, and workload 30 × (1 - active_cases / case_capacity) bounded0–30. Eligibility is checked first. Neither protected community information nor optional introduction video affects score.

- Inactivity for rewards is measured from the latest qualifying mentoring activity, qualifying referral or signed-in session. Display a warning at five calendar months, expire remaining spendable points at six through immutable ledger entries. Already reserved redemption points follow the request’s transactional state, not an untracked balance edit.

- Booking, parent-scoped sharing, assignment handoff, reward reservation and publication each require server-authoritative confirmation. A loading spinner, draft save or external-site visit cannot represent their successful completion.

- Edit-mode routes reused from registration must preserve the existing account and route back to SET-01; they never reopen registration eligibility or reallocate identifiers. Guardian evidence and family permission changes return to PAR-02. Initial approval onboarding always follows AUTH-07’s role-specific route.

- **Adopted extra interaction defaults:** available-date lists on narrow booking screens; ten-minute lobby opening; one report-due reminder threshold at 24h; original-grade retention; explicit upload limits in B. These defaults fill source gaps without changing canonical business decisions.

- **Release evidence, not open product choices:** demonstrate selected video provider behavior on web/iOS/Android; verify safe calendar reconnection, OTP vendor limits and data-export/deletion behavior; obtain source/feed permission evidence and privacy/subprocessor disclosures. Until a provider capability passes its integration test, show the specified truthful pending/error/manual alternative.

- **Known consistency watchpoints:** never conflate10 recommendations with3 saved combinations; phone verification with MFA; contribution tier with verification; self-assessment with counselor fit; financial completion with mandatory financial disclosure; public course information with gated applications; or company membership with case authorization. Historical drafts/examples that conflict with these distinctions are not acceptance-test fixtures.

# Global Student Cube: domain, fields and business workflows

## Contract and notation

This specification implements the supplied Global Student Cube document under the Binding implementation decisions. It covers public discovery, Modules 1–8, rewards, Modules 11–12 and Alumni Journey Tracking. The source has no Modules 9 or 10. This is a development contract, not a statement that catalog data, provider integrations or legal approvals already exist. Descriptive screen names intentionally replace screen identifiers.

Requiredness below means required **on submission/completion**, not on every draft save. R required; O optional; C conditional; RO server-derived/read-only. A named family rule applies to every child field unless an exception is stated. Dot-separated keys are stable contract names; \[\] identifies a repeated record with its own UUID, not a positional database identity. Display labels may change without renaming keys. API writes whitelist these fields and reject unknown or read-only properties.

### Shared field rules

- **Identity:** every aggregate has id UUID, created_at, updated_at, created_by, version, and applicable status, all RO. Updates include the last version; conflicts return the changed field names and let the user reload or explicitly merge, never silently overwrite another family member.

<!-- -->

- **Text:** Unicode, normalized surrounding whitespace, no HTML; single-line text defaults to 1–160 characters, descriptions to 2,000, internal notes to 4,000. Names permit letters, marks, spaces, apostrophes and hyphens rather than excluding legitimate non-English names. Empty optional text becomes null. Character and word limits are enforced on client and server.

- **Dates:** ISO date storage, local DD/MM/YYYY display; date-time storage uses UTC instants plus original IANA timezone. Historical years range from birth year to current year; education can predate account creation but not birth. Anticipated study dates may extend ten years ahead. An unknown date is null, not 1 January.

- **Numbers:** no NaN, infinity, negative money or floating currency arithmetic. Money is decimal with original ISO currency, maximum 999,999,999,999.99; percentages 0–100 unless explicitly a readiness ratio. Counts are integers. Numeric zero and unknown are different values.

- **Choices:** save stable option codes, not translated labels. Other selections require a 2–160-character explanation. No selection and “Not yet decided” are distinct. Country and currency pickers use maintained ISO catalogs; city includes country identity, optional region and free-text fallback when missing.

- **URLs/contact:** HTTPS only, maximum 2,048 characters; reject executable schemes and malformed hosts. Emails maximum 254 characters with normalized unique login address; phone numbers use E.164 with country-code picker. Suggested country codes remain editable and never require SIM access. A changed verified contact becomes unverified until reconfirmed.

- **Attachments:** profile images JPEG/PNG/WebP up to 5 MB; other documents PDF/JPEG/PNG/WebP up to 20 MB; introduction video MP4 up to 100 MB and 60 seconds. Attachment arrays default to five files per record. Uploaded files remain private pending inspection; permissions follow their owning record, not possession of its URL.

- **Consent:** no prechecked boxes. Store policy_version, accepted_at, actor_id, subject_id, purpose and, where relevant, guardian authority. Consent for essential service processing, optional publication, WhatsApp notices and recording are separate records.

- **Errors:** return field path, stable error code, helpful message and repair action. Examples: COUNTRY_PRIORITY_DUPLICATE, “Choose a different country for priority 2”; GRADE_SCALE_REQUIRED, “Select the grading scale before entering the score.”

### Access families

SELF is the account holder. CASE is the student plus a verified linked parent whose explicit scope permits that field; the currently assigned counselor can read academic/case information needed for guidance, but receives financial detail only with financial scope. VERIFY is verification staff, not every administrator. EDITOR is an authorized counselor/catalog contributor editing drafts, with content administrator publication. PUBLIC is a separately approved projection, not the underlying profile. Mentors receive only a consented mentoring brief, not an entire student file. Every access decision is server-enforced, including exports, attachments, notifications and search results.

## Public overview and Guest Mode

Public discovery remains usable without identity collection. public.hero.tagline and public.hero.summary are R approved copy, 160/600 characters, edited by content administrators. The source tagline is retained: “Your Pathway to global education, where dreams meet directions”. public.coverage.country_count and university_count are RO counts of published active catalog records, not aspirational totals. public.features\[\] holds R title and description for university matching, affordability, financial snapshot, free 30-minute counseling, alumni mentoring, parent experience, rewards and roadmaps.

guest_match.country and guest_match.subject are R local-only selectors. Submit returns three to five published relevant universities and one to two scholarships if inventory supports those counts; show fewer honestly. Do not create a private profile from a guest query. Public fee ranges remain visible; personalized budgets, saves, contact and applications use authenticated gates.

public.mentor_teaser exposes opted-in name, image, verified professional/education summary, approved testimonials, up to five approved frequently asked questions and quick_tip_video of at most 30 seconds. Video is muted by default, never forces playback under reduced-motion/data-saving preferences, and has captions. public.success_story, public.testimonial, public.tour and public.advertising_panel are reviewed content records with title, body/media, audience, publication dates and optional destination URL. No ad-tracking business system is introduced. Guest scholarship copy says registration unlocks the full available catalog and guidance; it must not imply GSC itself submits applications.

## Module 1: Basic Registration and approval

Family: SELF edits draft identity; VERIFY sees submitted verification details; ordinary staff receive only role-appropriate account summaries. Repeated identity fields in Module 6 refer to this same account, not duplicated passwords or contacts.

| Stable field keys                                                                          | Requirement and control              | Rules and access exceptions                                                                                                                                                                            |
|--------------------------------------------------------------------------------------------|--------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| account.registration_role, account.participant_stage                                       | R radios                             | Role Student, Parent, Counselor; stage Seeking university, Currently studying, Ex-university student. Counselor additionally chooses Company/Individual in Module 6.                                   |
| registration.community_self_declaration                                                    | C Yes/No                             | Required for student/parent pilot eligibility; verification-only sensitive field. No returns to guest before storing a private application. Counselor professional eligibility does not depend on it.  |
| identity.full_name, identity.family_name, identity.father_husband_name                     | R full name; O other two; text 160   | Smart parsing suggests surname only. Father/husband suggestion requires explicit confirmation, never inferred relationship authorization. A person without surname may leave it absent.                |
| identity.gender, identity.birth_date                                                       | R radio/date                         | Male, Female, Prefer not to say. Birth date must be genuine past date; age evaluated using date, not typed age.                                                                                        |
| identity.nationality, residence.country, residence.city                                    | R country/city                       | Residence city must belong to selected country or be explicitly entered as unlisted.                                                                                                                   |
| address.street, address.city, address.postal_code, address.country                         | R street/city/country; C postal      | Street 300 characters; postal required only where local format supports it; do not force a foreign postcode template. Private verification data.                                                       |
| contact.phone, contact.whatsapp_same_as_phone, contact.whatsapp                            | R phone; R checkbox; C WhatsApp      | If same is checked, derive WhatsApp; otherwise optional distinct number. WhatsApp number does not itself grant messaging consent.                                                                      |
| contact.login_email, contact.student_email, contact.parent_emails\[\]                      | R login; C student; O parents, max 2 | Student email aliases login for independent students. Parent-entered student email can initiate invitation, not linkage. Guardian-operated under-13 case has no child login requirement.               |
| identity.profile_picture                                                                   | O image                              | Camera/gallery with alternative upload; separate explicit publication permission.                                                                                                                      |
| auth.password, auth.password_confirmation                                                  | R protected inputs                   | 12–128 characters, upper/lower/number/symbol; spaces and paste allowed; exact confirmation match. Never return, log or store plaintext.                                                                |
| travel.passport_status                                                                     | C dropdown                           | Yes, No, In Process. Required for seeking-university student cases; not alumni, parent mentors or counselors. Parent account answers for the associated seeking-student case, not its own passport.    |
| identity.social_links\[\]                                                                  | R at least 1, max 5 URLs             | LinkedIn, Instagram, Facebook, X, Other professional/social profile. Underage users use guardian verification evidence instead of being forced to create social accounts. Never publish automatically. |
| consent.data_use, consent.email_notices, consent.whatsapp_notices                          | R acceptance; O channel preferences  | Operational in-app notices remain available; marketing/publication is not bundled into service acceptance.                                                                                             |
| registration.status, registration.gsc_id, registration.decision_at                         | RO                                   | Status projects account.status, not a second enum. Internal UUID is identity. Allocate sequential GSC-000001 through GSC-999999 only on approval; roll to GSC-A000001; never recycle.                  |
| registration.admin_comments, registration.rejection_reason, registration.requested_changes | O notes; C decision explanation      | VERIFY edits internal comments. User sees safe rejection/change explanation, not fraud indicators, third-party information or private reviewer notes.                                                  |

### Approval, authentication and profile state machines

**Approval:** persisted account.status options are exactly email_pending, phone_pending, guardian_pending, review_pending, approved, rejected, suspended, deletion_pending. SELF starts email_pending; verified email advances to phone_pending; verified phone advances to guardian_pending for a minor requiring guardian verification, otherwise review_pending. VERIFY’s guardian approval advances guardian_pending to review_pending. Draft and Contacts pending are interface phases, not additional account statuses. OTP is six digits, five-minute expiry, resend after 60 seconds, five attempts/challenge, five sends/hour/phone plus abuse protection. New challenges invalidate old ones; expiry offers resend.

Each verification_case.status is exactly pending, approved, rejected or needs_information. VERIFY changes pending to an outcome, recording reason/time; needs_information displays Changes requested while account remains review_pending. SELF resubmission returns that case to pending. Final approval/rejection moves the account to approved/rejected after all required checks. Reconsideration is a request event; VERIFY acceptance reopens the case to pending and account to review_pending, not another persisted status. Seven calendar days without review escalates to supervisor. Approval atomically allocates GSC ID and queues minimal welcome notices; notification failure does not roll back approval.

approved → suspended is a VERIFY/admin safety action; only authorized admin restores suspended → approved. Access restrictions take effect immediately. A deletion request moves account to deletion_pending, revokes active links/sessions and starts retention/hold-aware jobs. Processing/deleted are deletion-job outcomes, not additional account statuses. Final erasure removes personal account data; deletion is not soft suspension.

**Profile:** each module has not_started → draft → complete; submit validates every required field. Material edits move complete → incomplete only when resulting required conditions fail, retaining prior snapshots. Public mentor/counselor profiles additionally use submitted → review_pending → published; rejection returns changes_requested. New edits to a published profile create a revision; risky identity/qualification changes hide the affected public claim until approved. No profile completion percentage substitutes for an actual completion predicate.

Email changes, password changes, guardian-link decisions, granting publication consent and reward redemption require authentication within ten minutes; admin/counselor sensitive actions additionally require TOTP MFA. Recording-consent withdrawal and a current subject’s request to unpublish remain immediately available in an authorized session and never wait for a fresh MFA challenge. An expired login preserves non-sensitive unsent local form state, asks sign-in, then rechecks authorization and aggregate version. Never replay a booking/redemption blindly after reauthentication.

### Verified family linkage and underage handling

family_link fields are R student_id, inviter_id, invitee_email, relationship (Parent, Legal guardian), requested scopes and expiry; C authority evidence; RO acceptance/verifier/audit timestamps. Scopes are academic profile, financial profile, recommendations, advisories, session participation and journey, selectable independently. Contacts and private complaints are not automatically included. A parent can manage several verified child cases; every write explicitly names the active student case.

Link states: inviter creates draft → invited; email recipient signs in/verifies that address and moves invited → accepted_pending_verification. Student/adult authorization plus VERIFY relationship review produces active. Either recipient declines → declined; inviter revokes → revoked; worker expires unused invitations after seven days → expired. Reissue creates a new single-use token. Relationship evidence must substantiate the claimed parent/guardian relationship; matching surname, email or referral is never evidence by itself.

For an adult, the student explicitly approves scopes after seeing recipient identity. For ages 13–17, VERIFY confirms guardian authority from private evidence and guardian attestation before activating the student or private contact. Under 13, the verified adult operates a student case; the child gets no independent login, direct messages or private booking rights. Guardian joins or explicitly authorizes age-appropriate sessions, with recording separately controlled.

At age 18, notify both parties and require adult reauthorization of continuing parent access; pause parent scopes until accepted. Revocation immediately prevents future reads/downloads and cancels share notifications; already delivered files cannot be remotely recalled, which the consent screen explains. Disputed guardianship suspends the disputed link for VERIFY review, not the student’s entire educational history. A financial scope revocation does not erase data supplied for the student’s case, but ends that parent’s access.

## Module 2: Student’s Full Profile and Academic Details

Family: CASE can edit the student case under granted scopes; counselor reads assigned cases and records separate verification annotations. Completion requires valid education, study preference and conditional branches; optional activities/video/financial amounts never become hidden mandatory fields.

| Stable field keys                                                    | Requirement, type and limits                              | Options, conditional behavior and validation                                                                                                                                                |
|----------------------------------------------------------------------|-----------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| student.education_level, student.education_years                     | R dropdown/integer 0–40                                   | High School, Diploma, UG, PG; years actually completed, not projected years.                                                                                                                |
| education.school.name, .score, .score_year                           | R name/year; O score when unavailable                     | Record school result with explicit result_status Available, Awaiting result, Not available. Available score requires scale.                                                                 |
| education.college.name, education.university.name                    | C text/autosuggest                                        | College when attended; university for completed/current university study; store entered name if catalog lacks institution.                                                                  |
| education.country, education.city                                    | R country/city                                            | Location of relevant education institution, independent of current residence.                                                                                                               |
| education.board.system, .other_name, .score, .year, .results\[\]     | R system/year; C Other; C available-result score/evidence | IB, CBSE, IGCSE, National, Other. Preserve board and school results separately when different.                                                                                              |
| education.completion.year, .status, .score, .results\[\]             | R status; C year/result                                   | Completed, Currently studying, Awaiting result. Future year explicitly anticipated, never verified graduation.                                                                              |
| education.grade.value, .scale, .year, .results\[\]                   | C available grade; numeric/text                           | GPA 0–4, Percentage 0–100, Letter, Other institution scale. Letter 1–10 characters; Other requires named bounds. Attach official result or mark evidence unavailable/awaiting verification. |
| student.tests_taken, student.tests\[\]                               | R Yes/No; C one or more cards                             | IELTS, TOEFL, SAT, GRE. Each card has type, variant, score, date, year, results and verification state. Year must equal date year.                                                          |
| student.same_field, student.previous_field, student.intended_field   | C Yes/No and taxonomy/text                                | Ask when previous specialist study exists. Yes retains previous field; No requires distinct intended field plus old field. No forced change for a school student without specialization.    |
| student.activities\[\]                                               | O, maximum 5                                              | Each created activity requires type/name; role, duration, hours/week and achievements optional. Types Sport, Academic, Volunteer, Arts, Other; Other description conditional.               |
| student.scholarship_received, .scholarship_not_granted               | R Yes/No flags                                            | Each Yes requires one history record: name, amount status, amount/currency if known, year, decision letter or evidence-unavailable reason. Lists maximum 20 each.                           |
| student.intake.month, .year, .undecided                              | R explicit decision                                       | Jan, May, Sep, Not yet decided; month/year required together unless undecided. Do not invent a university intake from this preference.                                                      |
| student.relative_abroad.has_relative, .relationship, .city, .country | O Yes/No; C details                                       | Yes requires relationship and location; no relative name/contact collected.                                                                                                                 |
| student.career_interests_goals                                       | R text, maximum 200 words                                 | May explicitly state uncertainty about major; uncertainty is useful counseling context, not rejection.                                                                                      |
| student.introduction_video, .video_language, .video_caption          | O MP4, 60 seconds                                         | Any language; language optional metadata. Private CASE use, not automatic public story or marketing consent.                                                                                |
| student.preferred_countries\[\]                                      | R ordered choices                                         | Exactly 3 distinct supported countries; fewer only when supported active catalog has fewer than 3. Store rank 1–3.                                                                          |
| student.preferred_locations\[\]                                      | O city/region selections, max 10                          | Each belongs to a selected preferred country; changing countries asks confirmation before removing dependent locations.                                                                     |
| student.target_level, .field_of_interest                             | R dropdown/taxonomy                                       | Undergraduate, Masters, PhD, Certificate. Field includes explicit Undecided for guided exploration.                                                                                         |
| student.disciplines\[\], .specializations\[\]                        | C Masters-only; specialization O                          | Disciplines depend on field. For Masters require at least one or explicit Undecided; maximum 5. Specializations maximum 5, constrained to selected disciplines.                             |
| student.accommodation_preference                                     | R dropdown                                                | Dorm, Apartment, Shared. No housing preference is treated as guaranteed accommodation availability.                                                                                         |

Activity child keys are .type, .other_type, .name (160), .role (160), .duration_start, .duration_end, .duration_text (80), .hours_per_week (0–168), .achievements (600). Dates must be ordered; duration text supports intermittent participation. Do not require fabricated dates when a truthful description suffices.

Test cards validate an explicitly selected, versioned scale. Starter schemas are IELTS 0–9 in 0.5 increments; legacy TOEFL iBT total 0–120 integer; SAT total 400–1600 in increments of 10; GRE Quantitative and Verbal independently 130–170 integers and Analytical Writing 0–6 in 0.5 increments. GRE has named components, never one ambiguous total. These are supported input schemas, not claims that every test edition has that scale. Other/historical variants retain reported score/scale and require counselor verification; no guessed conversion. Dates cannot be future for a taken test; planned tests belong in roadmap tasks.

TOEFL iBT reports for tests taken on or after 21 January 2026 use overall and section scores of 1–6 in half-point increments; ETS also supplies a comparable overall 0–120 score during a two-year transition (ETS score-report guidance[^4]). Therefore require test_variant, scale_code, scale_version and test date alongside the raw reported score. Use TOEFL_IBT_BAND_2026 for the new scale and TOEFL_IBT_LEGACY_120 for legacy records; preserve an optional report-provided comparable total as a separate field, never overwrite the band score. Populate the date-appropriate default while allowing a verified historical edition. Each program requirement stores its own accepted scale/version. Cross-scale evaluation requires an explicitly published institution rule or a versioned, reviewed concordance; without one, return “Manual review needed,” not an invented arithmetic conversion. Acceptance fixtures must cover pre-change reports, post-change band scores, transition reports containing both totals, and a program whose requirement still uses the legacy scale.

Changing away from Masters hides discipline/specialization controls and excludes their previous values from current matching; preserve old values only in version history. The source references external taxonomy sheets not supplied. The implemented initial taxonomy combines the explicitly supplied categories and discipline labels in the annex; administrators may add reviewed nodes, but the interface must not claim exhaustive worldwide coverage.

Student education uploads remain possible when evidence is missing at completion: an explicit awaiting/unavailable state completes the profile while making affected assessments Unknown. Neither the optional video nor lack of a social account accelerates/penalizes matching. The source’s “40% faster counselor responses” is not a collected metric or displayed guarantee. Lifetime milestone-based video redistribution is not part of this scope.

## Module 3: Parent and Financial Information

Family: student or verified linked parent with financial edit scope may complete. Show “We encourage parents to help verify these details”; do not block independent adults for having no parent. Counselors see only explicitly permitted financial records. Every optional financial amount has disclosure_status Provided or Declined; null without an explicit choice is unfinished, not zero.

- finance.parent_occupation: O text 160. finance.annual_income: O money with currency and disclosure status; .income_usd RO conversion. Income is contextual, not automatically funds available for tuition.

<!-- -->

- finance.housing.status, .structure, .construction, .rooms: O independent dropdowns. A section-level housing_disclosure R Provided/Declined makes completion explicit. If Provided, require all four answers; structure_other conditional. These socioeconomic details never affect counselor matching or community visibility.

- Housing status options: Owned (self-owned); Owned (inherited/family property); Rented (private); Rented (government/community subsidized); Provided by employer; Provided by relatives/others; Temporary/informal settlement (no rent agreement).

- Structure options: Flat (apartment); Semi-detached house; Bungalow; Villa; Shared/partitioned accommodation; Informal dwelling (hut, tin shed, makeshift); Other.

- Construction options: Permanent (cement, brick, concrete); Semi-permanent (mixed materials); Temporary (tin sheets/wood/plastic); Mud/earthen. Room bands: 1 room; 2 rooms; 3–4 rooms; 5+ rooms. Do not collapse these four dimensions into one “housing type”.

- finance.sponsor_available, finance.income_proof_available: O Yes/No/Prefer not to answer. This source asks availability, not mandatory upload of bank statements or sponsor identity.

- finance.savings_reserves: O money and disclosure status; .savings_usd RO. Enter education-available combined savings/reserves once, with confirmation that the same family funds have not been repeated.

- finance.selected_cost_snapshot_id, .estimated_expenses, .readiness_percent, .readiness_status, .horizon: RO outputs except horizon selection; initial horizon First academic year, optional Full program where data supports it. Status Known, Incomplete costs, Savings declined, FX unavailable, Invalid denominator.

- finance.share_parent_id: O verified active recipient selector. finance.share_requested_at and .shared_snapshot_id RO audit. Email is an authenticated-link notice with indicative-estimate disclaimer, never free-form arbitrary recipient financial export.

Completing Modules 2 and 3 unlocks personalized cost analysis, up to three saved university/program pairs and parent sharing where a parent exists. Declined optional amounts still permit completion; readiness remains Unknown. Savings updates recalculate a new snapshot without rewriting old shared advisories.

## Modules 4 and 5: Alumni and parent mentorship

### Alumni/current-student mentor profile

Family: SELF edits; VERIFY verifies; published opted-in projection is PUBLIC. Current students use these experience fields with mentor.study_status Currently studying and anticipated graduation, and require explicit admin mentor eligibility approval.

- mentor.university_attended, .course: R autosuggest/text 200; preserve unmatched institution label. mentor.graduation_year: R year with .graduation_is_anticipated C current student.

<!-- -->

- mentor.topics\[\]: R exactly three leaf topics from the alumni taxonomy below. mentor.industries\[\]: R one or more, maximum ten, including Other with explanation.

- mentor.current_organization, .role: O text 160; .employer_business_url, .professional_link: O HTTPS; professional link is LinkedIn or portfolio, separate from registration social verification.

- mentor.monthly_availability_hours: R numeric 2–160 in 0.5-hour increments. Actual bookable calendar slots must also exist. mentor.experience_years: R 0–80, up to one decimal.

- mentor.reflection: O maximum 50 words, “What I wish I knew”. mentor.verification_badge RO verified status; .contribution_tier, .supported_unique_mentees, .mentors_consulted, .published_rating RO distinct measures.

### Parent mentor profile

parent_mentor.education_level R High School/Diploma/UG/PG. parent_mentor.topics\[\] R one to three parent topics. parent_mentor.monthly_availability_hours R at least 2, default 2, maximum 160. parent_mentor.reflection O 50 words; .experience_years O 0–80. .supported_unique_mentees, .rating, .verification_badge, .contribution_tier RO. Parent mentorship cards display approved parent name and session topics, not private child education or family finances.

Parent-topic options are Admissions & University Process; Financial Planning & Payments; Accommodation & Local Living; Academic & Career Guidance; Student Life & Wellbeing; Local Community & Support Network; Technology & Digital Setup; Health, Insurance & Medical Services. Preserve descriptors respectively: applications/documents/deadlines/entrance tests; fees/scholarships/budgeting/funds transfer; hostels/apartments/costs/safety; course/workload/internships/job outlook; social adjustment/culture/stress/mental health; alumni groups/parent help/language/contacts; SIM and internet/university portals/digital payments/recommended apps and tools; medical insurance/local health registration/emergency and hospital access.

### Mentoring records and request states

mentoring_request requires mentee case/account, selected mentor, one or more offered topics, purpose text maximum 600 and consented brief. draft → requested by mentee/authorized guardian; mentor → accepted or declined; requester → withdrawn; worker → expired after seven days. Acceptance opens scoped messaging and booking. Mentors browse consented requests, not a general student directory. Student-to-alumni and parent-to-parent are supported; a mentor may not privately bypass guardian controls.

mentor_report stores RO session, mentor name/ID, mentee name/ID, session date/time and actual duration; R session type Career, Admission, Finance or Accommodation; R good_point and improvement_point, each 600 characters. Both sides can submit their own reports. Display Pending until submitted and Completed after completion; system approval is a separate state. A parent’s summary uses the same structure, with the two reflection points optional because its source summary did not require them.

mentoring_log: draft → submitted by mentor after completed meeting; admin → changes_requested, rejected or approved. A rating must exist before reward eligibility. If approved first, state is approved_awaiting_rating; later valid rating moves it to reward_eligible. Only the reward worker can move reward_eligible → credited, transactionally once. A report alone does not prove attendance.

### Mentoring feedback field sets

Each feedback record is one per author/session, editable as draft and submit-once; a corrected response creates an audited revision. Participant-authored comments are private by default. Individual mentee ratings are not visible to other mentees; aggregates require five distinct valid raters.

Alumni mentee questionnaire, all five ratings R and challenges R:

1.  mentee_feedback.clarity: Very Clear, Clear, Somewhat Clear, Not Clear.

<!-- -->

1.  .relevance and .prepared_knowledgeable: Strongly Agree, Agree, Neutral, Disagree.

2.  .action_clarity: Yes, very clear; Somewhat clear; Minimal; None.

3.  .satisfaction: Very Satisfied, Satisfied, Neutral, Unsatisfied.

4.  .challenges\[\]: Lack of clarity; Information overload; Too fast/too slow pace; Not enough time; Limited topic knowledge; Technical issues (audio/call quality); Difficulty understanding process/steps; None. None excludes every other selection.

Mentor-authored questionnaire, six R choices:

- mentor_feedback.preparation: Very Prepared, Prepared, Somewhat Prepared, Not Prepared.

<!-- -->

- .engagement: Very Engaged, Engaged, Somewhat Engaged, Not Engaged.

- .likely_followthrough: Strongly Agree, Agree, Neutral, Disagree.

- .overall_experience: Excellent, Good, Fair, Poor.

- .technical_issues: No issues, Minor audio/video issues, Connectivity interruptions, Major technical disruption.

- .scope_difficulty: Not challenging, Slightly, Moderately, Very challenging.

Parent-mentee questionnaire, five R choices:

- parent_feedback.clarity: Excellent, Good, Fair, Needs Improvement.

<!-- -->

- .usefulness: Strongly Agree, Agree, Neutral, Disagree, Strongly Disagree.

- .organization: Strongly Agree, Agree, Neutral, Disagree.

- .practicality: Highly Practical, Practical, Somewhat Practical, Not Practical.

- .recommendation: Definitely Yes, Yes, Maybe, No.

Keep original ordinal answers; normalize positive four-option ratings to 5, 11/3, 7/3, 1 and five-option ratings to 5, 4, 3, 2, 1 for display aggregates. Diagnostic challenges/technical/scope answers do not become punitive star scores. Mentor published score is mean of the five mentee experience items per session, then equal-weight session means. Leaderboards separately expose top-rated and most-active views, top ten monthly/annual, with deterministic ties by approved unique mentees, verified minutes and mentor UUID.

## Rewards, referrals and recognition

Family: eligible alumni/parent mentors see their own ledger, referrals and redemptions; authorized rewards admin administers catalog/fulfillment. Public badges reveal verified contribution tier only. No AI component can mint points or change eligibility.

reward_account.total_earned, .redeemed, .expired, .reserved, .available, .session_count, .referral_submitted_count, .tier are RO ledger projections. reward_catalog requires title, category, description, integer points_cost ≥500, enabled flag, inventory policy and delivery estimate; O image and supplier reference. Initial enabled item is a 500-point recognition pack containing certificate and appreciation letter. Gift cards/donation promotions remain disabled until genuine funded fulfillment exists.

points_entry is immutable: UUID, account, event type Earn mentoring/Earn referral/Reserve/Release/Redeem/Expire/Reversal, signed points, source ID, created instant and idempotency key. Corrections append linked reversal entries with admin reason. Unique keys enforce one 25-point mentoring credit per qualifying session and one 25-point referral credit per referred student, globally.

referral.code, .url, .qr_asset are RO. referral.channel O WhatsApp, Email, SMS, Copy link, QR. Native share/composer lets sender approve delivery; never upload an address book. referral.invitee_account_id, .attributed_at, .qualified_at, .status are RO and expose progress only, not invitee academic/financial fields.

Referral states: issued → visited → attributed → onboarding → qualified → credited. First valid referral accepted during registration wins; attribution locks on submission. Qualification needs approved student plus complete Modules 2 and 3, not a click or payment. Self-referral, existing-account referral and duplicate student identity are ineligible; suspected abuse review_hold, admin resolves to ineligible/onboarding/qualified. Missing optional financial figures do not prevent qualification when explicitly declined. A parent inviting an existing linked child cannot generate a second student credit.

Redemption states: member draft → requested; transaction checks active account, recent authentication, enabled inventory and available balance, then creates reserved. Admin/worker reserved → fulfilling → fulfilled; stock/vendor failure → failed → released; member may cancel before fulfillment → cancelled → released. Debit reserved points only once; release returns them unless an intervening valid expiry applies, in which case append expiry as well. Webhook retries cannot duplicate rewards. Gift cards, when enabled, show 10–12 working days with configured fulfillment holidays; never claim instant delivery.

Spendable balance is earned minus redeemed, expired and active reservations plus valid corrections. Six calendar months without signed-in activity or qualifying mentoring/referral expire remaining spendable points; month-five warning is one idempotent event. Calendar-month arithmetic clamps month-end dates. Reservations already in fulfillment remain reserved; abandoned reservations are released and checked for expiry. Historical earned totals and service hours remain auditable.

Tier thresholds count **unique supported verified mentees**, not sessions: Star 5, Silver 10, Gold 15, Platinum 25. One parent or student mentee account counts once; duplicate identity merges cannot inflate the count. Verification badge and tier are independent. Certificates state actual verified minutes/hours, never a fixed 20 hours. Public spotlight requires separate consent. Quarterly Gold+ invitations are content-admin messages with event information, not an event-ticketing product.

Notifications cover submitted session, verified credit, tier change, monthly top ten, referral success/reminder, reaching 500, redemption request/fulfillment, available certificate, opted-in mentee success story, inactivity warning, enabled new reward and quarterly invitation. Templates use actual ledger/tier facts; replace the source’s “10 sessions = Silver” and “instant QR points” wording.

## Module 6: Career counselors and consultancy companies

Family: counselor staff edit their profile drafts; VERIFY validates professional identity and company authority; PUBLIC sees approved expertise/service fields only. Company membership never gives all staff access to every company’s student case.

| Stable field keys                                                                                            | Requirement/control                           | Options and validation                                                                                                                                                              |
|--------------------------------------------------------------------------------------------------------------|-----------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| counselor.entity_type, company.name, company.address                                                         | R Company/Individual; C company details       | Company requires legal name 200 and structured address. Named staff accounts, no shared login.                                                                                      |
| counselor.experience_band, .experience_years                                                                 | R band/numeric 0–80                           | Less than 2; 2 to 5; 5 to 10; 10 to 20; More than 20. Exact boundaries: \[0,2), \[2,5), \[5,10), \[10,20\], (20,80\].                                                               |
| counselor.experience_domains\[\]                                                                             | R multi-select                                | Full options below; one or more.                                                                                                                                                    |
| counselor.country, .residence, .address, .full_name, .phone, .whatsapp, .email, .social_links, .data_consent | R/C aliases                                   | Shared Module 1 validation; company country describes registration, residence describes individual staff location. Password/verification reuse account auth.                        |
| counselor.designation                                                                                        | R text 160                                    | Official professional role; not inferred from experience.                                                                                                                           |
| company.registration_id, .registration_jurisdiction                                                          | C text 160/country                            | Company official registration details, verification-only; supporting evidence attachment permitted.                                                                                 |
| counselor.country_expertise\[\], .region_expertise\[\], .specialization_fields\[\]                           | R at least one country/region and field       | Explicit country coverage or maintained region expansion; no expansion from free-text reputation claims. Fields use annex taxonomy.                                                 |
| counselor.certifications_training\[\]                                                                        | O repeated records, max 20                    | Each entered record R title/issuer; O date, expiry, evidence file/URL. Source examples British Council certification and ICEF training are labels, not default awarded credentials. |
| counselor.services\[\]                                                                                       | R multi-select                                | Admission guidance, SOP help, Visa prep, Career coaching, Scholarship search.                                                                                                       |
| counselor.partner_universities\[\]                                                                           | O max 10                                      | Institution reference or name plus optional evidence; label as declared unless verified.                                                                                            |
| company.team_size, counselor.case_capacity                                                                   | C company count 1–100,000; R capacity 1–1,000 | Capacity admin-approved, default 20; actual assignment count RO. Company headcount is not individual case capacity.                                                                 |
| counselor.associations\[\]                                                                                   | O max 10 names/evidence                       | NAFSA, ICEF, British Council or supplied Other; membership verification separate from selection.                                                                                    |
| counselor.client_demographics\[\]                                                                            | R multi-select                                | High school students, Undergraduate, Graduate, Professionals.                                                                                                                       |
| counselor.portfolio\[\], .testimonials\[\]                                                                   | O file/URL, max 10 each                       | Case studies/reviews require third-party permission and redaction; no full identifiable student files in public portfolio.                                                          |
| counselor.confidentiality_consent                                                                            | R checkbox/version                            | Separate professional obligation acknowledgment covering permitted use, confidentiality and deletion/access channels.                                                               |
| counselor.community_linkage                                                                                  | O Yes/No                                      | AKDN/Ismaili linkage verification-only; excluded from match score and professional approval threshold.                                                                              |
| counselor.referral_source, .referrer_reference                                                               | R dropdown; C reference                       | Admin-invited, Peer referral, Self-registration. Reference required for invitation/peer provenance when available; no point credit implied.                                         |
| counselor.registration_status, .decision_notice, .admin_comments                                             | RO status/notice; admin notes                 | Pending/Approved/Rejected display maps approval machine; seven-day supervisor escalation, approval GSC ID and minimal email/WhatsApp notices.                                       |

Experience-domain options: University Admissions; Career Counseling; SOP/Essay Support; Visa Guidance; Scholarship Guidance; Financial Advisory (Education-related); Student Mentorship; Academic Coaching; Industry-Specific Counseling. Industry-specific selection requires fields such as IT, Engineering, Health or Business from the explicit taxonomy. Passport status is not collected for counselors despite the repeated source row.

counselor.availability includes R timezone, weekday workday intervals, recurring slot windows and effective dates; O blackout dates and connected calendar. Interval end must exceed start; overnight availability is split at local midnight. Set calendar connection/sync state separately from availability. Professional suspension stops new matching and triggers safe reassignment review.

## Module 7: University, program and supporting catalog

Family: EDITOR edits source-backed drafts; catalog administrator approves publication. Each datum has provenance rather than one page-level claim that everything is verified. Public readers see published general information; completed CASE users see personalized calculations; chosen-country visa and application actions require completed counseling plus selected target.

### University and program fields

- university.name R text 240; .aliases\[\] O max 20; .country, .city, .state R country/city, O state; .type R Public, Private, Research, Community College.

<!-- -->

- university.latitude, .longitude O pair, ranges −90–90 and −180–180; .logo O image; .website_url R official public URL; .contact_email, .contact_phone, .contact_address O individually sourced contacts. Maps are external direction links, not a claimed routing engine.

- program.university_id, .name, .level, .field_id R; level Undergraduate, Masters, PhD, Certificate. .disciplines\[\], .specializations\[\] O catalog taxonomy. .duration_value R positive decimal ≤120; .duration_unit R Years, Months, Semesters; semester normalization needs sourced months/year.

- program.tuition.amount, .currency, .basis C when published cost known; basis Annual or Full course. .annual_tuition, .full_program_tuition are separately sourced or RO derived with stated constant-rate assumption. Never present a multiplication as an official full-course quote.

- program.minimum_grade.value, .scale, .equivalence_source C known minimum; preserve Percentage/GPA/Letter/institution scale and any official institution-specific equivalence. .prerequisite_subjects\[\] O sourced subject IDs, including Math, Physics, Biology.

- program.accreditation_status O Accredited, Pending, Not Accredited, Unknown; .accrediting_body C if Accredited/Pending, max 240. university.international_student_ratio O 0–100 with reference year and population scope.

- program.scholarship_availability R Yes, No, Limited, Unknown; .scholarship_ids\[\] O linked cards. Yes with no card can link official evidence instead; never fabricate a scholarship.

- program.intakes\[\] R when available: season Fall, Spring, Summer and/or official month/year; each .deadline has precision Exact date or Month, value, timezone and source. Month-only deadline cannot prove an application remains open throughout that month.

- program.study_modes\[\] R On-Campus, Online (distance study). .public_information_url R public official course page; .application_action_url O gated application destination. The same external address, if unavoidable, is classified by action context rather than pretending public URLs are secret.

- university.virtual_tour_url, .tour_video_url O reviewed external media; no autoplay with sound. .programs_offered RO relation; .ranking_summary and .tuition_summary RO published program projections.

**Removed, not collected:** acceptance_rate is expressly removed, including from ranking tie-breaks. visa_sponsorship_offered is expressly not needed. Work-Integrated Learning Internship/Co-op/Research/None remains a counselor discussion topic, not a structured catalog feature/filter. Work-during-study hours are retained in chosen-country guidance, not a universal university guarantee.

### Ranking and provenance records

ranking requires institution/program subject scope, provider QS/THE/Country-specific, edition year, rank representation Exact/Band/Unranked, published source URL and verification state. Exact rank is positive integer; band requires positive lower/upper with lower ≤ upper; Unranked has no fake numeric rank. O provider-specific score is stored only with its scale and source.

source_fact requires entity/field path, original value, source URL/title, source type Official university/Government/Ranking provider/University partner, retrieval timestamp, verification method Manual/Automated/University Partner, reviewer and last verified date for published values, and next review date. Automated extraction creates candidates; human review is still mandatory before publication. Quarterly review uses three calendar months; a changed critical fee/deadline triggers immediate review. Contradictory facts remain visible to editors with competing provenance; the approved value identifies why one prevailed.

### Entry requirements

requirements.minimum_grade reuses the program-grade record, not a second independently editable minimum. requirements.transcript_types\[\] includes High School, Bachelor, Diploma, Other with explanation. requirements.language_tests\[\] includes IELTS, TOEFL, PTE, Duolingo, Cambridge; each requires accepted variant, minimum total and any component thresholds in the published scale. Do not apply one IELTS threshold to all programs.

requirements.exemptions\[\] O text and official rule URL, covering university-defined English-medium education, recognized citizenship/schooling, partnerships/articulation or foundation routes only when sourced. requirements.other_documents\[\] includes SOP, LOR, Portfolio, Resume. requirements.conditional_admission O Yes/No/Unknown with .conditional_admission_terms C Yes. Every requirement has R criterion ID, description, applicability, hard/soft flag, evidence expectations and official rule; optional weight must be positive.

### Accommodation

accommodation.options\[\] R at least one of Dorm, Apartment, Family, Host Family for a published residence; Shared is a student preference mapped only where a residence explicitly offers shared occupancy. accommodation.name R 200; .cost_amount, .currency, .cost_basis C known price, basis Night or Month; .price_source_type R Residence quote or City estimate.

.meal_plan O Yes/No/Optional/Unknown; .meal_cost O money/basis and .meal_included_in_rent R when known. Private housing must not default to provided meals. .distance_to_campus O nonnegative km; .coordinates O valid coordinate pair and .distance_method C Straight-line/Official published estimate, never claimed travel distance without data.

.community_proximity\[\] O public place name/type, source and distance: Mandir, Masjid/Mosque, Jamatkhana, Embassy, Other. This is informational, not inferred religious targeting. .public_transport\[\] O Bus, Metro, None; None excludes others. Missing housing cost makes annual comparison unknown; city estimates must be explicitly labeled, not substituted silently.

### Visa and work guidance

visa.destination_country RO chosen target country; .study_level RO target level; .type R Student Visa, Exchange, Research, Short-term plus sourced official designation. .application_fee and .visa_fee O separate money records with USD and local-currency projections. .payment_info and .official_payment_url O text/URL; identifying the same fee by two names must not double-count it.

.documents\[\] includes Passport, Offer Letter, Financial Proof, Photos, Visa Form, Medical, Insurance and sourced Other. Each case checklist entry has status Not started, Preparing, Available, Reviewed, Not applicable; evidence O unless counselor explicitly requires it. .processing_time_min, .processing_time_max, .processing_time_unit O sourced range Days/Weeks; not a promised approval date.

.country_rules, .support_faq\[\], .reapplication_guidance O reviewed text; FAQs require question/answer and source. .work_hours_during_study O nonnegative numeric plus period, term/vacation conditions and source date; no static example “24 hours” used as default. .counselor_review_notes O assigned-counselor private text, with separate approved student-facing advice.

### URL-first scholarship cards

Required minimal metadata: scholarship.name (240), .official_url, .provider_name, .provider_type, .countries\[\], .eligible_levels\[\], .eligible_fields\[\], .availability_status, and complete provenance. Provider type University, Government, Private Foundation, NGO. Levels Undergraduate, Masters, PhD, Postdoc, Short course. Fields use taxonomy, explicitly retaining Engineering, Business, Arts, Medicine and Law. “All published fields/levels” is a supported explicit scope, not an empty selection interpreted as all.

All source extended fields are retained as **optional sourced metadata**, not a mandatory giant intake form:

- .type: Merit-based, Need-based, Country-specific, Program-specific, External.

<!-- -->

- .university_ids\[\]; .eligibility_criteria; .age_citizenship_restrictions (2,000 characters each).

- .coverage\[\]: Tuition, Books, Living expenses, Travel, Health insurance; .offered_breakdown\[\] stores named component, amount/percentage, currency and coverage period.

- .award_amount, .award_currency, .award_percent (0–100), .award_basis Annual/One-time/Full course; do not add amount and percentage as separate benefits unless the source says both.

- .duration: One-time, Annual renewal, Full course; .renewal_conditions text.

- .application_deadline date or documented month precision; .application_mode: Automatic, Separate application, University nomination.

- .application_fee money or explicit No fee/Unknown; .required_documents\[\]: Transcript, Recommendation letter, Statement of purpose, Financial proof, sourced Other.

- .contact_person_office and contact email/URL; .result_announcement_date; .notes text.

- .availability_status: Open, Closed, Upcoming, Unknown; sourced status may be overridden to Closed by a known passed exact deadline, with change history.

- .counselor_remarks private internal recommendation notes, never in public card metadata.

Unknown extended details show “Check official scholarship page”, not invented values. Open external official pages after an exit warning. GSC tracks saved guidance/roadmap tasks but has no scholarship submission, payment or award-decision system.

## Deterministic recommendations, affordability and assessment

### Recommendation set and ranking

Run against a versioned published catalog snapshot. Candidate programs must match target level and selected field; Masters discipline narrows only when decided. Exclude withdrawn programs. Unknown admission eligibility does not exclude discovery. Automatically selected candidates remain within ordered preferred countries; explicit manual choices can sit outside them with a visible mismatch explanation.

One recommendation slot represents one university with a representative matching program. Choose that program by exact discipline/specialization overlap, then comparable annual cost, rank and program UUID. recommendation.manual_ids\[\] preserves student selection order, maximum ten distinct universities. Saved items are separate university/program pairs, maximum three; review flags are a subset of those three.

Build the total set, stopping at ten:

1.  Add manual universities in order, resolving duplicate university IDs once.

<!-- -->

1.  Add one unseen university in the first manual university’s city; absent manual anchor, use the highest-priority preferred city. Skip when no anchor or candidate exists.

2.  Add one unseen university in the anchor country, or priority-one country without a manual anchor.

3.  Add up to four unseen candidates with the lowest known comparable annual costs.

4.  Add up to three unseen candidates with strongest comparable course rankings.

5.  Fill remaining slots with unseen candidates ordered by country priority, known annual cost, course rank and UUID. Unknown costs/ranks sort after known values within their respective comparisons.

City/country-stage candidates use that same deterministic ordering. Dedupe before counting a stage’s quota, so a duplicate does not consume a slot. If five manual choices occupy half the list, remaining stages are truncated at ten rather than returning fifteen. Empty catalogs show fewer records and the reason; never relax target level silently.

Annual-cost order is numeric first. To apply the source’s approximate-cost tie concept without nontransitive sorting, form bands anchored at the lowest remaining cost: include costs ≤110% of that anchor. Within a band, display course rank, then independently sourced city living cost, then country priority, then university UUID. Band construction is fixed before sorting. The four-lowest stage selects its four numeric-lowest candidates **before** display tie ordering, preserving the promised affordability selection.

A rank comparison uses one fixed context for the entire run: requested subject and latest represented QS subject edition first, otherwise latest represented THE subject edition, otherwise one country-specific provider for a single-country candidate pool. Records outside that context are noncomparable, sort after comparable ranks and cannot enter the strongest-rank stage. Never choose a different provider pair by pair. If no comparable scope exists, skip that stage and use deterministic fill. Institution overall rank is labeled separately, not masqueraded as a course rank. Bands compare lower then upper bounds; label uncertainty. No acceptance-rate or religious-proximity tie-breaker exists.

**SYNTHETIC selection example:** all fictional institutions offer the same Masters field in one comparable ranking edition. Manual A is added; B is the first eligible unseen institution in A’s city; C is the first unseen in A’s country. Remaining annual costs are D 10,000, E 10,500, F 11,000, G 12,000, H 20,000, I 21,000 and J 22,000 USD. The four cost picks are D/E/F/G. If course ranks are D 90, E 50, F 70 and G 60, the 10%-anchored first band displays E/F/D, then G. H/I/J, ranked 10/20/30, fill the rank stage. Final order is A, B, C, E, F, D, G, H, I, J. Saving A, E and H consumes all three saves; a fourth returns “Remove a saved program first.”

Preference edits create recommendation_run: queued → running → completed or failed; worker retries infrastructure failures, not invalid preferences. Keep the prior run visible as outdated until replacement succeeds. Never remove manual saves silently when preferences change; label mismatches and ask whether to retain them.

### Cost and FX snapshots

cost_snapshot stores source currencies/amounts, program/accommodation versions, annualization assumptions, horizon, FX provider/rate/date, calculation version and line-item inclusion flags. Annual comparison is tuition plus twelve monthly accommodation payments, not total attendance cost. Nightly accommodation requires a disclosed selected nights-per-month assumption; default 30 for estimates, labeled estimated.

Broader budget separately adds meals only if excluded from rent, transport, insurance, application/visa fees, travel and other explicitly entered sourced costs. Each line identifies annual/monthly/one-off basis. Scholarships offset covered expenses only when confirmed with usable evidence; a merely possible scholarship is a separate scenario. Do not count both a scholarship offset and the same deposited award as savings.

Convert original values using daily ExchangeRate-API USD snapshots, not a claimed Google rate. Rate age above 72 hours shows stale; absent rate yields Unknown, never 1: 1. Retain original amounts; calculations use unrounded decimals, display money to two decimals and readiness to one decimal. Readiness is 100 × available savings / net estimated expenses for the selected horizon. Zero/unknown denominator gives no score. Values above 100 remain numerically visible even if the progress bar caps at 100.

**SYNTHETIC budget:** tuition 18,000 USD plus accommodation 800 ×12 = 27,600 annual comparison. Meals 2,400, transport 1,200, insurance 600 and one-off visa/application costs 300 produce 32,100. Confirmed tuition scholarship 5,000 gives 27,100 net expense. Savings 240,000 fictional currency units at 0.10 USD/unit give 24,000 USD, so readiness is 100×24,000/27,100 = 88.5608856089…%, displayed 88.6%. Annual income is not added. Declining savings instead produces Unknown with the same budget.

### Self-assessment

Assessment is one university/program/intake at a time. Store assessment.requirement_version, each criterion’s weight, answer Meets/Does not meet/Unknown/Not applicable, evidence reference, verification state, explanation and author. Applicability exclusions must follow the published rule, not a convenient user tick. “Meets” requires usable data/evidence and verified comparison; missing/unverified evidence or unavailable grade equivalence is Unknown. User ticks record claims and do not bypass verification.

Use configured published criterion weights; otherwise equal weights with disclosure. Score is 100 times met applicable weight divided by total applicable weight. Also show known-weight coverage and possible upper bound including Unknown weights. With any mandatory criterion Unknown, label Provisional, not Likely eligible. Any hard criterion unmet overrides the numeric label to Requirements not met. Without those overrides: ≥85 Likely eligible, ≥60 and \<85 Possibly eligible, \<60 Requirements not met. Empty applicable requirements yield Unknown. These are self-check labels, never admissions probability or a university decision.

**SYNTHETIC assessment:** source-style weights GPA 20, standardized test 15, prerequisites 15, documents 10, language 20, deadline 20 total 100. All but the test meet, yielding 85. If test is a hard requirement and unmet, the result is Requirements not met despite 85. If test is Unknown, show provisional score 85, known coverage 85%, possible score 85–100 and request evidence. Only a verified non-hard unmet test allows the threshold-based Likely eligible label. Deadline awareness does not establish an unexpired deadline.

## Module 8: assignment, booking, sessions and advisory

### Counselor matching and assignment

Eligible counselors are approved, active, professionally verified, below approved case capacity and have a valid bookable slot within 60 days. Respect guardian authorization and service expertise. Score to 100: field overlap 30, country 20, availability 10, published rating 10, workload 30.

Field points are 30 × matched requested expertise tags / requested tags; tags are deduplicated field plus decided Masters disciplines. Explicit Undecided uses verified career-exploration expertise rather than a guessed subject. Country points use best covered priority: 20/15/10; otherwise 0. Region coverage uses a versioned explicit country mapping. Availability gives 10 for a valid slot within 14 days, otherwise 0. Rating gives 10 × published mean/5; fewer than five distinct valid student raters gets neutral 5. Workload gives 30 × (1 − active_cases/capacity), bounded 0–30. Ties resolve lower active/capacity, earliest slot, counselor UUID.

**SYNTHETIC match:** counselor A matches all fields 30, country-one 20, has a slot 10, rating 4.8 gives 9.6, workload 10/20 gives 15: total 84.6. Counselor B matches all fields 30, country-two 15, slot 10, insufficient rating 5, workload 2/20 gives 27: total 87. Student may choose A despite B’s higher score. Display component explanations, not the source’s unsupported example 95.

Assignment states: server unassigned → recommended; student/authorized guardian chooses → active, atomically reserving capacity. An optional suggested counselor is not a binding automatic choice. Student requests active → change_requested with R reason, category Service fit/Scheduling/Communication/Other/Safety and 2–2,000-character detail. Admin coordinates → handoff_pending → reassigned; capacity/access swap occurs transactionally. Declined request returns active with safe explanation; closure by counselor/admin moves active to closed.

Cancel or transfer future appointments with student confirmation during handoff; previous counselor retains only limited historical professional records, not future case access. New counselor receives approved advisories/tasks and authorized history, not all confidential notes. Improvement reason summary goes to the previous counselor; protected safety complaints go only to designated admin. A suspended counselor loses prospective access immediately while admin arranges the handoff.

### Booking dictionary and transitions

booking requires student/mentee, assigned counselor or accepted mentor, UTC start/end, both participant timezones, mode, topics and reminder preference. Topics: University Selection Guidance; Program & Field of Study Advice; Admission Requirements Review; Scholarship Options; Application Planning; Other with text. Mentor topics come from accepted request. booking.invited_parent_ids\[\] O only scoped verified relatives; conference_url, calendar_event_ids, link_status, reminder_status RO.

Virtual is the bookable mode. Source In-person remains available only for admin recording of a historical meeting, not an additional location-booking marketplace. Standard duration 30 minutes, buffer 15 minutes. Earliest start is the later of now+24 hours and next calendar day’s start in counselor timezone. Latest session must end 60 minutes before workday close. Display student local time and counselor timezone before confirmation. DST gaps are unbookable; repeated local times identify their UTC offset.

selected → held creates a five-minute transactional slot hold. Confirmation rechecks account/guardian/assignment, slot, calendar conflicts and one-active-appointment cap, then held → confirmed; expired hold → expired. One active counseling appointment and one active mentoring appointment are allowed separately. Concurrent confirmations cannot occupy overlapping buffered ranges. External calendar changes after confirmation raise a conflict for resolution, not silent cancellation.

Student can confirmed → rescheduled only at least 48 hours before start; create replacement confirmation and release old slot atomically. Otherwise offer cancellation or admin exception request. Cancellation anytime produces cancelled, labeled late within 24 hours; no monetary penalty. Admin exception records reason/actor. Reminders 24h/2h/10m honor channel preferences; changed bookings invalidate prior-version jobs. Calendar or meeting-link failure leaves booking confirmed with “Preparing link” or “Calendar sync needs attention”; retry integration independently.

### Session, recording and missed attendance

scheduled → waiting → in_progress → ended → completed uses authenticated joins, participant attendance intervals and counselor/mentor end action. Worker reconciles provider attendance; closing a browser alone cannot prove completion. At ten minutes after start, missing student or counselor triggers a provisional no-show; attendance reconciliation confirms student_no_show, counselor_no_show, both_no_show or attendance_disputed. Admin resolves disputes with evidence. Technical failure can become interrupted → rebooking_required, not a completed rewardable session.

Counselor absence sends admin escalation and student apology/rebooking. Student absence logs history and suggests rebooking; repeat absence prompts human scheduling review, not an invented financial penalty. Store actual start/end, participation durations, attendance outcome, booking timestamp and upload events for quality analytics.

Recording defaults off. not_requested → consent_requested → consented → recording → stopped requires all current participants and guardian authorization for minors. Anyone declining yields declined, while session/manual summary remains available. Late join pauses recording until fresh all-participant consent; withdrawal stops it immediately. Store consent events independently from provider media status. Raw recordings expire 30 days, transcripts 90 days; approved case/advisory history remains while account active, then deletion workflow 30 days subject documented holds.

### Notes, final advisory, feedback and tasks

session.private_notes O counselor-only 4,000 characters; gap_analysis.academic, .financial, .language O 2,000 each, separately marked private or approved shareable. university_fit.score R integer 1–5 when a fit recommendation is made, with R rationale 2,000 characters and university/program reference. Labels: 5 Excellent fit/Highly recommended; 4 Good fit/Recommended; 3 Moderate fit/Needs review; 2 Low fit/Not strongly recommended; 1 Very poor fit/Not recommended. Consider documented eligibility, budget, ranking, location, support and language gaps; do not assert acceptance probability.

advisory requires profile summary, approved guidance notes, university options, requirements/checklists, readiness notes, next action items and academic/guidance-only PDF. Scholarship suggestions and next proposed meeting are optional. PDF excludes confidential company matters, protected complaints and raw internal coaching. It states that guidance is indicative, not admission/visa guarantees.

Advisory states: awaiting_summary → draft by counselor or AI worker; responsible counselor moves draft → counselor_review → approved; delivery worker moves approved → delivered. Admin quality-flagged records route → admin_review → approved/changes_requested before delivery; ordinary records do not require redundant admin approval. Submit within 24 hours of completed session; overdue reminder at 24 hours and admin escalation 48 hours. Corrections create a new version and notice; older report remains clearly superseded. AI QA coaching and transcript are private staff artifacts, never the student PDF by default.

counseling_feedback student fields clarity, helpfulness, knowledge, relevance, overall experience are R integers 1–5, anchored Very poor/Poor/Neutral/Good/Excellent. Counselor fields preparation, document readiness, engagement, goal clarity use the same 5-point form, private to quality staff. O comment 2,000 characters. draft → submitted → published_aggregate_eligible after moderation; suspected abuse → held → eligible/excluded. One author/session, no rating without attended completed session. Only student ratings influence counselor published mean; missing answers prevent submission, not report access.

task requires title, student case, selected target/criterion or session reference, owner Student/Parent/Counselor, status and due date or explicit Awaiting date. O description 2,000 characters, evidence files and completion note. open → in_progress → submitted → completed by owner then counselor verifier; counselor submitted → changes_requested; owner resubmits. Admin/counselor can cancel with reason. Overdue is computed, not terminal. Date extension preserves old date/reason; no estimated date remains visibly Awaiting date and alerts counselor. Valid completion closes stale follow-up notices.

Booking confirmation includes an authenticated preparation checklist covering specialization tracks, curriculum by year, accreditation, switching programs, industry certifications, thesis/capstone/internship, prerequisites, essay review, translation/notarization, scholarship eligibility, work-hour rules, assistantships, refunds and graduate employment data. Follow-up choices are second counseling session, alumni mentorship, more university exploration or target roadmap/application steps. Application action and chosen-country visa guidance unlock only after completed counseling and explicit target selection.

## Learning, news and Alumni Journey Tracking

### Module 11: Learning and Development

learning_item requires title 160 characters, category, audience, summary 600 characters, ordered lessons/resources and publication state; O instructor, duration, thumbnail and source links. Categories: Interactive Tutorials/App Walk-throughs; Career & University Selection Courses; Counselor-led Video Lessons; Micro-Learning; Skill Development Tracks; Parent Guidance; Resource Library.

Tutorial audiences retain Students/Parents, Alumni/Mentors, Counselors, Overall and Marketing overview. Include registration/profile, country selection, university exploration, booking, application tracking, accepting requests, conducting sessions, summaries, availability, feedback, student-profile viewing, assigning universities and task management. Lesson topics retain application processes/timelines, SOP, interviews, scholarships, visa preparation, budgeting, cultural adaptation, communication, critical thinking, note taking and time management. Parent guidance covers university selection, finances, safety and expectations. Library types PDF, Template, Guide include SOP templates, resume samples, timelines and budgeting sheets.

learning_progress stores member/item/version, completed lesson IDs, resume position and completion timestamp. Member actions move not_started → in_progress → completed; reset is explicit. Video completion requires 90% viewed or accessible transcript completion; readings require Mark complete. New required lessons produce Updated content available, not retroactively invented assessment failure. No exams or accredited qualifications.

### Module 12: News Feed and publication

news_item requires title 160 characters, concise update 280 characters, topic, publisher attribution and source URL when factual; O image, related university/program/scholarship and event/deadline date. Responsive rendering approximates the source’s 2–3 lines without truncating essential deadlines. Topics retain admissions requirement changes, new scholarships, education fairs, new programs, application deadlines, intakes, open days, early-bird scholarships, deadline reminders, eligibility alerts, new app features, system improvements, webinars/workshops, alumni success and mentorship updates.

news_interaction records per-member save/unsave, like/unlike and followed topics with unique member/item keys. Sharing uses published URL or scoped authenticated link to parent/counselor; it grants no additional case access. University submissions enter via verified contributor provenance handled by counselor/admin, not a new university-role portal.

All public content uses draft → submitted → review → published → archived; author may withdraw before publication; reviewer may request changes/reject; scheduler may publish approved scheduled items. Published edits become new reviewable revisions. Ingestion queued → fetching → extracted → needs_review → accepted/rejected; failed retrieval records reason and permits manual sourced entry. No extraction automatically becomes published fact. Expired deadlines, broken sources and quarterly reviews create editorial work, not fabricated updates.

### Alumni Journey Tracking

Family: alumni/student SELF or explicitly authorized parent edits private self-reported milestones; assigned counselor sees scoped case progress; public publication requires separate subject permission and admin approval.

journey.visa_approved_date, .arrival_date, .university_start_date, .first_semester_completed_date, .internship_offer_date, .graduation_date, .first_job_offer_date are O past/current dates. first_semester.grade_value, .grade_scale or .standing Pass/Fail are C when semester outcome entered. internship.details O 2,000 characters; .relevance C Highly Relevant/Somewhat Relevant/Not Relevant when internship recorded. first_job.position, .company, .industry C on job milestone; industry uses annex. platform_influenced_university O Yes/No, never inferred attribution.

Journey state is not_started → active → graduated → employed, derived from available milestone reports, not a mandatory linear wizard. Earlier/later milestones may arrive out of order; contradictory dates prompt correction or documented exception, not invented chronology. Every milestone has self_reported → evidence_submitted → verified or disputed; only admin verifies. Removing/correcting a milestone recomputes state and analytics with history.

success_story requires title, story text up to 3,000 characters, selected shareable milestones and explicit publication/name/image scopes; mentor/parent involvement requires their separate consent. draft → submitted → consent_check → admin_review → published; rejection returns changes_requested; subject withdrawal unpublishes immediately. Private journey updates never notify a mentor about admission or employment without permission.

Time-to-internship uses start-to-offer days where both dates exist; time-to-placement uses graduation-to-first-offer, allowing clearly labeled pre-graduation offers. Report self-reported and verified denominators separately. These observations do not prove causal placement advantage. Becoming a mentor starts the Module 4 verification path.

## Taxonomy annex: complete supplied alumni options

Stable taxonomy IDs are immutable slugs scoped by family; duplicate labels in different branches remain separate IDs. Administrators may retire but not delete referenced terms. These are the supplied options, not a claim to cover every discipline.

**Alumni mentoring topics**

- Academic & University Support: Study skills & time management; Managing coursework & assignments; Choosing majors/minors; Handling academic pressure; Understanding grading systems.

<!-- -->

- Career & Professional Development: CV/Resume building; Internship search strategies; Part-time job tips; Networking & LinkedIn guidance; Industry insights (field-specific); Interview preparation.

- Life Abroad & Adjustment: Culture shock & adaptation; Local transportation & navigation; Food, groceries & daily routines; Managing homesickness; Making friends abroad.

- Financial & Practical Management: Budgeting abroad; Opening a bank account; Money-saving tips; Scholarships application guidance; Working while studying (rules & experience).

- Housing & Accommodation Support: How to choose safe areas; Dealing with landlords/leasing agreements; Living with roommates; Hidden costs to expect.

- Community & Networking: Joining clubs/societies; Meeting international students; University community resources; Weekend activities & safe travel.

- Wellbeing & Personal Growth: Wellbeing & Navigating Resources; Building confidence; Handling stress; Work–study–life balance.

- Post-Graduation Guidance: Job search after graduation; Post-study work visa process; Staying back versus returning home; Preparing for professional life abroad.

**Industry/job-sector options**

- Business & Management: Business Administration; Finance & Accounting; Banking & Investment; Marketing & Advertising; Human Resource Management; Entrepreneurship; Supply Chain & Logistics; Hospitality & Tourism Management.

<!-- -->

- Engineering & Technology: Mechanical Engineering; Electrical & Electronics Engineering; Civil Engineering; Chemical Engineering; Computer Engineering; Software Development/IT; Artificial Intelligence & Data Science; Cybersecurity; Robotics & Automation; Aerospace Engineering.

- Health & Life Sciences: Medicine; Nursing; Pharmacy; Dentistry; Public Health; Biotechnology; Biomedical Sciences; Nutrition & Dietetics; Physiotherapy.

- Social Sciences & Humanities: Psychology; Sociology; Anthropology; Political Science; International Relations; Education & Teaching; Social Work; History.

- Creative Arts, Media & Design: Graphic Design; Fashion Design; Architecture; Interior Design; Media & Communication; Film & Animation; Performing Arts.

- Law, Governance & Public Service: Law; Criminology; Public Administration; Public Policy.

- Science, Environment & Research: Physics; Chemistry; Mathematics; Environmental Science; Marine Science; Geology; Agriculture & Food Science.

- Business Tech & Emerging Fields: FinTech; E-commerce; Blockchain; Game Development; Cloud Computing.

- Trade, Technical & Vocational Fields: Aviation & Pilot Training; Automotive Technology; Culinary Arts; Health & Safety; Construction Trades; Other with explanation.

For student/counselor fields, category aliases retain STEM, Engineering, IT, Business, Arts, Medicine, Health and Law, mapped explicitly rather than by fuzzy matching. Supplied Masters STEM discipline leaves: Computer Science, Mechanical Engineering, Electrical Engineering, Civil Engineering, Biomedical Engineering, Data Science. Supplied Computer Science specialization leaves: Artificial Intelligence, Cybersecurity, Software Development, Game Development, Not yet decided. The maintained starter taxonomy also offers Other at each selectable field/discipline branch, requiring an entered label; until reviewed and mapped, that label never creates an exact-match bonus. Undecided remains available separately. Both the referenced discipline/specialization sheets and the ranking example sheet are absent from the supplied material. The deterministic algorithm and synthetic examples here are adopted implementation rules, not reconstructions falsely attributed to those sheets.

## Cross-cutting failure handling and synthetic ledger check

Attachment lifecycle: requested → uploading → quarantined → scanning → available, with failed/rejected/deleted branches. Validate size, actual file signature, malware and media duration, strip image location metadata, and produce accessible previews where supported. Users see progress and retry failed parts without duplicating attachment records. Pending/rejected files cannot be linked into delivered reports. Replacing evidence preserves authorized audit references; signed downloads expire and recheck permissions. Deletion/expired retention propagates to derivatives and provider copies, with failures queued for operator review.

Every consequential command has an idempotency key and transactional authorization. Offline users may draft text but cannot confirm bookings, link relatives, submit ratings, redeem points or assume an upload succeeded. Failed notifications stay queued with bounded retries and operator escalation; they do not reverse completed business actions. An unavailable assessment provider still permits official requirements viewing and manual counselor review. AI is optional drafting assistance, never the authority for approval, points, matching scores or publication.

**SYNTHETIC rewards:** twenty distinct approved, logged, rated 30-minute sessions with five verified mentees generate 20×25=500 points and 600 actual minutes, so the mentor earns Star, not Platinum, and a 10-hour certificate. One qualifying referral adds 25, giving 525. Reserving a 500-point recognition pack leaves 25 available and 500 reserved. Fulfillment records 500 redeemed and releases that reservation without a second debit; available remains 25. A duplicate session webhook adds 0. Six calendar months of qualifying inactivity expire the remaining 25 through an appended entry: available 0, lifetime earned 525, redeemed 500, expired 25.

Source conflicts are resolved, not left as product questions: ten total universities versus “ten other”; three saved pairs/review subset; 48-hour rescheduling versus 24 hours; guardian permission versus automatic parent attendance; optional recording versus automatic recording; verified unique mentees versus session-count tiers; sourced URL-first scholarships versus mandatory extended forms; optional finance versus mandatory parent participation; removed acceptance rate/visa sponsorship; real service hours versus a fixed 20-hour certificate. Missing taxonomy sheets, live catalog/license permissions, legal consent evidence and provider integration proofs remain implementation/release inputs, not unmade product choices.

# Global Student Cube: Backend Architecture and Implementation Contract

## Status, boundaries, and operating decisions

This is an authored implementation contract for a new application, not an existing codebase. The source framework and coordinated baseline govern. Limits, schemas, controls, and targets are adopted requirements. Vendor selection does not prove capability, licensing, availability, legal adequacy, performance, or pricing.

Build a TypeScript pnpm monorepo containing a Next.js responsive website, Expo React Native iOS and Android applications, a Next.js modular REST backend on Vercel, Supabase PostgreSQL/Auth/private Storage/Realtime, and a containerized Node durable worker on Render. PostgreSQL is authoritative. Do not introduce Redis, separate microservices, a payment gateway, commissions, subscriptions, or university-application submission automation. Use EU Frankfurt deployment locations where available; document every actual processing location and subprocessor before personal-data launch.

Public browsing remains independent of registration. All original named modules remain required, including learning, news, rewards, parental mentorship, alumni tracking, and imports. Source numbering jumps from 8 to 11; do not invent Modules9/10.

Expo documents workspace-based monorepo support; this supports the selected repository structure, not a claim that every dependency works unchanged on native platforms (Expo monorepo guide[^5]). Supabase’s Next.js quickstart documents cookie-based authentication, TypeScript/Tailwind setup, and row-level security; the stricter BFF and authorization design below remains an authored implementation requirement (Supabase Next.js quickstart[^6]).

### Repository and ownership

Owners below are responsibility groups. CODEOWNERS requires domain-owner and security review for authorization changes.

| Path                   | Responsibility and owner                                                | Allowed dependencies                      |
|------------------------|-------------------------------------------------------------------------|-------------------------------------------|
| apps/web               | Web team: public/member/counselor/admin routes, BFF, /api/v1 handlers   | Contracts, API client, server modules     |
| apps/mobile            | Mobile team: Expo iOS/Android, secure sessions, native navigation       | Contracts, API client, validation, tokens |
| apps/worker            | Platform team: leases, integration adapters, media, deletion, imports   | Server modules and job contracts          |
| packages/contracts     | API team: request/response schemas, generated OpenAPI, event schemas    | Pure TypeScript only                      |
| packages/domain        | Domain owners: deterministic rules, state machines, calculations        | Contracts and decimal/time utilities      |
| packages/server        | Backend team: repositories, ACL, transactions, provider interfaces      | Domain, database, adapters                |
| packages/database      | Data team: ordered SQL migrations, generated types, RLS tests, fixtures | No UI dependencies                        |
| packages/api-client    | Client platform team: pagination, retry, auth transport, error parsing  | Contracts                                 |
| packages/design-tokens | Design systems: colors, spacing, typography tokens                      | No server secrets or domain access        |
| packages/testing, ops  | QA/platform: contract fixtures, CI, infrastructure manifests, runbooks  | Explicit test-only dependencies           |

Inside packages/server/modules, create identity, cases, catalog, recommendations, finance-planning, mentorship, scheduling, messaging, advisory, rewards, learning, news, journey, administration, and integrations. Each exports application services and DTOs, not raw tables. A module cannot mutate another module’s tables directly; call its command service or publish a typed transactional event. Scheduling owns booking status; advisory cannot mark attendance simply because a report exists. Rewards consumes approved mentoring facts, never client-submitted point totals.

### Request and execution boundaries

Public server-rendered pages may cache published projections only. Private server components and handlers must resolve the current actor, use Cache-Control: private, no-store, and avoid shared fetch caches. Browser and native code render data, perform convenience validation, and manage drafts; neither computes authoritative eligibility, remaining shortlist capacity, permissions, spendable points, or availability.

Handlers execute this fixed pipeline: request ID, body-size limit, authentication, abuse limits, schema validation, resource authorization, command/query service, typed response, sanitized audit metadata. Database calls use short transactions and parameterized SQL. Vercel requests never perform long media processing, URL retrieval, AI generation, scheduled sleeping, or fire-and-forget jobs. They commit an outbox/job record and return 202 where work is asynchronous.

The Render worker uses bounded concurrency, durable leases, and scoped credentials. Separate notification/integration/media pools prevent media starvation of reminders. Native/web share the API; administrative workflows are web-only.

## Identity, relationships, and access control

### Authentication and activation

Supabase Auth owns password verification, email verification, refresh sessions, and TOTP enrollment. Never persist passwords in application tables, idempotency payloads, analytics, error tracking, or queue records. Enforce 12–128 characters, uppercase/lowercase/number/symbol, preserving internal spaces and never trimming the password. Permit paste and password managers. Normalize login email independently using a documented lowercase policy, retaining a verified display value. Immutable UUIDs are primary keys.

Registration states are email_pending, phone_pending, guardian_pending, review_pending, approved, rejected, suspended, and deletion_pending. Activation requires verified email, verified phone, required consent versions, role-specific completeness, and review approval. Staff additionally require current TOTP assurance for privileged operations. Phone OTP is contact verification, not two-factor login.

Twilio Verify is the selected SMS OTP contract: six digits, five-minute maximum lifetime, resend after 60 seconds, five attempts per challenge, five sends per phone per hour, plus IP/device abuse controls. Apply stricter provider constraints if encountered. Atomically increment attempts and send counters before invoking the provider. Bind a challenge to actor, normalized phone hash, purpose, and expiry. Successful verification consumes it once. Phone changes require fresh verification and invalidate the old verification state. No OTP value enters application logs.

Allocate the display identifier only during approval through a locked counter: GSC-000001 through GSC-999999, then GSC-A000001, continuing alphabetic namespaces deterministically. Never recycle values. Counter updates roll back with approval, and a unique constraint protects duplicate allocation. Email changes do not change UUID or GSC identifier.

Student/parent community eligibility is a self-declared pilot gate. No returns public guest access without creating a private registration/profile. Do not infer affiliation. Counselor eligibility is professional verification; community linkage is optional. Community responses and verification evidence belong only to verification staff, never search, ranking, general analytics, mentor profiles, or counselor matching.

Under-13 children have guardian-operated cases without independent Auth users. Ages 13–17 may authenticate only into restricted onboarding until verified guardian approval; no activated private contact or recording before that approval. Age is calculated from date of birth on the server, not submitted age. Turning 18 triggers a scope-renewal workflow: suspend inherited guardian scopes until the adult authorizes them. Do not silently retain guardian access indefinitely.

### Browser BFF and native sessions

Use a same-origin browser BFF. Store an opaque random session identifier in a \_\_Host-gsc_session cookie with HttpOnly, Secure, SameSite=Lax, path /, and no Domain attribute. Persist only its hash in web_sessions; encrypt provider refresh/access tokens server-side with a separately managed encryption key and key identifier. Never place browser tokens in localStorage, JavaScript-readable cookies, URLs, or HTML hydration payloads. Rotate the opaque session after login, privilege elevation, and refresh-token replacement.

State-changing browser requests require an unpredictable CSRF token bound to the session and submitted in X-CSRF-Token, exact allowed Origin validation, and accepted Fetch Metadata. Validate login/logout too. OAuth callbacks use one-use state, PKCE, a nonce where applicable, and exact redirect allowlists. Reject mixed browser-cookie plus native-bearer authentication rather than choosing an ambiguous principal.

Native stores refresh credentials only in OS-protected Keychain/Keystore-backed secure storage; keep access tokens in memory and clear both on logout. Do not persist sensitive API caches or tokens in AsyncStorage. Use system-browser authentication redirects with verified app/universal links and PKCE. A device backup must not restore reusable session secrets onto another installation. Device-local biometrics may unlock stored credentials, but do not substitute for server authentication or staff TOTP.

Verify signature, issuer, audience, expiry, session validity, and account status. Never trust client-editable metadata for roles. Adopt 15-minute access tokens,30-day member refresh inactivity,7-day staff refresh inactivity, and fresh MFA within 10 minutes for sensitive staff actions, exports, approvals, and privilege changes. Member exports require fresh authentication; staff additionally require MFA. Live revocation checks make suspension immediate.

CORS permits exact configured origins only, never wildcard credentials or arbitrary previews. Native bearer requests need no CORS exception; missing Origin is not authentication. Restrict methods/headers, include Vary: Origin, and reject unknown browser origins.

### Case-scoped permission model

Roles never confer access to all students. Each case holds one student’s history; parent grants are case-specific. Verify parent identity, relationship, and adult-student consent separately.

Scopes are profile.read, profile.write, finance.read, finance.write, shortlist.read, shortlist.write, booking.manage, report.read, task.read, task.write, and journey.read. Consent does not automatically add a parent to conversations, meetings, or every report. Creating a parent invitation uses a hashed one-use secret expiring in seven days, binds the intended verified email or account, and never resolves a relationship from surname or an entered email alone. Acceptance verifies both relationship policy and allowed scopes; the invite sender cannot approve their own guardian evidence.

Counselors receive only current assigned-case permissions. Mentors receive an approved mentee summary and their accepted conversation/session, not transcripts, academic evidence, financial information, or another mentor’s notes. Company affiliation does not let one counselor read colleagues’ cases. Staff permissions are granular: verification, catalog editorial, case oversight, safety, rewards approval, operations, and supervisor. Case oversight requires an expiring reasoned grant. Safety evidence is confined to safety staff.

Revoke relationship grants, conversation membership where derived, subscriptions, and unconsumed links transactionally. A revoked parent gets 404 for previously accessible case resources. Push delivery and Realtime events contain resource identifiers and invalidation hints, not case content. Every refetch rechecks current permissions.

## Relational schema and data classification

### Conventions and ER structure

Unless overridden, tables have id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), and version bigint NOT NULL DEFAULT 1 CHECK(version\>0). Immutable rows omit updated_at/version. Columns are non-null unless ?. text\[enum\] denotes a named SQL CHECK. JSON requires versioned schemas, shape/size checks, and rejection of unknown keys.

A, C, U, P, B, and F in table definitions mean FK to accounts(id), cases(id), universities(id), programs(id), bookings(id), and files(id). PK(x,y) replaces the default UUID primary key; UNQ is a unique constraint, and IDX is a required index. Add indexes on referencing FK columns unless already covered by a composite index prefix. FK deletion defaults to RESTRICT; the deletion workflow explicitly orders removal. Small private owned join rows may use CASCADE. Do not cascade-delete ledgers, approval events, audit events, or consent evidence.

Classifications: PUB is explicitly reviewed public information; PER is personal; SEN is restricted financial/identity/safeguarding information; OPS is confidential operational metadata. An entire row receives its strongest classification. Published projections omit private fields rather than relying on UI hiding.

ER: Auth user1: 1 account; account1:N roles/parent-links; account0: 1 owned student-case; case1:N academic-records/assignments/tasks; university1:N programs; case N:M programs through saved-options; booking1:N participants/consents/reports/feedback; mentor1:N contributions; reward-account1:N entries; content1:N revisions/engagements.

### Identity and case tables

| Table                | Columns and relations                                                                                                                                                                                                                                                                                    | Constraints, indexes, classification                                                                                                                                          |
|----------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| accounts             | id uuid PK; auth_user_id uuid? FK auth.users ON DELETE SET NULL; email_normalized text; status text; gsc_id text?; approved_at timestamptz?; last_signed_in_at timestamptz?                                                                                                                              | Separate UNQ(auth_user_id), UNQ(email_normalized), UNQ(gsc_id); CHECK auth_user_id IS NULL OR auth_user_id=id; status CHECK activation states; IDX(status,created_at,id); PER |
| account_roles        | account_id A; role text; granted_by A; revoked_at timestamptz?                                                                                                                                                                                                                                           | PK(account_id,role); CHECK student/parent/alumni/mentor/counselor/admin; OPS                                                                                                  |
| identities           | account_id A; full_name text; family_name text; parent_spouse_name text?; gender text; dob date; nationality char(2); residence_country char(2); city text; address jsonb; phone_cipher bytea; phone_hash text; whatsapp_cipher bytea?; social_urls jsonb; photo_id F?                                   | UNQ(account_id); validated country FKs; gender male/female/prefer_not_to_say; DOB not future via command; encrypted contacts; SEN                                             |
| verification_cases   | account_id A; community_cipher bytea?; professional_evidence jsonb; assigned_to A?; state text; submitted_at timestamptz; escalates_at timestamptz; internal_comment text?                                                                                                                               | IDX(state,escalates_at); pending/approved/rejected/needs_information; SEN                                                                                                     |
| consent_events       | subject_id A?; case_id C?; actor_id A; purpose text; policy_version text; decision boolean; evidence_hash text; occurred_at timestamptz                                                                                                                                                                  | Immutable; CHECK subject or case exists; IDX(case_id,purpose,occurred_at); SEN                                                                                                |
| web_sessions         | account_id A; session_hash text; provider_session_id text; tokens_cipher bytea; key_id text; csrf_hash text; expires_at timestamptz; revoked_at timestamptz?                                                                                                                                             | UNQ(session_hash); IDX(expires_at); never exposed; SEN                                                                                                                        |
| otp_challenges       | account_id A; phone_hash text; purpose text; provider_ref text?; attempts smallint; expires_at timestamptz; consumed_at timestamptz?                                                                                                                                                                     | CHECK attempts 0..5; IDX(phone_hash,created_at); no raw OTP; SEN                                                                                                              |
| cases                | student_account_id A?; operating_guardian_id A?; student_name text; student_dob date; passport_status text?; state text; module2_completed_at timestamptz?; module3_completed_at timestamptz?; selected_program_id P?                                                                                    | UNQ(student_account_id); CHECK at least one student/guardian; passport yes/no/in_process; IDX(state); SEN                                                                     |
| parent_links         | case_id C; parent_id A; kind text\[adult_authorized,verified_guardian\]; status text; authorized_by A?; verified_by A?; revoked_at timestamptz?                                                                                                                                                          | UNQ(case_id,parent_id); verification and authorization required before active; SEN                                                                                            |
| parent_invitations   | case_id C; inviter_id A; target_email_hash text; token_hash text; scopes text\[\]; expires_at timestamptz; accepted_at timestamptz?                                                                                                                                                                      | UNQ(token_hash); IDX(expires_at); no raw invite token; SEN                                                                                                                    |
| case_grants          | case_id C; account_id A; scope text; parent_link_id uuid? FK; assignment_id uuid? FK; expires_at timestamptz?; revoked_at timestamptz?                                                                                                                                                                   | PK(case_id,account_id,scope); IDX(account_id,case_id); scope CHECK; derived rows, no client writes; OPS                                                                       |
| staff_permissions    | account_id A; permission text; expires_at timestamptz?; granted_by A                                                                                                                                                                                                                                     | PK(account_id,permission); no self-grant; OPS                                                                                                                                 |
| academic_profiles    | case_id C; level text; education_years smallint; continuing_field boolean?; target_level text; field_ids uuid\[\]; discipline_ids uuid\[\]; specialization_ids uuid\[\]; intake_month smallint?; intake_year smallint?; intake_undecided boolean; career_goal text; accommodation text; intro_file_id F? | UNQ(case_id); years 0..40; month 1..12; goal max 200 words; taxonomy validation; PER                                                                                          |
| education_records    | case_id C; institution text; level text; country char(2); city text; board text; completion_year smallint; score_value text; score_scale text; evidence_id F?                                                                                                                                            | IDX(case_id,completion_year); no generic GPA conversion; SEN                                                                                                                  |
| test_results         | case_id C; test_type text; test_variant text; scale_code text; scale_version text; score numeric(8,3)?; reported_score text; subscores jsonb; comparable_total numeric(8,3)?; taken_on date; evidence_id F?; verification text                                                                           | Versioned test/scale validation; score null only for unparsed historical variants; preserve raw value; IDX(case_id,test_type); SEN                                            |
| student_activities   | case_id C; ordinal smallint; type text; name text; role text; duration_months smallint; hours_week numeric(5,2); achievements text?                                                                                                                                                                      | UNQ(case_id,ordinal); ordinal 1..5; hours 0..168; PER                                                                                                                         |
| student_awards       | case_id C; name text; outcome text\[received,not_granted\]; year smallint; amount numeric(20,6)?; currency char(3)?; evidence_id F?                                                                                                                                                                      | Paired amount/currency CHECK; amount \>=0; PER                                                                                                                                |
| country_preferences  | case_id C; country_code char(2) FK countries; priority smallint; cities jsonb                                                                                                                                                                                                                            | PK(case_id,country_code); UNQ(case_id,priority); priority 1..3; PER                                                                                                           |
| relative_connections | case_id C; relationship text; country char(2); city text                                                                                                                                                                                                                                                 | Optional; no relative contact collection; PER                                                                                                                                 |
| financial_profiles   | case_id C; occupation text?; income numeric(20,6)?; income_currency char(3)?; income_declined boolean; savings numeric(20,6)?; savings_currency char(3)?; savings_declined boolean; housing jsonb; sponsor_available boolean?; income_proof_available boolean?; completed_by A?                          | UNQ(case_id); amounts \>=0; declined implies null amount; paired currency; SEN                                                                                                |

Names allow multilingual letters, spaces, apostrophes, and hyphens, not digits/control characters. Require one declared social-profile URL without treating it as identity proof; underage users use guardian evidence instead and are never required to create social accounts. Confirm parsed name suggestions. Database commands validate taxonomy-array IDs; index implemented containment queries only.

Test DTOs include the stored variant, scale code/version and original reported value. TOEFL’s legacy total and 2026 band scale are distinct schemas as specified in the domain chapter; a report-provided comparable total is separate, not an inferred conversion. Entry-criterion JSON includes accepted scale/version and optional reviewed concordance revision. A mismatched or unknown scale yields manual review, not a numerical comparison across unlike scales.

### Catalog, matching, and financial snapshots

| Table                 | Columns and relations                                                                                                                                                                                                                            | Constraints, indexes, classification                                                                                |
|-----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------|
| countries, currencies | Country: code char(2) PK, name text, supported boolean; currency: code char(3) PK, name text, minor_units smallint                                                                                                                               | Reference data; minor units 0..4; PUB                                                                               |
| taxonomy_terms        | parent_id uuid? FK taxonomy_terms; kind text; code text; label text; active boolean                                                                                                                                                              | UNQ(kind,code); cycle prevention; PUB                                                                               |
| universities          | name text; slug text; aliases text\[\]; country char(2) FK; city text; state_region text?; type text; latitude numeric(9,6)?; longitude numeric(9,6)?; website_url text; logo_id F?; contacts jsonb; publication_state text                      | UNQ(slug); coordinates ±90/±180; IDX(country,city); PUB only when published                                         |
| programs              | university_id U; name text; level text; field_id uuid FK taxonomy_terms; duration_value numeric(6,2); duration_unit text; study_modes text\[\]; general_url text; accreditation jsonb; international_ratio numeric(5,2)?; publication_state text | UNQ(university_id,id); duration \>0; ratio 0..100; IDX(field_id,level); PUB                                         |
| program_action_links  | program_id P; application_url text; country_guidance_id uuid? FK                                                                                                                                                                                 | UNQ(program_id); separate gated relation, not public DTO; OPS                                                       |
| program_intakes       | program_id P; intake_year smallint; intake_month smallint; deadline_date date?; deadline_month smallint?; deadline_precision text\[day,month,unknown\]                                                                                           | UNQ(program_id,intake_year,intake_month); precision-consistent CHECK; PUB                                           |
| program_costs         | program_id P; academic_year text; fee_basis text\[annual,full_program\]; amount numeric(20,6); currency char(3) FK; residency_category text; source_fact_id uuid FK                                                                              | UNQ(program_id,academic_year,fee_basis,residency_category); amount \>=0; PUB                                        |
| accommodations        | university_id U; name text; type text; amount numeric(20,6)?; currency char(3)?; basis text\[monthly,nightly,unknown\]; meal_plan jsonb; distance_km numeric(9,3)?; transport text\[\]; proximity jsonb; source_fact_id uuid FK                  | CHECK nonnegative numeric values; explicit unknowns; PUB                                                            |
| entry_criteria        | program_id P; criterion_key text; kind text; requirement jsonb; mandatory boolean; weight numeric(10,4)?; source_fact_id uuid FK; revision integer                                                                                               | UNQ(program_id,criterion_key,revision); weight \>0 when configured; PUB                                             |
| rankings              | university_id U; program_id P?; publisher text; edition_year smallint; subject text; rank_min integer; rank_max integer?; licensed_source_id uuid FK                                                                                             | rank \>=1; max \>=min; UNQ with NULLS NOT DISTINCT across entity/publisher/year/subject; PUB subject to license     |
| scholarships          | name text; provider_name text; official_url text; type text; country_codes text\[\]; levels text\[\]; field_ids uuid\[\]; university_id U?; availability text; extended_details jsonb?; source_fact_id uuid FK; publication_state text           | UNQ(official_url); open/closed/upcoming/unknown; reviewed minimal metadata; PUB                                     |
| country_guidance      | country char(2) FK; study_level text; visa_category text; requirements jsonb; fee jsonb; processing_time text?; work_rules text?; faq jsonb; source_fact_id uuid FK                                                                              | UNQ(country,study_level,visa_category); no unsupported legal guarantees; OPS until target gate                      |
| fx_snapshots          | base char(3) FK; quote char(3) FK; rate numeric(24,12); rate_date date; fetched_at timestamptz; provider text                                                                                                                                    | UNQ(base,quote,rate_date,provider); rate \>0; immutable; PUB                                                        |
| recommendation_runs   | case_id C; profile_version bigint; catalog_revision bigint; rules_version text; input_hash text; explanations jsonb                                                                                                                              | IDX(case_id,created_at,id); immutable; PER                                                                          |
| recommendation_items  | run_id uuid FK; university_id U; program_id P; position smallint; reason text                                                                                                                                                                    | PK(run_id,university_id); UNQ(run_id,position); position 1..10; program belongs to university via composite FK; PER |
| saved_options         | case_id C; university_id U; program_id P; slot smallint; review_flag boolean                                                                                                                                                                     | UNQ(case_id,program_id); UNQ(case_id,slot); slot 1..3; composite program/university FK; PER                         |
| assessments           | case_id C; program_id P; criteria_revision integer; answers jsonb; weighted_score numeric(9,6)?; result text; rules_version text; provisional boolean                                                                                            | Score 0..100; results likely/possible/unmet/unknown; immutable revisions; SEN                                       |
| budget_snapshots      | case_id C; program_id P; horizon text; cost_lines jsonb; fx_ids uuid\[\]; annual_comparison_usd numeric(24,8)?; estimated_expense_usd numeric(24,8)?; readiness_percent numeric(24,8)?; financial_version bigint; warnings text\[\]              | Immutable; nonnegative known costs; explicit null readiness; SEN                                                    |

### Professionals, meetings, advisory, and messaging

| Table                       | Columns and relations                                                                                                                                                                                                                                                                                                                                                                                                                       | Constraints, indexes, classification                                                                                                                     |
|-----------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------|
| organizations               | name text; registration_cipher bytea; address jsonb; country char(2); verification_state text                                                                                                                                                                                                                                                                                                                                               | No organization-wide case access; SEN                                                                                                                    |
| counselor_profiles          | account_id A; organization_id uuid? FK; designation text; experience_years numeric(5,2); experience_band text; team_size integer?; expertise_fields uuid\[\]; countries text\[\]; domains text\[\]; services text\[\]; partner_universities uuid\[\]; associations text\[\]; demographics text\[\]; credentials jsonb; portfolio_files uuid\[\]; referral_source text; case_capacity integer; active boolean; published_fields jsonb        | UNQ(account_id); capacity \>0; partner universities max 10; professional review before active; PER                                                       |
| mentor_profiles             | account_id A; kind text\[alumni,parent,current_student\]; education_level text; university_id U?; university_other text?; course text?; graduation_year smallint?; graduation_status text; topics uuid\[\]; industry_ids uuid\[\]; organization text?; job_role text?; employer_url text?; portfolio_url text?; hours_month numeric(6,2); reflection text?; experience_years numeric(5,2); verified_at timestamptz?; published_fields jsonb | UNQ(account_id); completed alumni/current_student exactly3 topics; parent 1..3; hours \>=2; reflection \<=50 words; PER                                  |
| assignments                 | case_id C; counselor_id A; started_at timestamptz; ended_at timestamptz?; state text; handoff_report_id uuid? FK                                                                                                                                                                                                                                                                                                                            | Partial UNQ(case_id) where active; IDX(counselor_id,state); SEN                                                                                          |
| change_requests             | case_id C; assignment_id uuid FK; requester_id A; reason_category text; improvement_summary text?; safety_report_id uuid? FK; status text                                                                                                                                                                                                                                                                                                   | Full safety detail stored elsewhere; SEN                                                                                                                 |
| mentor_requests             | case_id C?; mentee_id A; mentor_id A; topics uuid\[\]; summary text; status text; accepted_at timestamptz?                                                                                                                                                                                                                                                                                                                                  | CHECK mentee !=mentor; pending/accepted/declined/closed; IDX(mentor_id,status); PER                                                                      |
| availability_rules          | host_id A; timezone text; weekday smallint; opens time; closes time; effective_from date; effective_to date?                                                                                                                                                                                                                                                                                                                                | weekday 0..6; closes \>opens; validate IANA zone; PER                                                                                                    |
| availability_exceptions     | host_id A; local_date date; kind text\[closed,override\]; intervals jsonb                                                                                                                                                                                                                                                                                                                                                                   | UNQ(host_id,local_date); timezone rules from host; PER                                                                                                   |
| bookings                    | case_id C?; mentee_id A?; host_id A; kind text\[counseling,mentoring\]; assignment_id uuid? FK; mentor_request_id uuid? FK; starts_at timestamptz; ends_at timestamptz; busy_range tstzrange; host_timezone text; topics text\[\]; reminder_overrides jsonb; status text; schedule_version bigint; late_cancel boolean                                                                                                                      | end=start+30min; counseling requires case/assignment; mentoring requires request and mentee OR guardian-operated case; active uniqueness/GiST below; SEN |
| booking_participants        | booking_id B; account_id A; role text; invited_by A; accepted_at timestamptz?; revoked_at timestamptz?                                                                                                                                                                                                                                                                                                                                      | PK(booking_id,account_id); guardian-operated child represented by case, not fake account; SEN                                                            |
| meeting_rooms               | booking_id B; provider text; external_id text?; state text; generation integer; expires_at timestamptz?                                                                                                                                                                                                                                                                                                                                     | UNQ(booking_id,generation); no reusable participant tokens; OPS                                                                                          |
| attendance_events           | booking_id B; participant_id A?; external_event_id text; event_kind text; occurred_at timestamptz; evidence_type text                                                                                                                                                                                                                                                                                                                       | UNQ(external_event_id); immutable; provider_verified/manual_reviewed; PER                                                                                |
| recording_consents          | booking_id B; participant_id A; roster_version bigint; decision boolean; guardian_consent_event_id uuid? FK; occurred_at timestamptz                                                                                                                                                                                                                                                                                                        | Immutable; IDX(booking_id,roster_version,participant_id,occurred_at); SEN                                                                                |
| recordings                  | booking_id B; file_id F?; roster_version bigint; state text; started_at timestamptz?; stopped_at timestamptz?; delete_after timestamptz                                                                                                                                                                                                                                                                                                     | Only consent-authorized segments; SEN                                                                                                                    |
| transcripts                 | booking_id B; recording_id uuid FK; file_id F; language text; delete_after timestamptz; ai_run_id uuid FK                                                                                                                                                                                                                                                                                                                                   | Private, never public indexed; SEN                                                                                                                       |
| advisory_reports            | case_id C; booking_id B; author_id A; revision integer; status text\[draft,review,approved,withdrawn\]; shareable_body jsonb; pdf_file_id F?; approved_by A?; approved_at timestamptz?; ai_run_id uuid? FK                                                                                                                                                                                                                                  | UNQ(booking_id,revision); approval requires reviewer and immutable body; SEN                                                                             |
| private_notes               | case_id C; booking_id B?; author_id A; body_cipher bytea                                                                                                                                                                                                                                                                                                                                                                                    | Author only while authorized; exceptional safety access separately audited; SEN                                                                          |
| qa_feedback                 | booking_id B; counselor_id A; body jsonb; ai_run_id uuid? FK; review_state text                                                                                                                                                                                                                                                                                                                                                             | Counselor plus designated QA staff only; SEN                                                                                                             |
| tasks                       | case_id C; report_id uuid? FK; program_id P?; criterion_id uuid? FK; owner_id A; created_by A; title text; description text; status text; due_at timestamptz?; estimated_delivery_at timestamptz?; evidence_id F?; reviewed_by A?                                                                                                                                                                                                           | open/in_progress/submitted/completed/blocked; IDX(case_id,status,due_at); SEN                                                                            |
| feedback_responses          | booking_id B; author_id A; direction text; questionnaire_version text; answers jsonb; overall numeric(3,2)?; publication_state text                                                                                                                                                                                                                                                                                                         | UNQ(booking_id,author_id,direction); overall 1..5; preserve source scales; SEN                                                                           |
| mentor_logs                 | booking_id B; mentor_id A; mentee_id A; good_point text; improvement_point text; verified_minutes integer?; approved_by A?; approved_at timestamptz?                                                                                                                                                                                                                                                                                        | UNQ(booking_id); verified minutes 0..actual reviewed duration; PER                                                                                       |
| conversations               | case_id C?; mentor_request_id uuid? FK; kind text\[counselor,parent,mentor\]; closed_at timestamptz?                                                                                                                                                                                                                                                                                                                                        | Bound to valid relationship; no arbitrary public room; PER                                                                                               |
| conversation_members        | conversation_id uuid FK; account_id A; joined_at timestamptz; left_at timestamptz?; can_send boolean                                                                                                                                                                                                                                                                                                                                        | PK(conversation_id,account_id); IDX(account_id,left_at); PER                                                                                             |
| messages                    | conversation_id uuid FK; sender_id A; client_message_id uuid; body text?; file_id F?; removed_at timestamptz?                                                                                                                                                                                                                                                                                                                               | UNQ(sender_id,client_message_id); text or file required; IDX(conversation_id,created_at,id); SEN                                                         |
| safety_reports, user_blocks | Report: reporter_id A, subject_id A, case_id C?, evidence jsonb, state text; block: blocker_id A, blocked_id A                                                                                                                                                                                                                                                                                                                              | Report IDX(state,created_at); block PK(blocker_id,blocked_id), no self-block; SEN                                                                        |

### Rewards, content, and operations

| Table                       | Columns and relations                                                                                                                                                                                                                | Constraints, indexes, classification                                                                   |
|-----------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| reward_accounts             | account_id A; available integer; reserved integer; last_qualifying_at timestamptz; activity_version bigint; expiry_processed_version bigint?                                                                                         | UNQ(account_id); balances \>=0; derived caches reconciled to ledger; PER                               |
| reward_entries              | account_id A; kind text; available_delta integer; reserved_delta integer; source_key text; reversal_of uuid? FK reward_entries; effective_at timestamptz; metadata jsonb                                                             | UNQ(account_id,source_key); immutable; nonzero effect; constrained delta patterns; PER                 |
| mentor_supported_people     | mentor_id A; mentee_subject_id uuid FK reward_subjects; first_log_id uuid FK mentor_logs                                                                                                                                             | PK(mentor_id,mentee_subject_id); unique-person tier basis; PER                                         |
| reward_subjects             | account_id A?; case_id C?; verified_at timestamptz                                                                                                                                                                                   | Exactly one account/case; unique each nullable key; guardian-operated students identified by case; PER |
| referrals                   | referrer_id A; referred_id A; code text; status text; qualified_at timestamptz?                                                                                                                                                      | UNQ(referred_id); CHECK referrer !=referred; IDX(referrer_id,status); PER                              |
| reward_catalog              | code text; name text; points integer; kind text; enabled boolean; inventory integer?; fulfillment_policy jsonb                                                                                                                       | UNQ(code); points \>=500; inventory \>=0; recognition pack initially500; PUB                           |
| redemptions                 | account_id A; catalog_id uuid FK; points integer; status text; fulfillment_ref text?; certificate_file_id F?; requested_at timestamptz; completed_at timestamptz?                                                                    | points \>=500; reserved/processing/fulfilled/rejected/cancelled; IDX(status,requested_at); PER         |
| content_items               | kind text\[learning,news,story,spotlight,event_invitation,tour,testimonial\]; slug text; author_id A; status text; current_revision integer; audience_roles text\[\]; topic_ids uuid\[\]; published_at timestamptz?                  | UNQ(slug); draft/review/published/withdrawn; IDX(kind,status,published_at,id); PUB projection          |
| content_revisions           | item_id uuid FK; revision integer; title text; summary text; body jsonb; source_urls text\[\]; reviewed_by A?; subject_consents uuid\[\]; submission_origin text; verified_institution text?                                         | PK(item_id,revision); sanitized content; immutable after publication; PER until reviewed               |
| learning_units              | item_id uuid FK; parent_unit_id uuid? FK; category text; ordinal integer; duration_seconds integer?; asset_id F?; external_url text?                                                                                                 | UNQ(parent_unit_id,ordinal); seven source categories; no exams; PUB                                    |
| learning_progress           | account_id A; unit_id uuid FK; revision integer; position_seconds integer; completed_at timestamptz?                                                                                                                                 | PK(account_id,unit_id,revision); position \>=0; PER                                                    |
| content_engagements         | account_id A; item_id uuid FK; kind text\[save,like\]                                                                                                                                                                                | PK(account_id,item_id,kind); own records only; PER                                                     |
| topic_follows               | account_id A; topic_id uuid FK taxonomy_terms                                                                                                                                                                                        | PK(account_id,topic_id); PER                                                                           |
| journey_milestones          | case_id C; kind text; occurred_on date?; date_precision text; details jsonb; evidence_id F?; self_reported boolean; public_consent_id uuid? FK                                                                                       | IDX(case_id,kind); no automatic public publication; SEN                                                |
| files                       | owner_id A; case_id C?; purpose text; object_key text; size_bytes bigint; declared_mime text; detected_mime text?; sha256 text?; state text; delete_after timestamptz?                                                               | UNQ(object_key); size \>0; pending/quarantined/clean/rejected/deleted; SEN by default                  |
| source_documents            | canonical_url text; official_host text; retrieved_at timestamptz; content_hash text; snapshot_file_id F?; permission_basis text; method text; http_status smallint; license_ref text?                                                | IDX(canonical_url,retrieved_at); immutable; OPS                                                        |
| source_facts                | document_id uuid FK; entity_type text; entity_id uuid; field_path text; value_json jsonb; excerpt text; verified_by A?; verified_at timestamptz?; next_review_at timestamptz                                                         | IDX(entity_type,entity_id,field_path); entity target checked in publication command; OPS/PUB excerpt   |
| import_batches, import_rows | Batch: actor_id A, kind text, source_file_id F?, status text, mapping_version text; row: batch_id uuid FK, row_number integer, external_key text, normalized jsonb, errors jsonb, status text                                        | Row UNQ(batch_id,row_number); explicit mapping, no raw live writes; OPS                                |
| ai_runs                     | purpose text; case_id C?; input_hash text; provider text; model_config text; prompt_version text; state text; output_file_id F?; safety_flags jsonb; expires_at timestamptz?                                                         | No identity in trace labels; IDX(state,created_at); SEN                                                |
| notification_preferences    | account_id A; category text; channel text; enabled boolean; consent_event_id uuid? FK                                                                                                                                                | PK(account_id,category,channel); WhatsApp requires opt-in; PER                                         |
| notifications               | account_id A; template text; resource_type text; resource_id uuid; read_at timestamptz?; event_key text                                                                                                                              | UNQ(account_id,event_key); IDX(account_id,created_at,id); minimal content; PER                         |
| notification_deliveries     | notification_id uuid FK; channel text; status text; provider_id text?; attempts integer; last_error_code text?                                                                                                                       | UNQ(notification_id,channel); provider IDs unique when non-null; OPS                                   |
| calendar_connections        | account_id A; provider text\[google,microsoft\]; tokens_cipher bytea; key_id text; scopes text\[\]; state text; sync_cursor_cipher bytea?                                                                                            | UNQ(account_id,provider); SEN                                                                          |
| calendar_events             | connection_id uuid FK; booking_id B; external_id text?; applied_schedule_version bigint; state text; etag text?                                                                                                                      | UNQ(connection_id,booking_id); OPS                                                                     |
| jobs                        | type text; payload jsonb; dedupe_key text; state text; run_at timestamptz; attempts integer; lease_owner text?; lease_until timestamptz?; lease_generation bigint; last_error_code text?                                             | UNQ(dedupe_key); partial IDX(run_at,id) queued; IDX(lease_until) running; OPS                          |
| outbox_events               | aggregate_type text; aggregate_id uuid; aggregate_version bigint; event_type text; payload jsonb; dispatched_at timestamptz?                                                                                                         | UNQ(aggregate_type,aggregate_id,aggregate_version,event_type); immutable payload; OPS                  |
| webhook_receipts            | provider text; event_id text; payload_cipher bytea; received_at timestamptz; verified_at timestamptz; processed_at timestamptz?                                                                                                      | UNQ(provider,event_id); short retention; OPS                                                           |
| idempotency_records         | actor_key text; method text; path_hash text; key text; request_hash text; response_cipher bytea?; http_status integer?; expires_at timestamptz                                                                                       | UNQ(actor_key,method,path_hash,key); no passwords/tokens; OPS                                          |
| audit_events                | actor_id A?; action text; resource_type text; resource_id uuid?; reason text?; request_id text; occurred_at timestamptz; safe_diff jsonb                                                                                             | Append-only; IDX(resource_type,resource_id,occurred_at); no raw sensitive values; OPS                  |
| data_requests, legal_holds  | Request: account_id A, kind text\[export,delete\], state text, due_at timestamptz, manifest jsonb; hold: resource_type text, resource_id uuid, reason_cipher bytea, authorized_by A, review_at timestamptz, released_at timestamptz? | IDX(state,due_at); holds safety/privacy staff only; SEN                                                |

Add platform_counters(name text PK,next_value bigint CHECK(next_value\>0)), abuse_buckets(key_hash text PK,window_start timestamptz,count integer,expires_at timestamptz), and approved_hosts(host text PK,path_prefixes text\[\],permission_basis text,reviewed_by uuid FK accounts,expires_at timestamptz) as OPS infrastructure tables. Publication revisions have monotonic catalog revision counters for reproducible recommendations.

Add registration_intents(id uuid PK,intent_key text UNIQUE,email_hash text,payload_hash text,state text,auth_user_id uuid?,expires_at timestamptz) for provisioning reconciliation; exclude passwords and raw registration payloads. Account UUID initially equals Auth UUID by enforced CHECK. Deletion may retain an anonymized, nonapproved account tombstone with null Auth reference, preserving nonidentifying ledger relationships without preventing Auth deletion.

## Database enforcement and sensitive resource security

Enable RLS on every application table, including new tables before granting access. Revoke direct mutation privileges from Supabase anon and authenticated. Private data is accessed through the API; the public API returns explicit approved DTOs. Place transactional command functions in an unexposed commands schema with EXECUTE granted only to gsc_api_executor. Revoke function EXECUTE from PUBLIC and browser roles. A separate gsc_worker role can claim jobs and call named integration commands, not arbitrary case queries.

After Supabase verification, the trusted executor begins a transaction and uses parameterized SELECT set_config('request.jwt.claims',\$1,true) with server-constructed JSON containing verified sub, session ID, and assurance. Never copy request claims or submitted actor IDs. Execute the command and commit/rollback before returning the connection. Clients possess neither executor credentials nor RPC permission; pooled transactions cannot inherit actor context. Privileged SQL commands additionally check live staff permission, account status, and verified MFA assurance. Recompute effective grants from all still-valid ownership/relationship/assignment sources when any source is revoked.

ACL helpers are narrow SECURITY DEFINER functions owned by a non-login ACL owner, with a fixed empty search path and fully qualified names. That owner reads grant tables without their recursive policies; it is not an application superuser. Command owners retain RLS on case data unless a specific routine needs elevated mutation, in which case it must repeat explicit actor/resource authorization. FORCE RLS is used on case tables; document and test any exception. Do not assume RLS constrains Supabase service-role access.

> CREATE FUNCTION private.has_case_scope(p_case uuid, p_scope text)
>
> RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
>
> SET search_path = '' AS \$\$
>
> SELECT EXISTS (
>
> SELECT 1 FROM app.case_grants g
>
> JOIN app.accounts a ON a.id = g.account_id
>
> WHERE g.case_id = p_case AND g.account_id = auth.uid()
>
> AND g.scope = p_scope AND g.revoked_at IS NULL
>
> AND (g.expires_at IS NULL OR g.expires_at \> now())
>
> AND a.status = 'approved'
>
> );
>
> \$\$;
>
> REVOKE ALL ON FUNCTION private.has_case_scope(uuid,text) FROM PUBLIC;
>
> GRANT EXECUTE ON FUNCTION private.has_case_scope(uuid,text)
>
> TO gsc_api_executor, gsc_case_command_owner;
>
> ALTER TABLE app.financial_profiles ENABLE ROW LEVEL SECURITY;
>
> ALTER TABLE app.financial_profiles FORCE ROW LEVEL SECURITY;
>
> CREATE POLICY finance_read ON app.financial_profiles FOR SELECT
>
> USING (private.has_case_scope(case_id,'finance.read'));
>
> CREATE POLICY finance_write ON app.financial_profiles FOR UPDATE
>
> USING (private.has_case_scope(case_id,'finance.write'))
>
> WITH CHECK (private.has_case_scope(case_id,'finance.write'));
>
> ALTER TABLE app.advisory_reports ENABLE ROW LEVEL SECURITY;
>
> CREATE POLICY report_read ON app.advisory_reports FOR SELECT USING (
>
> (status='approved' AND private.has_case_scope(case_id,'report.read'))
>
> OR (author_id=auth.uid()
>
> AND private.has_case_scope(case_id,'advisory.author'))
>
> );

Add internal scopes advisory.author, case.oversight, and qa.read, never parent-invitable. Grant case ownership only after activation. These SQL patterns require separate INSERT/DELETE/grant tests. Draft access requires authorship and live assignment; QA/private notes need separate policies. Handoffs share approved content, not old notes.

Child commands constrain id and case_id; case reassignment is prohibited. Add parent (id,case_id) unique keys and child composite report/booking FKs. Bind messages to conversations and validate attachment owner/case. An inserted file UUID never grants download permission.

Storage buckets remain private. Upload initialization checks purpose, actor, case, quota, MIME allowlist, and declared length. Adopt limits: PDF/images 20 MB, profile images 5 MB, introduction MP4 100 MB and 60 seconds, advisory PDF 20 MB. Recording limits are separately configured by session duration. Generate random object keys without names/email/GSC IDs and a five-minute upload authorization for one object. Uploads enter quarantine. Completion checks actual bytes, magic signature, checksum, size, decompression limits, and media duration; a sandboxed scanner with no case credentials detects malware and strips image metadata. Reject active HTML/SVG, executable content, password-protected documents that cannot be inspected, and archive bombs. Scanner outage means pending, not clean.

Download authorization rechecks the resource ACL and clean status, then issues a 60-second signed URL with attachment disposition. Log issuance, not the URL. Do not email signed files. Especially sensitive evidence uses authenticated API streaming when immediate revocation is required; previously issued storage URLs remain bearer credentials until expiry. Purge orphan uploads after 24 hours. Public logos/learning assets are reviewed derivative copies, never the original private object. Keep service-role credentials only inside isolated Auth provisioning and Storage adapters with fixed operations; never use them for ordinary case reads, exports, or browser requests.

## Transactional domain behavior

### Profiles, recommendations, assessment, and budgets

Module 2 completion requires validated academic data and exactly three ordered countries, or the number supported if the catalog has fewer than three. Drafts permit incompleteness. Module 3 can be completed by an independent adult student or a scoped linked parent. Explicitly declined optional financial figures count as valid completion. Completion unlocks personalized budgets and saving; parent sharing additionally requires an active authorized parent. Incomplete approved members still receive public fee ranges.

Recommendation runs snapshot profile, catalog, FX, and rules versions. Produce at most ten distinct universities: ordered manual choices first; then same-city, same-country, four cheapest comparable annual options, and up to three strongest course-ranking options, skipping duplicates and filling deterministically from the eligible pool. Each slot has a representative program, with other program records attached rather than consuming extra university slots. If manual choices occupy all ten slots, no extra suggestions appear. Use actual available catalog coverage, not invented results.

Annual comparison equals annual tuition plus twelve times monthly accommodation. Full-program tuition without a published annual basis and nightly accommodation without a sourced monthly conversion are noncomparable. Do not divide blindly. Sort cheapest by exact decimal cost; ties use comparable course ranking, sourced city living cost, preferred-country priority, then immutable university UUID. Do not use the removed acceptance-rate field or community affiliation. Missing ranking is unknown, not last place presented as a numerical rank.

Assessment stores criterion answers as met/unmet/unknown with verification/source status. Mandatory unmet criteria override an otherwise high score; mandatory unknown criteria make the result provisional. For fully evaluated criteria, score is earned weight divided by total weight times 100; thresholds are 85 and 60. If weights are unconfigured, apply equal weights and disclose that rule. Results are self-check guidance, never admission probabilities. No generic GPA conversion or AI-generated ticks. Counselor university-fit rating remains separately 1–5.

Budget lines distinguish tuition, accommodation, meals, transport, insurance, visa/application fees, travel, and other sourced assumptions. A meal included in accommodation is not added again. Retain original amounts/currencies and reference USD rate snapshots. ExchangeRate-API is selected for daily FX; mark rates older than 72 hours stale. Readiness is savings/reserves divided by chosen-horizon estimated expense times 100, initially the first academic year. Income is not savings. Apply a confirmed scholarship once as an expense offset, not again as available reserves. Unknown savings or missing/zero expense yields null readiness; values over 100 remain accurate. Calculate decimals without intermediate rounding; round only presentation.

Saving locks the case row, checks Module 3 completion, allocates one of three saved slots, verifies the program belongs to its university, and writes audit/outbox records in one transaction. A flagged counselor-review option must be a saved row; therefore at most three can be flagged. Recommendation membership is not a fourth saved slot. Concurrent clients cannot exceed the cap; identical program adds return the existing row.

### Matching, booking, and safe handoff

Counselor matching first excludes unapproved, inactive, full-capacity, or unavailable professionals. Score field overlap 30\*matched/requested, country best priority 20/15/10, available slot within 14 days 10, published rating 10\*mean/5, and workload 30\*(1-active_cases/capacity) bounded 0..30. Use neutral five rating points until at least five published completed-session ratings, an adopted anti-small-sample default. Student chooses the final counselor; selection locks the counselor capacity row and case before assignment.

Create a booking with server-generated 30-minute end time. The earliest start is the later of now plus 24 hours and next calendar midnight in host timezone. Availability rules use IANA zones, materialize UTC instants, skip nonexistent daylight-saving times, and distinguish duplicate local times by offset. End no later than 60 minutes before the host workday closes. Store busy range as \[start,end+15 minutes) so consecutive sessions have a 15-minute gap, not an accidental 30-minute gap.

> CREATE UNIQUE INDEX one_active_counseling
>
> ON app.bookings(case_id)
>
> WHERE kind='counseling' AND status IN ('confirmed','in_progress');
>
> CREATE UNIQUE INDEX one_active_mentoring
>
> ON app.bookings(mentee_id)
>
> WHERE kind='mentoring' AND status IN ('confirmed','in_progress');
>
> CREATE UNIQUE INDEX one_active_guardian_case_mentoring
>
> ON app.bookings(case_id)
>
> WHERE kind='mentoring' AND mentee_id IS NULL
>
> AND status IN ('confirmed','in_progress');
>
> ALTER TABLE app.bookings ADD CONSTRAINT host_no_overlap
>
> EXCLUDE USING gist (host_id WITH =, busy_range WITH &&)
>
> WHERE (status IN ('confirmed','in_progress'));

Provision the required GiST equality operator support through a migration and verify it in staging. The command locks case or mentee, host, and booking in deterministic order, validates fresh availability/capacity, inserts participants and outbox events, and commits. Constraint conflicts become 409 SLOT_UNAVAILABLE or ACTIVE_BOOKING_EXISTS. Conferencing provisioning follows asynchronously; a preparing link does not mean an unconfirmed booking. Add participant overlap checks so a user cannot simultaneously attend different hosts.

For under-13 mentoring, mentee_id is null and case_id is mandatory. The server derives that identity from the verified guardian-operated case, locks the case, and applies the case-specific unique index; a client cannot choose null to bypass the account cap. The guardian is the authenticated participant/request initiator, not a substitute mentee identity. Both index predicates cover confirmed/in-progress states. Bind busy_range by CHECK to tstzrange(starts_at,ends_at+interval '15 minutes','\[)').

Rescheduling updates the existing booking atomically, requires at least 48 hours before the original start, validates the replacement slot, increments schedule_version, and replaces reminder jobs. Cancellation is allowed anytime before completion, with late-cancel label below 24 hours and no financial penalty. Audited admin exceptions require reason and fresh MFA; database overlap constraints are never bypassed. Calendar failure never cancels the authoritative booking.

Completion requires reviewed attendance, not a client timer alone. confirmed → in_progress → completed and confirmed → cancelled/no_show are controlled transitions. Provider outage leaves attendance unresolved for manual review, not automatic blame. Summary reminders begin after completion and escalate after the adopted 24-hour counselor-summary target. Counselor change records the reason, handles future bookings explicitly, publishes a safe handoff, and changes grants atomically. Full safety complaints never enter the departing counselor’s improvement summary.

### Reward ledger and idempotency

Lock reward_accounts for every earn/reserve/release/fulfill/expire operation. Qualifying mentoring earns 25 once when a completed session has a log, mentee rating, and admin approval. Use mentor-session:{bookingUUID} as unique source key. Referral earns 25 once after the referred approved student completes Modules 2 and 3; block self-referral, duplicate identity abuse, and duplicate referred accounts. Suspected abuse enters review without automatic protected-attribute inference.

Ledger delta patterns are earn (+25,0), reserve (-cost,+cost), release (+cost,-cost), fulfill (0,-cost), expire (-remaining,0). Corrections append linked compensating entries approved by rewards staff. Reject updates/deletes through database privileges and triggers. The transaction updates cached balances, inserts the immutable entry, and writes outbox events; nightly reconciliation recomputes sums and freezes redemption on mismatch.

Redemption validates catalog enabled status, cost at least 500, balance, and inventory while locking both account and catalog row. Initially only the 500-point certificate-plus-letter recognition pack is enabled. Gift cards remain disabled until funded inventory and fulfillment acceptance tests exist; when enabled display 10–12 working days, never instant delivery. Reservation prevents simultaneous overspending; fulfillment consumes reserved balance once. Rejection releases it once. If an expired inactive account receives a release, expire the released spendable balance in the same transaction.

Tier thresholds count unique verified supported mentees at 5/10/15/25, not sessions or parents’ number of accounts. Deduplicate guardian-operated children by case subject; keep parent mentees as their own verified subjects. Verification badge and contribution tier are independent. Certificates sum actual admin-verified minutes, never a default 20 hours. Gold+ quarterly invitations are reviewed content.

Set inactivity to the latest qualifying mentoring/referral or signed-in session. At five calendar months send one warning per activity version; at six calendar months append expiry of remaining available points. Recheck activity under lock immediately before expiry. Reserved points remain committed to pending fulfillment; rejected reservations follow the release rule above. Preserve the ledger.

Require Idempotency-Key on consequential POST commands. Scope it to actor, method, canonical resource path, and canonical body hash; different payload with the same key returns 409 IDEMPOTENCY_CONFLICT. Retain command responses encrypted for seven days, reauthorizing before replay. Database insertion of idempotency result and domain mutation shares one transaction. Signup is a provisioning saga because Auth and application tables are separate: persist a nonsensitive registration intent, reconcile provider identity creation, and never store/replay passwords. Provider retries use stable operation IDs; timeout with unknown external outcome enters reconciliation before a second external action.

## Messaging, consent, AI, and content processing

Messages require active conversation membership, an accepted mentorship request or current case relationship, sender approval, and no active block. Neither knowing a GSC number nor viewing a mentor profile enables direct messaging. Reject attachments outside the conversation’s authorized case and file purpose. Adopt 4,000-character messages, 30 sends/minute/account, and reporting/blocking controls. Mentors cannot enumerate students; discovery runs student-to-published-mentor, then approved request-to-mentor. Parents join only explicitly invited threads. Restrict Realtime subscriptions to authenticated private channels; use an authorized short-lived channel credential or API polling if cookie-only browser authentication cannot be safely bridged. A technical spike must prove channel revocation and zero cross-case events.

Daily is the selected video contract, not a verified cross-platform implementation. Issue room-bound participant tokens only to accepted booking participants, valid around the meeting window and never logged. Recording defaults OFF. Store every participant’s explicit session-specific decision against roster version; minors additionally require verified guardian authorization. Every roster change invalidates the recording authorization. Pause before admitting a late participant; resume only after unanimous consent on the new roster. Withdrawal stops recording. If the adapter cannot enforce pause-before-admit and verified recording state, disable recording, retain ordinary meetings, and use manual summaries.

OpenAI behind AIProvider is selected for transcription, advisory drafts, QA coaching, and catalog extraction. Jobs receive the minimum authorized inputs without community data, passwords, private counselor notes, or unrelated case records. Separate draft generation from QA coaching; neither output is automatically visible to students. Store model configuration, prompt version, input hash, source references, and validation flags. Treat transcripts and fetched pages as untrusted content, not instructions. AI has no tools that mutate bookings, approve reports, award points, or publish catalog data.

Require structured output validation, citations back to transcript segments/catalog facts, unsupported-claim detection, privacy checks, and counselor review. Counselor approval locks a specific report revision and its clean generated/uploaded PDF. Edits create a new draft; previously approved content remains immutable until withdrawn. Student/authorized parent receives only the approved advisory. QA feedback is visible only to that counselor and assigned QA staff, never students, parents, unrelated counselors, or general admins. Human authors can complete the workflow when AI fails. All outbound notices contain minimal text and an authenticated link, not transcripts, financial figures, or protected complaints.

Official URL ingestion runs only in the worker against reviewed host/path allowlists and permitted retrieval. Accept HTTPS port443 only; reject credentials, IP literals, fragments, ambiguous encodings, and non-HTTP schemes. Resolve DNS and reject private, loopback, link-local, multicast, reserved, and cloud-metadata addresses for IPv4/IPv6. Validate every redirect, cap at three, and pin the validated destination while preserving TLS hostname verification to prevent DNS rebinding. Enforce outbound network restrictions, ten-second fetch deadline, five-MB decompressed limit, MIME allowlist, and no cookies or internal credentials. Do not execute retrieved JavaScript.

Store canonical URL, retrieval timestamp, hash, permitted snapshot/excerpt, field-level provenance, extraction method, reviewer, and next review date. AI output enters staging; publication requires human verification of each material fee, deadline, requirement, and ranking. Ranking data must have licensed-feed or permitted manually sourced provenance. Run quarterly review reminders and flag expired deadlines/old facts without silently inventing replacements. Google Maps integration is an external directions link from validated coordinates, not a promised geospatial API.

Imports accept scanned CSV/XLSX and approved URLs. Parse spreadsheets without macros, formulas, remote references, or automatic link following; cap rows and bytes, validate taxonomy/foreign keys, and produce a dry-run diff with row errors and duplicate candidates. Apply an approved batch transactionally in bounded chunks using external keys, never overwriting newer editorial versions. Retain batch-to-row-to-published-revision lineage and an inverse patch for rollback. News submissions by universities are handled by verified content staff workflow, not a new university-role portal.

Learning categories are walkthroughs, career/university selection courses, counselor-led video lessons, micro-learning, skill development tracks, parent guidance, and resource library. Progress is revision-specific, private, and synchronized by monotonic position plus explicit completion, not an examination credential. News covers admissions, scholarships, fairs, intakes, open days, platform updates, workshops, and alumni stories; save/like/follow are unique per actor. Sharing public content shares its URL; private case sharing still requires grants.

Journey stores visa approval, arrival/university start, first-semester standing with original grading scale, internship date/relevance, graduation, first-job offer/industry/employer, and direct-platform-influence yes/no/unknown. Mark all self-reported. Public stories and named spotlights require separate subject consent and editorial approval. Roadmaps derive tasks from a chosen program’s criteria, with owner, status, due date, evidence, and source revision; they never claim an external university submission occurred.

## REST API contract

All paths below begin /api/v1. Roles: G guest, M authenticated member, S student case owner, P scoped parent/guardian, C assigned counselor, T verified mentor, A staff with the named permission. “S/P” always means resource-scoped authorization, not role alone. Request schemas reject unknown keys. UUID examples below are synthetic fixtures, not existing users.

Success is {"data":...,"meta":{"requestId":"...","version":1}}; collection responses add nextCursor and hasMore. Asynchronous commands return 202 with jobId and status. JSON money/precise decimals are strings, instants RFC3339 UTC, dates YYYY-MM-DD, unknowns null with an explanatory reason. Mutations return new version and ETag: "vN"; updates/deletes require If-Match, returning 428 PRECONDITION_REQUIRED if absent and 409 VERSION_CONFLICT if stale.

Pagination uses signed opaque keyset cursors containing sort key, ID, filter hash, actor scope, and snapshot boundary. Default limit20, maximum100. Reject a cursor reused with different filters/scope. Sort options are explicit enums; no raw SQL field names. No unbounded exports through collection endpoints.

Every endpoint can return: 400 INVALID_REQUEST, 401 AUTH_REQUIRED, 403 FORBIDDEN for known permitted-context actions, 404 NOT_FOUND for nonexistent or unauthorized resources, 409 domain/version conflict, 413 PAYLOAD_TOO_LARGE, 415 UNSUPPORTED_MEDIA, 422 VALIDATION_FAILED, 429 RATE_LIMITED with Retry-After, or 503 DEPENDENCY_UNAVAILABLE. Unexpected failures return 500 INTERNAL_ERROR. Never expose SQL/provider bodies or reveal whether another account exists.

> {"error":{"code":"SHORTLIST_LIMIT","message":"You can save up to three options.",
>
> "requestId":"req_fixture_01","retryable":false,
>
> "fields":\[{"path":"programId","code":"LIMIT_REACHED"}\],
>
> "details":{"limit":3}}}

### Identity and planning endpoints

The “contract” column names required request fields, success status/shape, and additional domain errors; common errors above apply to every row.

| Method/path                                                        | Role                  | Contract                                                                                            |
|--------------------------------------------------------------------|-----------------------|-----------------------------------------------------------------------------------------------------|
| POST /auth/register                                                | G                     | Registration below →202 verification status; self-declared ineligible →200 guest, no private record |
| POST /auth/login                                                   | G                     | email,password,clientKind →200 browser cookie or native tokens; MFA_REQUIRED                        |
| POST /auth/refresh; POST /auth/logout                              | M                     | native refresh token or browser session →200 renewed session/loggedOut                              |
| POST /auth/password-reset                                          | G                     | email →202 generic accepted                                                                         |
| POST /auth/password-update                                         | M                     | recovery/session proof,newPassword →200 updated; RECENT_AUTH_REQUIRED                               |
| POST /auth/email-verification                                      | G/M                   | one-use verification code →200 nextStep; CHALLENGE_EXPIRED                                          |
| POST /auth/phone-challenges                                        | M                     | phone,purpose →202 challengeId,resendAt                                                             |
| POST /auth/phone-challenges/{id}/verify                            | M                     | code →200 verified; ATTEMPTS_EXHAUSTED                                                              |
| POST /auth/mfa/enroll; POST /auth/mfa/verify                       | M                     | enrollment request or factorId,code →200 enrollment/assurance                                       |
| GET /me; PATCH /me                                                 | M                     | none or allowed identity fields →200 profile; EMAIL_REVERIFICATION_REQUIRED                         |
| POST /me/email-change                                              | M                     | newEmail,recentAuth →202 verification pending                                                       |
| POST /cases                                                        | verified P            | child identity,guardian evidence →201 restricted case                                               |
| GET /cases/{caseId}/profile; PATCH same                            | S/P                   | none or profile fields →200 versioned profile                                                       |
| POST /cases/{caseId}/profile/complete                              | S/P                   | expected version →200 completion; PROFILE_INCOMPLETE                                                |
| PUT /cases/{caseId}/finance; POST /cases/{caseId}/finance/complete | S/P finance           | financial fields or completion →200; PROFILE_INCOMPLETE                                             |
| POST /cases/{caseId}/parent-links                                  | S/P guardian operator | intended email,scopes →201 invitation                                                               |
| POST /parent-links/accept                                          | intended P            | invitationToken,relationship proof →200 pending/active                                              |
| DELETE /cases/{caseId}/parent-links/{id}                           | S/P self; safety A    | reason →200 revoked                                                                                 |
| GET /universities; GET /universities/{id}; GET /programs/{id}      | G                     | filters or ID →200 published information only                                                       |
| GET /scholarships; GET /scholarships/{id}                          | G/M                   | filters or ID →200 published cards; guest limited coverage                                          |
| POST /guest/match                                                  | G                     | country,field →200 3–5 universities,1–2 scholarships when available                                 |
| POST /cases/{caseId}/matches                                       | S/P                   | kind,preferences →200 university/counselor result; PROFILE_INCOMPLETE                               |
| GET /cases/{caseId}/shortlist; POST same                           | S/P                   | none or programId,reviewFlag →200 list/201 saved; SHORTLIST_LIMIT                                   |
| PATCH /cases/{caseId}/shortlist/{id}; DELETE same                  | S/P                   | reviewFlag or empty →200 updated/removed                                                            |
| POST /cases/{caseId}/assessments                                   | S/P                   | programId,criteriaRevision,answers →201 score; CRITERIA_CHANGED                                     |
| POST /cases/{caseId}/budgets                                       | S/P finance           | programId,horizon →201 snapshot; MODULE3_REQUIRED                                                   |
| POST /cases/{caseId}/shares                                        | S/P                   | resourceType,resourceId,parentLinkId →202 notice; SCOPE_REQUIRED                                    |
| PUT /cases/{caseId}/target                                         | S/P                   | programId →200 selected target                                                                      |
| GET /cases/{caseId}/application-guidance                           | S/P                   | none →200 official action URL/visa guidance; COUNSELING_REQUIRED                                    |

### People, sessions, advisory, and rewards endpoints

| Method/path                                                             | Role                 | Contract                                                             |
|-------------------------------------------------------------------------|----------------------|----------------------------------------------------------------------|
| GET /mentors; GET /counselors                                           | G/M                  | filters →200 published profiles                                      |
| PUT /me/mentor-profile; PUT /me/counselor-profile                       | T/C applicant        | professional fields →200 draft; VERIFICATION_REQUIRED                |
| GET /hosts/{id}/availability                                            | M                    | from,to,timezone →200 slots,hostTimezone                             |
| PUT /me/availability                                                    | T/C                  | rules,exceptions →200 schedule; BOOKING_CONFLICT                     |
| POST /cases/{caseId}/assignments                                        | S/P                  | counselorId,matchRunId →201 assignment; CAPACITY_CHANGED             |
| POST /cases/{caseId}/counselor-change                                   | S/P                  | reasonCategory,summary,safetyDetail? →202 handoff                    |
| POST /mentor-requests                                                   | M                    | mentorId,caseId?,topics,summary →201 pending                         |
| POST /mentor-requests/{id}/decision                                     | target T             | accept/decline →200 status                                           |
| GET /bookings; POST /bookings                                           | S/P/T scoped         | filters or booking example →200 list/201 confirmed; SLOT_UNAVAILABLE |
| POST /bookings/{id}/reschedule                                          | S/P/T host           | startsAt,scheduleVersion →200 booking; RESCHEDULE_WINDOW             |
| POST /bookings/{id}/cancel                                              | participant          | reason →200 cancelled,lateCancel                                     |
| POST /bookings/{id}/join                                                | accepted participant | deviceKind →200 room token; PARTICIPANT_NOT_AUTHORIZED               |
| POST /bookings/{id}/participants                                        | booking manager      | accountId,parentLinkId? →201 invitation                              |
| POST /bookings/{id}/participants/accept                                 | invitee              | accept →200 membership                                               |
| POST /bookings/{id}/recording-consent                                   | participant          | rosterVersion,decision →200 consent state; ROSTER_CHANGED            |
| POST /bookings/{id}/recording/start; POST /bookings/{id}/recording/stop | host                 | rosterVersion →202 command; CONSENT_REQUIRED                         |
| POST /bookings/{id}/complete                                            | host                 | attendanceEvidence →200 completed/pending_review                     |
| POST /bookings/{id}/feedback                                            | participant          | questionnaireVersion,answers →201 response                           |
| POST /bookings/{id}/mentor-log                                          | host T               | goodPoint,improvementPoint →201 awaiting_approval                    |
| POST /cases/{caseId}/reports                                            | C                    | bookingId,shareableBody →201 draft                                   |
| PATCH /reports/{id}                                                     | author C             | shareableBody,pdfFileId? →200 draft                                  |
| POST /reports/{id}/approve                                              | author C/QA A        | review attestations,revision →200 approved; FILE_NOT_CLEAN           |
| GET /reports/{id}; GET /reports/{id}/download                           | report ACL           | none →200 approved report/download authorization                     |
| GET /bookings/{id}/qa                                                   | subject C/QA A       | none →200 coaching,never advisory DTO                                |
| POST /cases/{caseId}/private-notes                                      | C                    | body →201 private note                                               |
| GET /cases/{caseId}/tasks; POST same                                    | S/P/C task scope     | filters or task fields →200 list/201 task                            |
| PATCH /tasks/{id}                                                       | owner/scoped C       | status,estimatedDeliveryAt,evidenceId →200; INVALID_TRANSITION       |
| POST /cases/{caseId}/roadmap                                            | S/P/C                | programId,criteriaRevision →201 tasks; TARGET_REQUIRED               |
| GET /rewards; GET /rewards/ledger; GET /rewards/catalog                 | eligible M           | cursor? →200 balances/entries/catalog                                |
| POST /rewards/redemptions                                               | eligible M           | catalogCode →201 reservation; INSUFFICIENT_POINTS                    |
| GET /rewards/redemptions/{id}                                           | owner                | none →200 status,deliveryEstimate                                    |
| POST /referrals/code                                                    | eligible M           | empty →201 shareable code                                            |
| GET /referrals                                                          | owner                | cursor →200 own referral stages                                      |

### Communication, content, administration, and integrations

| Method/path                                                                  | Role                    | Contract                                                         |
|------------------------------------------------------------------------------|-------------------------|------------------------------------------------------------------|
| GET /conversations; GET /conversations/{id}/messages                         | member ACL              | cursor →200 permitted records                                    |
| POST /conversations/{id}/messages                                            | sender ACL              | clientMessageId,body?,fileId? →201; CONVERSATION_CLOSED          |
| POST /safety-reports; PUT /blocks/{accountId}                                | M                       | evidence or enabled →201 report/200 block                        |
| POST /files/uploads; POST /files/{id}/complete                               | file ACL                | purpose,size,mime,caseId? or checksum →201 upload/202 scan       |
| GET /files/{id}/download                                                     | file ACL                | none →200 URL/expiry; FILE_NOT_CLEAN                             |
| GET /learning; GET /learning/{id}; GET /learning/library                     | audience M/G            | filters →200 published content                                   |
| PUT /learning/{id}/progress                                                  | M                       | revision,positionSeconds,completed →200 progress                 |
| GET /news; GET /news/{id}                                                    | G/M                     | filters →200 published updates                                   |
| PUT /content/{id}/engagement; DELETE same                                    | M                       | kind save/like →200 state                                        |
| PUT /topics/{id}/follow; DELETE same                                         | M                       | empty →200 state                                                 |
| GET /cases/{caseId}/journey; POST same                                       | S/P scoped              | none or milestone fields →200 list/201 private milestone         |
| PATCH /journey/{id}                                                          | author/scoped P         | milestone fields →200 revision                                   |
| POST /stories                                                                | M                       | caseId,selectedFields,publicationConsent →201 review_pending     |
| GET /notifications; PATCH /notifications/{id}                                | owner                   | cursor or read=true →200                                         |
| PUT /me/notification-preferences                                             | M                       | category,channel,enabled,consent →200 preferences                |
| POST /calendar/connections                                                   | M                       | provider,returnPath →200 authorization URL                       |
| GET /calendar/callback/{provider}                                            | OAuth state holder      | code,state →303 safe return                                      |
| DELETE /calendar/connections/{id}                                            | owner                   | empty →200 revoked                                               |
| POST /me/data-requests; GET /me/data-requests/{id}                           | M fresh auth            | kind or none →202 job/200 progress                               |
| GET /admin/verifications; POST /admin/verifications/{id}/decision            | verification A          | filters or decision,reason →200; GUARDIAN_REQUIRED               |
| POST /admin/guardian-verifications/{id}/decision                             | verification A          | evidenceFileId,decision →200                                     |
| POST /admin/staff-grants                                                     | supervisor A            | accountId,permission,expiresAt,reason →201; SELF_GRANT_FORBIDDEN |
| POST /admin/case-access                                                      | oversight A             | caseId,scopes,reason,expiresAt →201 audited grant                |
| POST /admin/imports; GET /admin/imports/{id}; POST /admin/imports/{id}/apply | catalog A               | fileId/kind or approvedDiffHash →202 job/200 preview             |
| POST /admin/ingestions                                                       | catalog A/C contributor | officialUrl,entityType →202 staging; HOST_NOT_APPROVED           |
| POST /admin/catalog/{entityType}/{id}/publish                                | catalog A               | revision,verifiedFactIds →200; PROVENANCE_REQUIRED               |
| POST /admin/content; PATCH /admin/content/{id}                               | content A/C contributor | kind,revision,body,sources →201/200 draft                        |
| POST /admin/content/{id}/publish                                             | content A               | revision,reviewChecklist →200; SUBJECT_CONSENT_REQUIRED          |
| POST /admin/mentor-logs/{id}/approve                                         | rewards A               | verifiedMinutes,evidence →200 qualification/points               |
| PUT /admin/reward-catalog/{id}                                               | rewards A               | enabled,inventory,fulfillmentPolicy →200; FUNDING_REQUIRED       |
| POST /admin/redemptions/{id}/decision                                        | rewards A               | fulfill/reject,fulfillmentRef?,reason →200                       |
| GET /admin/analytics; GET /admin/audit                                       | scoped A                | bounded filters,cursor →200 aggregates/events                    |
| POST /admin/jobs/{id}/replay                                                 | operations A            | reason →202; RECONCILIATION_REQUIRED                             |
| POST /webhooks/{provider}                                                    | verified provider       | raw signed payload →202 durable receipt; INVALID_SIGNATURE       |

### Concrete payload examples

Examples show request and data response bodies; the global envelope, headers, authorization, and errors still apply. UUIDs are valid synthetic placeholders. Never submit the sample password in real environments.

**Registration, POST /auth/register.** Accept a role-specific intake; contacts remain private. Return a generic next step rather than account-existence disclosure.

> {"email":"student@example.invalid","password":"ExampleOnly!4927",
>
> "role":"student","communityDeclaration":"yes","fullName":"Amina Example",
>
> "familyName":"Example","gender":"prefer_not_to_say","dateOfBirth":"2006-02-14",
>
> "nationality":"KE","residenceCountry":"KE","city":"Nairobi",
>
> "address":{"street":"Example Road","postalCode":"00100","country":"KE"},
>
> "phone":"+254700000000","whatsappSameAsPhone":true,"passportStatus":"in_process",
>
> "socialUrls":\["https://example.invalid/profile"\],
>
> "consents":\[{"purpose":"data_use","policyVersion":"launch-1","accepted":true}\],
>
> "clientKind":"native"}
>
> {"registrationId":"10000000-0000-4000-8000-000000000001",
>
> "status":"email_pending","nextStep":"verify_email","gscId":null}

**Profile, PATCH /cases/{caseId}/profile, If-Match: "v3".** Academic/test subresources are accepted as atomic nested replacement sets with their own IDs; omitted sets remain unchanged.

> {"academic":{"level":"high_school","educationYears":12,"targetLevel":"undergraduate",
>
> "fieldIds":\["20000000-0000-4000-8000-000000000001"\],
>
> "intakeMonth":9,"intakeYear":2027,"intakeUndecided":false,
>
> "careerGoal":"Study computing and build useful education software.",
>
> "accommodation":"dorm"},
>
> "countryPreferences":\[{"country":"CA","priority":1},{"country":"GB","priority":2},
>
> {"country":"DE","priority":3}\],
>
> "educationRecords":\[{"institution":"Example School","level":"high_school",
>
> "country":"KE","city":"Nairobi","board":"national","completionYear":2026,
>
> "scoreValue":"B","scoreScale":"original_letter"}\]}
>
> {"caseId":"30000000-0000-4000-8000-000000000001","version":4,
>
> "completion":{"module2":"draft","module3":"incomplete"},
>
> "gates":{"publicFees":true,"personalizedBudget":false,"save":false}}

**Parent link, POST /cases/{caseId}/parent-links.**

> {"parentEmail":"parent@example.invalid",
>
> "scopes":\["profile.read","finance.read","finance.write","report.read"\]}
>
> {"invitationId":"40000000-0000-4000-8000-000000000001","status":"invited",
>
> "expiresAt":"2026-09-21T12:00:00Z","relationshipVerified":false,
>
> "activeScopes":\[\],"delivery":"queued"}

**Match, POST /cases/{caseId}/matches.**

> {"kind":"counselor","profileVersion":4,"timezone":"Africa/Nairobi"}
>
> {"rulesVersion":"counselor-1","profileVersion":4,"candidates":\[{
>
> "counselorId":"50000000-0000-4000-8000-000000000001","score":"83.0",
>
> "components":{"field":"30","country":"20","availability":"10",
>
> "rating":"5","workload":"18"},
>
> "ratingBasis":"neutral_insufficient_published_reviews",
>
> "nextSlot":"2026-09-18T09:00:00Z","requiresStudentChoice":true}\]}

**Shortlist, POST /cases/{caseId}/shortlist.** Requires completed Module 3, including valid explicit financial declines.

> {"programId":"60000000-0000-4000-8000-000000000001","reviewFlag":true}
>
> {"id":"61000000-0000-4000-8000-000000000001","slot":2,
>
> "programId":"60000000-0000-4000-8000-000000000001",
>
> "reviewFlag":true,"savedCount":2,"remainingSaved":1,"version":1}

**Booking, POST /bookings.** Selected slot is revalidated; time-zone text is never authoritative for the instant.

> {"kind":"counseling","caseId":"30000000-0000-4000-8000-000000000001",
>
> "assignmentId":"51000000-0000-4000-8000-000000000001",
>
> "hostId":"50000000-0000-4000-8000-000000000001",
>
> "startsAt":"2026-09-18T09:00:00Z","topics":\["university_selection"\],
>
> "reminders":{"hours24":true,"hours2":true,"minutes10":true}}
>
> {"id":"70000000-0000-4000-8000-000000000001","status":"confirmed",
>
> "startsAt":"2026-09-18T09:00:00Z","endsAt":"2026-09-18T09:30:00Z",
>
> "hostTimezone":"Europe/London","scheduleVersion":1,"version":1,
>
> "meeting":{"state":"preparing","joinUrl":null},"price":{"kind":"free"},
>
> "recording":{"enabled":false},"calendarSync":"queued"}

**Report approval, POST /reports/{id}/approve, If-Match: "v2".**

> {"revision":2,"reviewAttestations":{"accuracyChecked":true,
>
> "sourcesChecked":true,"privateNotesExcluded":true,"studentSafe":true}}
>
> {"id":"80000000-0000-4000-8000-000000000001","revision":2,
>
> "status":"approved","version":3,"approvedAt":"2026-09-18T12:00:00Z",
>
> "shareableBody":{"summary":"Review the published language requirement.",
>
> "universityOptions":\[{"programId":"60000000-0000-4000-8000-000000000001",
>
> "counselorFit":4}\],"gaps":\["Language evidence remains unverified."\],
>
> "nextSteps":\["Upload the original test result."\]},
>
> "pdf":{"state":"clean","downloadEndpoint":"/api/v1/reports/80000000-0000-4000-8000-000000000001/download"},
>
> "notifications":"queued"}

**Task update, PATCH /tasks/{id}, If-Match: "v1".** Submitted evidence is not automatically approved completion.

> {"status":"submitted","estimatedDeliveryAt":null,
>
> "evidenceId":"90000000-0000-4000-8000-000000000001"}
>
> {"id":"91000000-0000-4000-8000-000000000001","title":"Upload language result",
>
> "status":"submitted","version":2,"reviewedBy":null,
>
> "dueAt":"2026-09-22T16:00:00Z","followUpAlert":"resolved",
>
> "reviewNotification":"queued"}

**Reward redemption, POST /rewards/redemptions.**

> {"catalogCode":"recognition-pack-500"}
>
> {"id":"92000000-0000-4000-8000-000000000001","status":"reserved",
>
> "points":500,"balance":{"available":25,"reserved":500},
>
> "fulfillment":{"kind":"certificate_and_letter","state":"queued"},
>
> "certificateBasis":{"verifiedMinutes":630,"displayHours":"10.5"},
>
> "version":1}

## Durable integrations and operational readiness

### Queue, webhooks, and selected adapter acceptance

Claim due jobs with FOR UPDATE SKIP LOCKED, set a 60-second lease, and heartbeat every20 seconds. Lease generation is a fencing token: stale workers cannot commit completion. Keep DB transactions out of network calls. Outbox dispatch and job creation share a transaction with unique deduplication keys. Delivery is at least once, not an exactly-once promise. Workers validate event schema versions and compare aggregate/schedule versions before effects.

Retry transient timeout/429/5xx failures with jittered delays approximately 30 seconds,2 minutes,10 minutes,1 hour,4 hours,12 hours; honor Retry-After and stop after eight attempts or 24 hours. Permanent validation/auth failures enter DLQ immediately, except recoverable OAuth refresh. DLQ is a terminal jobs.state, with safe error codes, operator reason, and controlled replay. Provider timeout after possible success requires lookup/reconciliation before resending. Never claim duplicate-free external delivery without adapter evidence.

Verify webhooks against raw bytes with the provider’s contracted signature scheme, timestamp tolerance, constant-time comparison, and active/previous secrets during rotation. If the provider contract lacks timestamp signing, use its documented challenge/authentication plus stored event replay protection, not an invented header. Invalid signatures cannot enqueue work. Persist verified receipt and processing job before 202; duplicates return accepted without another effect. Process out-of-order callbacks through state/version checks. Authenticate administrative replay separately.

Booking reminder jobs key on booking, schedule version, recipient, and offset24h/2h/10m. Recheck current status, permission, opt-outs, and scheduled time immediately before sending. Skip elapsed offsets; cancel obsolete versions. Resolve task follow-up alerts when evidence is submitted, keep review notifications separate, and accept a new estimated delivery date without pretending the task is complete.

Resend email and Twilio WhatsApp are selected notice adapters. Spike acceptance requires authenticated sender setup, consent/template handling, delivery-event verification, opt-out behavior, duplicate reconciliation, and sanitized failure reporting. Daily acceptance covers web/native joining, room isolation, participant identity, revocation, roster-safe recording, attendance evidence, deletion, and region disclosure. OpenAI acceptance covers input limits, structured outputs, cancellation/deletion contract, privacy configuration, language evaluation, and no training/retention assumptions without evidence.

Google/Microsoft Calendar adapters store encrypted scoped OAuth credentials and per-booking external IDs. Serialize updates per connection; reconcile external version/ETag conflicts. Calendar entries use generic titles and authenticated app links, not financial details. External edits do not silently reschedule GSC bookings: show conflict, preserve booking authority, and require explicit action. Disconnect revokes credentials and future sync without deleting bookings. Spike tests cover OAuth revocation, duplicate creation, expired subscriptions, reconciliation, and provider downtime. FX tests cover base/quote direction, missing currency, bad timestamps, stale rates, and outage fallback. Manual sourced entries remain available if automated catalog integration fails.

### Retention and deletion

Raw session recordings expire30 days after capture; transcripts90 days after creation. Approved advisory, tasks, journey, and case history remain while the account/case is active, then enter a 30-day deletion workflow, subject to documented holds. Optional introduction videos follow case retention, not a promised lifetime-memory service. Adopt abandoned/rejected registrations90 days, unconsumed invitations7 days, webhook payloads30 days, operational logs30 days, and minimized security/audit records365 days. These are proposed policies requiring jurisdictional review, not statements of legal sufficiency.

Deletion immediately suspends access, revokes sessions/grants, hides public projections, cancels queued notices, and stops new processing. Worker inventories Auth, database children, Storage originals/derivatives, provider recordings/AI artifacts, exports, and integration credentials. Delete or pseudonymize identifiers in retained immutable ledgers/audit evidence under approved retention policy; never retain arbitrary identifiable history merely because a table is append-only. Record hold scope, authority, reason, review date, and eventual release. Shared guardian cases require ownership review rather than deleting another person’s data automatically.

Export uses fresh authentication, a scoped asynchronous manifest, encrypted private output, and 24-hour expiry. Exclude third-party private notes and protected safety evidence from automatic exports pending rights review. Backups expire under their retention policy rather than instant selective removal; maintain a protected deletion manifest and replay deletions before any restored system accepts traffic. Confirm deletion only after each target has succeeded or a disclosed lawful exception remains.

### Environments, delivery, and recovery

| Environment | Isolation and data                                                  | Release gate                                               |
|-------------|---------------------------------------------------------------------|------------------------------------------------------------|
| Local       | Supabase development stack, synthetic fixtures, mocked adapters     | Unit/domain/RLS tests                                      |
| Preview     | Isolated ephemeral project or mocks; no production credentials/data | Contract/UI tests; outbound messages disabled              |
| Staging     | Separate Supabase/Vercel/Render and provider test credentials       | Migration, native, security, restore, integration evidence |
| Production  | Regional inventory, restricted secrets, approved senders            | Reviewed immutable build and operational sign-off          |

CI runs locked dependency installation, lint/type checks, secret/dependency scanning, OpenAPI compatibility, domain tests, real PostgreSQL constraints/RLS tests, and cross-client contract fixtures. Required adversarial fixtures include two unrelated cases, one shared parent, revoked guardian, switched counselor, company colleagues, unapproved minor, reused idempotency key, and parallel redemption/booking requests. Test100 concurrent contenders for the same slot, saved slot, and last500 points; exactly one eligible winner must commit.

Use expand/backfill/contract migrations. Add nullable columns/new tables first, deploy dual-compatible code, backfill in resumable batches, validate constraints, then enforce NOT NULL and retire old fields after supported native clients migrate. Never edit applied migrations. Run production migrations through a locked CI job with least-privilege migration credentials, statement/lock timeouts, reviewed query plans, and backup checkpoint. Destructive steps require separate approval. Application rollback switches to the prior compatible build; database rollback ordinarily uses a forward repair migration, not destructive down scripts.

Pin actual dependency/runtime versions in lockfiles and container manifests during implementation; this document does not claim particular vendor versions. Promote the same worker image by digest; graceful shutdown stops claims, checkpoints work, and lets leases expire. Maintain API compatibility for the current and previous supported native release until adoption evidence permits removal.

### Proposed engineering targets and runbooks

Targets below are proposed acceptance objectives, not demonstrated capacity or vendor guarantees. Validate using staging load tests and production measurement.

| Objective                 | Proposed target                                                          | Evidence/alert                                           |
|---------------------------|--------------------------------------------------------------------------|----------------------------------------------------------|
| Core API availability     | 99.9% monthly eligible requests                                          | Synthetic login/read/booking checks; error-budget alerts |
| API latency               | p95 reads\<500ms; writes\<800ms, excluding uploads/providers             | Per-route tracing; alert sustained10 minutes             |
| Queue and reminders       | p95 ready-job age\<60s;95% reminders within 2 minutes                    | Queue age and missed reminder counters                   |
| Draft/scan responsiveness | p95 small-file scan\<2min; report draft\<10min when dependencies healthy | End-to-end job timers; expose delays                     |
| Recovery                  | RPO≤15min database; RTO≤4h; storage RPO≤24h                              | Backup capability/configuration spike and restore drill  |
| Correctness/security      | Zero accepted cross-case accesses or double-spend invariants             | Mandatory tests, audits, incident review                 |

Initial load-test envelope is 100 concurrent active API users,20 booking commands/second for short bursts, and 10,000 published catalog programs. It is a test workload, not a promised launch capacity. Pool database connections, set bounded query timeouts, use keyset indexes, and inspect slow plans before scaling. Monitor connection saturation, deadlocks, lease age, DLQ growth, auth failures, consent failures, scan backlog, stale FX, and ledger discrepancies without logging message bodies or private documents.

Require encrypted daily backups plus a tested point-in-time recovery mechanism meeting the proposed RPO; availability and configuration are release evidence, not assumed Supabase entitlements. Back up private object inventory and objects separately, verify checksums, and test quarterly recovery into an isolated project. Restore database and files, reconcile missing objects/jobs/external effects, replay deletion manifests, rotate secrets, run case-isolation tests, then explicitly authorize traffic.

**Booking incident:** disable new booking commands via server flag, preserve reads/cancellation, inspect constraints and affected schedule versions, reconcile external calendars/rooms, repair through audited commands, then rerun contention tests before reopening. Never resolve overlap by silently deleting a confirmed student appointment.

**Provider or queue outage:** pause the affected adapter only, keep authoritative commands available, display delayed preparation/sync, inspect oldest jobs and provider status, reconcile uncertain outcomes, and replay bounded batches. Do not dump the DLQ wholesale into a recovering provider.

**Privacy/credential incident:** revoke compromised sessions/keys, disable affected publication/download paths, preserve minimized evidence, identify exposed resource scope through audit events, notify designated privacy/security owners, and rotate credentials before restoration. Reevaluate already issued signed URLs and provider artifacts.

**Reward discrepancy:** freeze redemption, compare ledger sums with cached balances and fulfillment records, append reviewed corrections, reconcile inventory, and replay notices only after financial-invariant tests pass. **Migration failure:** stop deployment, identify committed phases, restore prior compatible app, prefer forward fix; use isolated restore only with explicit incident authorization.

Release requires completed integration spikes, staff MFA, verified sender/consent setup, approved legal/privacy text, ranking permissions, regional/subprocessor inventory, successful native session/video tests, tested deletion/export, backup restoration, and signed security/QA evidence. Missing evidence blocks the affected capability’s production enablement; it does not reopen the selected platform decisions.

# Global Student Cube: team execution, quality assurance and release

## Delivery contract and scope

All tests below are **specified, not executed**. No integration, accessibility, security, legal or store acceptance result is claimed. Completion requires implementation evidence and recorded results. Architecture and business rules follow the implementation baseline; scope comes from the complete source specification.

P0 builds foundations, security and the student-to-counselor journey first. P1 builds remaining full-source capabilities next, without removing scope. A P0 pilot is not the completed product. Website, iOS and Android member journeys are required; administrative privilege interfaces are responsive web only. Screen identifiers remain with their specification owner.

Use TypeScript/pnpm shared contracts, validation, client and tokens; Next.js web/REST; Expo React Native; Supabase PostgreSQL/Auth/private Storage/Realtime; Vercel; and Render Node worker with PostgreSQL jobs/outbox. Database transactions determine permissions, booking ownership, caps and balances, never client UI or AI. No Redis or microservices.

Packages include criteria, trace keys, designs, migration/API changes, privacy, content, platform coverage and runbooks. Product reconciles; engineering implements; QA verifies. Decision changes require versioning, impact analysis and regression updates.

## Role stories and ownership

### User stories

| Story            | Priority | User value and acceptance focus                                                                                                                                                     |
|------------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| US-GUEST         | P0       | As a guest, I want published universities, scholarship previews, mentor teasers and a country/subject match so I can understand the service without disclosing private information. |
| US-STUDENT       | P0       | As an approved student, I want to complete academics, compare ten university options, save three programs and choose counseling so I can make a supported plan.                     |
| US-ADULT         | P0       | As an independent adult, I want to complete Module 3 myself and decline optional money figures so progress does not require a parent or invented readiness score.                   |
| US-GUARDIAN      | P0       | As a verified guardian, I want explicitly scoped access to my child’s case so I can support planning without receiving another family’s information.                                |
| US-PARENT        | P0       | As an authorized linked parent, I want to collaborate on finances and receive approved advisory notices so I can help within the permissions granted.                               |
| US-COUNSELOR     | P0       | As a professionally verified counselor, I want appropriate cases, reliable scheduling, separate private notes and reviewed advisories so guidance is accountable and confidential.  |
| US-ADMIN         | P0       | As verification staff, I want review queues, supervisor escalation, audited exceptions and permission controls so sensitive decisions are traceable.                                |
| US-MENTOR        | P1       | As an approved alumni or verified current-student mentor, I want controlled requests, sessions and reciprocal feedback so I can contribute safely.                                  |
| US-PARENT-MENTOR | P1       | As a verified parent mentor, I want parent-relevant topics and my own mentoring workflow so I can share experience without accessing student financial files.                       |
| US-CONTRIBUTOR   | P1       | As an eligible contributor, I want accurate referrals, points, tiers and fulfillment status so recognition reflects verified activity rather than promises.                         |
| US-LEARNER       | P1       | As a member, I want role-relevant tutorials, learning tracks and reusable resources so I can prepare between sessions.                                                              |
| US-EDITOR        | P1       | As an authorized content contributor, I want reviewed university, scholarship, learning and news submissions so published information has provenance.                               |
| US-ALUMNI        | P1       | As an alumnus, I want private self-reported milestones and separate publication choices so I control how my journey is shared.                                                      |

### Delivery responsibilities

| Discipline         | Accountable deliverables                                                                                     | Review obligation                                                                       |
|--------------------|--------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| Product/UX         | Journey models, role permissions, task priorities, edge-state flows, usability protocol, requirement mapping | Resolve source conflicts using adopted decisions; validate no P1 capability disappears. |
| UI design          | Figma library, responsive compositions, component variants, icon placement, typography and token values      | Inspect implementation at every breakpoint and with enlarged text.                      |
| Web frontend       | Public/member/counselor/admin routes, semantic HTML, forms, states, responsive behavior                      | Demonstrate keyboard navigation, browser behavior and protected-route handling.         |
| Native frontend    | iOS/Android role navigation, safe areas, permissions, uploads, conferencing and authenticated links          | Demonstrate parity, assistive technology and lifecycle recovery on devices.             |
| Backend            | Contracts, schema, RLS, transactions, integrations, jobs, audit and retention logic                          | Supply deterministic fixtures, authorization evidence and failure recovery.             |
| QA                 | Risk model, automated/manual suites, usability observation, release evidence register                        | Independently retest defects; distinguish blocked, failed, passed and not run.          |
| Content operations | Taxonomies, source review, captions, templates, support copy, publication and review dates                   | Remove unsupported promises; verify rights and factual content before publication.      |
| DevOps/security    | Environments, secrets, deployment, monitoring, backups, restore, incident and vendor readiness               | Review trust boundaries, least privilege, regional configuration and rollback.          |

Name one tracker owner per package/dependency. Require independent security and imported-content review; counselors approve final advisories. Verification, content-administration and supervisor permissions remain separate capabilities even when held by one employee.

## Dependency-aware epic and work-package backlog

Dependencies gate production enablement; design/contracts proceed in parallel. Packages allocate all disciplines. Gates require evidence.

| Package / priority                    | Depends on  | Deliverables and measurable exit gate                                                                                                                                                                                                                   |
|---------------------------------------|-------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| WP-01 Foundation / P0                 | None        | Monorepo, environments, shared contracts, CI, design tokens, role shells, fixture factory. Gate: all three clients build; migration applies to empty database; no production secret enters client bundles.                                              |
| WP-02 Identity and safety / P0        | 01          | Registration, email/phone verification, staff MFA, age/guardian flow, consent records, UUID/GSC identifiers. Gate: all identity and cross-role denial tests pass, including approval races and identifier rollover.                                     |
| WP-03 Admin operations / P0           | 02          | Review queues, seven-day supervisor escalation, suspension, scopes, audit, support/export/deletion actions. Gate: each privileged transition records actor/reason/version; unauthorized variants denied.                                                |
| WP-04 Catalog foundation / P0         | 01,03       | University/program schema, manual sourced entries, public ranges, scholarship URL cards, ranking metadata, review queue. Gate: every published fixture has attribution, verification status and review date; missing values remain explicit.            |
| WP-05 Profiles and finance / P0       | 02,04       | Modules 2/3, private documents, scoped parent collaboration, currencies, budget/readiness. Gate: valid optional declines unlock correctly; finance fixtures reconcile without double counting.                                                          |
| WP-06 Exploration and assessment / P0 | 04,05       | Guest tour/match, university comparisons, ten/three/three caps, assessment and scholarship shortcut. Gate: deterministic results, threshold boundaries and concurrent cap tests pass.                                                                   |
| WP-07 Counselor practice / P0         | 02,03       | Module 6 company/individual profiles, credential review, availability/capacity, restricted public projections. Gate: only approved active experts enter matching; private credentials never appear publicly.                                            |
| WP-08 Scheduling / P0                 | 05,07       | Match explanations, final choice, appointment transactions, timezone rules, Google/Microsoft calendar adapters and reminders. Gate: concurrency/DST suite passes; provider outage does not lose confirmed appointments.                                 |
| WP-09 Counseling case loop / P0       | 08          | Daily web/native meeting integration, attendance, consent, manual summary, advisory upload/approval, feedback, change requests, follow-up tasks. Gate: end-to-end student/guardian/adult flows complete safely without recording or AI.                 |
| WP-10 Media and AI / P1               | 09          | Consent-gated recording, transcription/report drafts, counselor QA coaching, retention jobs and AIProvider boundary. Gate: injected instructions cannot trigger actions; no unapproved draft reaches students.                                          |
| WP-11 Mentorship / P1                 | 02,07,08,09 | Modules 4/5 taxonomies, current-student verification, request acceptance, scoped messaging, mentor scheduling, reports, reciprocal feedback and leaderboard. Gate: mentor/parent-mentor isolation and verified contribution counting pass.              |
| WP-12 Rewards / P1                    | 03,05,11    | Immutable points ledger, referrals/sharing/QR, tiers, recognition pack, catalog, fulfillment, expiry, admin analytics and Gold+ invitations. Gate: reconciliation and concurrent redemption/expiry tests pass; all displayed rewards are fulfillable.   |
| WP-13 Catalog enrichment / P1         | 04,06,09    | Allowlisted ingestion, permitted feeds, review diffs, quarterly audits, accommodation, advanced sourced scholarship details, country-finalization visa/work guidance. Gate: imports never autopublish; downstream changes are traceable.                |
| WP-14 Learning / P1                   | 03,04       | All Module 11 categories, role tutorials, library, captions, progress and counselor/admin authoring. Gate: each source category has reviewed launch content and accessible fallback.                                                                    |
| WP-15 News and stories / P1           | 03,04,11    | Module 12 topics, reviewed submissions, save/share/like/follow, success wall and spotlight choices. Gate: withdrawn/unpublished items disappear from public discovery and stale links resolve safely.                                                   |
| WP-16 Journey and roadmap / P1        | 05,09,15    | Criteria-derived tasks, evidence, self-service milestones, internship/job fields, private analytics and mentor transition. Gate: self-reported status is explicit; public consent is independent; temporal inconsistencies flagged.                     |
| WP-17 Full-product release / P0+P1    | 01–16       | Platform regression, usability remediation, real vendor validation, restoration drill, stores, operational training and staged rollout. Gate: all required scope has evidence; no critical/high-risk defect or unverified release prerequisite remains. |

UX supplies state transitions before styling; frontend/backend agree schemas and errors before implementation. QA prepares fixtures before merge; content develops taxonomies/templates alongside code. DevOps provisions sandbox adapters, without substituting mocks for real-provider validation.

## Design handoff and usability

Create Figma pages 00_Readme, 01_Foundations, 02_Components, 03_Public_Auth, 04_Student_Parent, 05_Counselor, 06_Mentorship, 07_Catalog, 08_Rewards, 09_Learning_News_Journey, 10_Admin, 11_Prototypes, 12_QA_Annotations. These are page names, not screen IDs.

Component naming uses GSC/{domain}/{component} with variants such as state=default\|focus\|error\|disabled\|loading, size=compact\|regular, platform=web\|native, and role=student\|parent\|mentor\|counselor. Examples: GSC/Form/CurrencyInput, GSC/Session/SlotButton, GSC/Catalog/UniversityCard, GSC/Consent/ParticipantStatus. Tokens use color.surface.default, color.action.primary, color.text.muted, color.focus.ring, space.16, radius.card, type.body, size.control.minimum. Export token mappings, not detached hex values in implementation.

Annotate header/sidebar/bottom navigation, leading/trailing icon positions, accessible names, hit areas, keyboard order, disabled reasons, live announcements, loading/empty/error states, overflow and safe-area behavior. Essential icon targets are 48×48; inline information targets are 44×44. Show distinct icons and labels for university and scholarship access, and distinguish verification badges from contribution tiers. Use the baseline colors, typography, spacing and responsive dimensions without inventing parallel styles.

**Design-ready checklist:** role/task identified; requirements traced; data sample includes long and missing values; permissions specified; error copy written; narrow/wide layouts supplied; focus/back behavior annotated; keyboard and screen-reader expectations defined; API assumptions reconciled; privacy warnings placed at collection/action; content source and owner assigned.

**Implementation-done checklist:** approved component variants used; UI and server validation match; API/contract and migration reviews complete; all states demonstrated; no dead controls; web/native parity documented; relevant automated/manual tests recorded; analytics checked without sensitive payloads; content reviewed; accessibility defects resolved; operational alerts/runbooks supplied; design and QA discrepancies closed.

Recruit at least five participants per workflow: student, parent/guardian, mentor/parent mentor and counselor/admin. Include low digital confidence, small-screen and assistive-technology users. Use synthetic identities/finances, study consent and no default recording.

Tasks: discover guest eligibility limits; complete a profile while declining savings; authorize and revoke a parent; explain unknown eligibility versus admissions probability; save three choices and handle a fourth; book across timezones; refuse recording and still attend; locate approved advice; request a safe counselor change; mentor and inspect pending points; redeem recognition; update a private milestone without publishing it. Measure independent task completion, errors, assistance, time and comprehension. Proposed gate: at least 80% unassisted completion per task with no unresolved safety misunderstanding; any privacy-critical failure requires redesign and retest regardless of average. Small samples are diagnostic, not population estimates.

## QA method and platform coverage

Use unit/property tests for calculations, thresholds and state transitions; database integration tests for RLS, locks and ledger invariants; API contract tests for authorization/validation; adapter contract tests for provider responses; browser/native end-to-end tests for journeys; and manual usability, assistive-technology and visual checks. Assert both API results and persisted state. Race tests launch independently authenticated simultaneous requests, not sequential double-click simulations.

Fixture families include unrelated parents with similar names, one parent linked to multiple children with different scopes, adult/minor/guardian-operated cases, suspended staff, alumni without student permissions, unverified catalog data, missing FX, DST transitions, expired links and duplicated/out-of-order jobs. Never copy production identity documents, financial information or recordings into test environments. Freeze server clocks for expiry tests and advance them explicitly; client clocks are not authorization evidence.

### Responsive and interaction matrix

Test widths **320, 360, 390, 414, 600, 768, 900, 1024, 1200, 1440, 1920 and 2560** CSS pixels on web, with corresponding logical-width layouts where applicable on native. At every width inspect navigation, registration, academic/financial forms, exploration, appointment selection, advisory, messaging and relevant role dashboard. Include 568/640/800-pixel short/medium heights, landscape, virtual keyboard and safe-area insets.

Verify no page-level horizontal overflow at 320; dedicated table scrollers have labels and card alternatives. Forms switch one/two columns at 900; drawers below 900, 80-wide rail at 900–1199, 240-wide sidebar at 1200+, content maximum 1440 and form/prose maximum 720. Test transitions one pixel below/at/above each breakpoint, including 359/360, 599/600, 899/900, 1199/1200 and 1599/1600.

Check web zoom at 100/200/400%, text enlargement, native default/largest accessibility text, reduced motion, keyboard-only use, visible focus, modal trapping/return, Escape/back and validation announcements. Exercise VoiceOver on iOS and macOS Safari, TalkBack on Android, and a Windows screen-reader/keyboard combination. Confirm headings, labels, reading order, selected tabs, currency units, timezone offsets and icon names; never rely on teal/red alone.

The **proposed browser matrix**, not a version-specific support claim: Windows Chrome/Edge; macOS Safari/Chrome; iPhone/iPad Safari; Android Chrome; desktop Firefox. Record exact versions/devices during execution. Include touch, mouse and hardware keyboard. Run essential journeys throughout; complete breakpoint coverage in the automation browser plus targeted cross-engine layout checks.

Native parity covers rules/outcomes, not identical widgets. Test installation, upgrade, permissions, background/resume, termination, interrupted uploads, expired sessions and delayed links. Offline never confirms bookings, redemptions, publication or consent changes. Reconnect refreshes authorization/server state. No persistent private finance/report cache by default; date public caches. Clear private views on logout/account change; obscure app-switcher previews.

## Requirement traceability and reconciliation

Q-\* quality trace keys connect tests to original headings, not Word pages or screen identifiers. Packages retain detailed field acceptance.

| Key   | Original source heading / retained requirement                                                                                 | Packages / tests                   |
|-------|--------------------------------------------------------------------------------------------------------------------------------|------------------------------------|
| Q-G   | Overview; Guest Mode; Interactive Guest Features: tour, counts, previews, quick match, testimonials, tips                      | 04,06,15 / 001–006                 |
| Q-M1  | Module 1: Basic Registration; Data Consent; Registration Approval Email: verification, approval, routing, identity             | 02,03 / 007–020                    |
| Q-M2  | Module 2: Student’s Full Profile & Academic Details; Flow & Process: education, evidence, preferences, assessment, save/review | 05,06 / 021–030                    |
| Q-M3  | Module 3: Parent & Financial Information: collaboration, housing/support, original currency, indicative costs, readiness       | 05 / 031–039                       |
| Q-M4  | Module 4: Alumni & Mentorship; Leaderboard: experience, topics, availability, reports, reciprocal feedback                     | 11 / 040–046                       |
| Q-M5  | Module 5: Alumni & Mentorship: parent education/topics, reports, feedback, success wall                                        | 11,15 / 047–050                    |
| Q-M6  | Module 6: Career Counselors: individual/company identity, credentials, domains, services, approvals and escalation             | 03,07 / 051–055                    |
| Q-M7  | Module 7: University & Scholarship Database; Entry Requirements; Accommodation Details; Visa Requirements; Scholarship Details | 04,06,13 / 056–067                 |
| Q-M8  | Module 8: Education Counselor Assignment & Feedback; Full Post-Appointment Workflow; no-show sections                          | 08–10,16 / 068–086                 |
| Q-R   | Rewards & Incentive Policy; Referral Program; Redeemable Rewards; sharing/templates/notifications; reward dashboards           | 12 / 087–096                       |
| Q-M11 | Module 11: Learning and Development: tutorials, courses, video, micro-learning, skills, parent guidance, library               | 14 / 097–100                       |
| Q-M12 | Module 12: News Feed; University; Scholarship Alerts; Save and Share                                                           | 15 / 101–104                       |
| Q-J   | Platform Alumni Success tracking; Enhanced Alumni Success Tracking; final roadmap paragraph                                    | 16 / 105–108                       |
| Q-A   | Admin & Oversight; approval comments; Admin Dashboard; data verification and system analytics                                  | 03,12,13,17 / 051–055,109–116      |
| Q-X   | Cross-cutting safety, accessibility, authorization and operational decisions                                                   | All / 109–116 plus platform matrix |

Traceability follows the original specification and adopted decisions. **No Modules 9 or 10 are invented.**

Conflict disposition is explicit:

- Module 2 “10 other options” versus overview “up to 10”: ten total universities; three saved university/program combinations; three review flags as a subset. Public ranges remain visible; only personalized costs/save/parent-share depend on complete Module 3.

<!-- -->

- Module 3 parent-preferred wording is encouragement, not an adult dependency. Declined optional money data means unknown readiness. “Google current rate” becomes a dated ExchangeRate-API snapshot, with a stale warning after 72 hours.

- Module 1 email/country “primary key” becomes immutable UUID plus sequential approved GSC identifier. Phone verification is not described as genuine login MFA. Staff TOTP and explicit guardian/relationship scopes supersede blanket parent access.

- Module 7 expressly removed acceptance rate, including its reappearance in tie-break examples. Visa-sponsorship flag stays excluded; work-integrated learning remains counselor discussion, not a catalog selector. Country-specific visa/work guidance remains in the later selected-country journey.

- Scholarship “no need to develop fields” versus long field table means URL-first cards with verified filter metadata and optional sourced extended details, not an in-app scholarship submission system.

- Module 8 24-hour versus two-day rescheduling becomes at least 48 hours. Standard meetings are 30 minutes, virtual, with 15-minute buffer and the adopted booking/workday boundaries; the incidental in-person table does not create a venue-booking product.

- Automatic recording/report-sharing wording becomes default-off participant/guardian consent, private AI drafts, counselor approval and minimal authenticated-link notices. All-parent attendance becomes scoped invitation. “Select a student” community language does not authorize a public student directory.

- Reward session-count notification becomes unique verified mentees; sample “20 hours” becomes actual verified minutes. No instant referral points, speculative donation options or unfunded gift-card promise. Gift-card fulfillment remains implemented but disabled until inventory/vendor evidence exists.

- The optional introduction video has no “40% faster response” promise or lifetime-memory campaign. No admissions guarantees, generic GPA conversion, acceptance probability, paid gateway, commission, subscription, accredited qualification, autonomous university submission or new university-role portal is added.

## Specified test catalogue

**G/W/T** means GIVEN/WHEN/THEN. Execute applicable unit/API/database/journey layers and each parameterized value. Blocked vendor cases never “pass by mock”.

### Guest and public overview

- **T001 \[Q-G\]** G published catalog; W guest opens overview; T counts match published records and tour works without registration.

<!-- -->

- **T002 \[Q-G\]** G country/subject selection; W quick match runs; T return up to 3–5 universities and 1–2 scholarships without fabricated padding.

- **T003 \[Q-G,Q-M7\]** G guest requests private endpoints; W bypassing registration prompts; T deny private data while retaining public fee ranges.

- **T004 \[Q-G,Q-M4\]** G mentor teaser; W inspecting public response; T only approved publishable fields, testimonials and generic questions appear.

- **T005 \[Q-G\]** G reduced-motion/data-conscious guest; W opening quick-tip video; T pause, captions and non-autoplay access remain available.

- **T006 \[Q-G\]** G interrupted guest request; W network returns; T retry preserves filters without duplicate navigation or private-profile creation.

### Module 1: registration and consent

- **T007 \[Q-M1\]** G applicant eligible for pilot; W email and phone verification complete; T submit once to pending review.

<!-- -->

- **T008 \[Q-M1\]** G student/parent selects No; W continuing; T truthful guest exit creates no private profile or inferred religious classification.

- **T009 \[Q-M1\]** G passwords of 11/12/128/129 characters; W submitting; T enforce 12–128 and upper/lower/number/symbol requirements.

- **T010 \[Q-M1\]** G valid password containing internal spaces; W paste and login; T exact password retained without trimming or paste prevention.

- **T011 \[Q-M1\]** G six-digit OTP; W submit before/at five-minute expiry; T accept only before expiry and never reuse consumed challenge.

- **T012 \[Q-M1\]** G challenge failures/resends; W fifth failure, resend before 60 seconds or sixth hourly send; T enforce limits and accessible recovery.

- **T013 \[Q-M1\]** G changed normalized email; W reverification succeeds; T retain UUID/GSC identity and reject normalized-email collision.

- **T014 \[Q-M1,Q-A\]** G two approval requests; W committing concurrently; T one approval/identifier/notification event, including GSC-999999 rollover.

- **T015 \[Q-M1\]** G age just below/at 13; W independent registration; T under-13 guardian-operated case only; 13–17 activation requires verified guardian.

- **T016 \[Q-M1,Q-M3\]** G adult applicant; W declining parent invitation; T complete own journey without mandatory parent linkage.

- **T017 \[Q-M1,Q-M3\]** G similar surname/unverified parent email; W requesting case access; T no automatic relationship or financial access.

- **T018 \[Q-M1,Q-X\]** G staff without completed TOTP; W privileged login; T no counselor/admin access until MFA succeeds.

- **T019 \[Q-M1\]** G camera/gallery permission denied; W choosing profile picture; T explain alternative upload and preserve registration data.

- **T020 \[Q-M1,Q-X\]** G publication/notification consent withdrawn; W pending jobs execute; T recheck purpose permission and suppress unauthorized processing.

### Module 2: academics and exploration

- **T021 \[Q-M2\]** G academic profile; W saving education, grades and tests; T retain original grading scale, dates and evidence associations.

<!-- -->

- **T022 \[Q-M2\]** G optional activities/goals; W sixth activity or 201-word goal submitted; T reject excess without losing accepted entries.

- **T023 \[Q-M2\]** G catalog supports three countries; W completing profile with two/four/duplicate countries; T require exactly three distinct ordered choices.

- **T024 \[Q-M2\]** G catalog supports fewer than three countries; W completing preferences; T allow available count and explain limitation.

- **T025 \[Q-M2\]** G preferences changed; W recommendations rebuild; T deduplicate to ten total, manual first, deterministic city/country/cost/rank fill.

- **T026 \[Q-M2\]** G complete Module 3 and two saves; W two concurrent additional saves; T exactly one succeeds and total remains three.

- **T027 \[Q-M2\]** G three saved programs; W review-flag or unsave operation; T flags remain a maximum-three subset of saved combinations.

- **T028 \[Q-M2\]** G complete weighted criteria; W scores cross 59.99/60/84.99/85; T apply specified bands without display-rounding changing classification.

- **T029 \[Q-M2\]** G high score with hard unmet or unknown mandatory criterion; W evaluating; T hard failure overrides; unknown remains provisional.

- **T030 \[Q-M2,Q-X\]** G interrupted private evidence upload; W resume/retry; T no duplicate attachment or exposed file; optional video earns no response promise.

### Module 3: parent and finances

- **T031 \[Q-M3\]** G authorized student/parent; W valid Module 3 including housing/support saved; T personalized budget and eligible save/share gates unlock.

<!-- -->

- **T032 \[Q-M3\]** G savings explicitly declined; W completing Module 3; T profile completes and readiness remains Unknown, not zero.

- **T033 \[Q-M3\]** G annual tuition 12000/monthly accommodation 500; W comparing; T annual comparison equals 18000, separate from broader budget.

- **T034 \[Q-M3\]** G savings 22500/expense 18000; W readiness calculated; T show 125%; income is not added to savings.

- **T035 \[Q-M3\]** G zero/unknown expense; W readiness requested; T no division error, infinity or fabricated score.

- **T036 \[Q-M3\]** G foreign-currency figures; W FX changes; T retain originals and snapshot rate/date/provider; warn after 72 hours.

- **T037 \[Q-M3\]** G confirmed scholarship and itemized expense; W recomputing budget; T award is applied once and full-program fees are not annualized blindly.

- **T038 \[Q-M3,Q-X\]** G parent A replaces child ID with unrelated B; W reading/editing/exporting; T deny across API, storage and realtime.

- **T039 \[Q-M3\]** G concurrent parent/student edits; W stale version saves; T conflict is explicit and neither financial update silently overwrites.

### Module 4: alumni mentoring

- **T040 \[Q-M4\]** G alumni completing profile; W selecting two/three/four topics; T exactly three required; experience/employment fields persist.

<!-- -->

- **T041 \[Q-M4\]** G monthly availability 1.99/2 hours; W activation; T minimum two hours enforced.

- **T042 \[Q-M4\]** G current student with anticipated graduation; W seeking mentor activation; T require admin verification, retain current status.

- **T043 \[Q-M4,Q-X\]** G mentor not connected to student; W opening student directory/chat; T no general directory or unsolicited private access.

- **T044 \[Q-M4\]** G accepted mentoring request; W session completed; T correct mentor/mentee IDs, duration and good/bad summary points logged.

- **T045 \[Q-M4\]** G completed session; W both parties submit appropriate feedback; T preserve source question scales and prevent duplicate rating inflation.

- **T046 \[Q-M4,Q-R\]** G repeated sessions with one mentee; W leaderboard/tier recalculates; T unique mentees count once and verification badge stays separate.

### Module 5: parent mentoring

- **T047 \[Q-M5\]** G parent mentor; W saving education and four topics; T preserve education and enforce maximum three parent-relevant topics.

<!-- -->

- **T048 \[Q-M5\]** G parent mentor below two monthly hours; W completing availability; T require minimum two hours with explanatory validation.

- **T049 \[Q-M5,Q-M3\]** G alumni parent mentoring another parent; W opening mentee’s child finances; T mentorship alone grants no financial access.

- **T050 \[Q-M5\]** G parent mentoring completed; W summary/feedback submitted; T correct identities, session type and parent-specific questions persist.

### Module 6: counselors

- **T051 \[Q-M6\]** G company versus individual registration; W completing practice details; T company identification is conditional; expertise/services/credentials retained.

<!-- -->

- **T052 \[Q-M6,Q-A\]** G application pending seven days; W escalation worker runs twice; T supervisor receives one escalation with audit history.

- **T053 \[Q-M6\]** G suspended/unapproved counselor; W requesting match inclusion or student data; T deny both regardless of cached profile.

- **T054 \[Q-M6,Q-X\]** G public counselor profile; W viewing payload; T credentials/private address/admin comments/community linkage are absent.

- **T055 \[Q-M6,Q-A\]** G reviewer changes credential outcome; W saving; T immutable actor/reason/time recorded and publication eligibility recomputed.

### Module 7: university and scholarship database

- **T056 \[Q-M7\]** G authorized catalog editor; W publishing program; T level/duration/fee basis/criteria/source/verification metadata validate.

<!-- -->

- **T057 \[Q-M7\]** G missing cost/ranking; W sorting recommendations; T unknown is not zero/best and comparable annual costs only determine affordability.

- **T058 \[Q-M7\]** G imported URL content; W extraction finishes; T draft enters human review, never direct publication.

- **T059 \[Q-M7,Q-X\]** G URL redirects to internal/private address; W worker resolves each hop; T reject retrieval without exposing network credentials.

- **T060 \[Q-M7\]** G rankings from different years/sources; W comparison; T retain source/year/program context and do not invent equivalence.

- **T061 \[Q-M7\]** G acceptance-rate/visa-sponsorship payload fields; W import/display/tie-break runs; T excluded fields never influence results.

- **T062 \[Q-M7\]** G month-only deadline; W viewing/filtering; T preserve month precision rather than fabricated day or urgency.

- **T063 \[Q-M7,Q-M8\]** G counseling incomplete or target absent; W requesting application-action URL; T deny while general information URL remains public.

- **T064 \[Q-M7\]** G counseling complete and country finalized; W visa/work guidance opened; T show sourced level/country guidance, dates and indicative fees.

- **T065 \[Q-M7\]** G scholarship URL card; W filter/detail opened; T minimal verified metadata works without mandatory full-field entry or in-app submission.

- **T066 \[Q-M7\]** G expired/closed scholarship or withdrawn program; W delayed saved link opens; T current status shown and invalid action blocked.

- **T067 \[Q-M7,Q-A\]** G review due or conflicting partner update; W quarterly audit/import runs; T queue review and retain previous published version until approved.

### Module 8: matching, sessions and follow-up

- **T068 \[Q-M8\]** G approved active experts; W matching; T field30/country20/availability10/rating10/workload30 totals correctly; missing rating contributes neutral five.

<!-- -->

- **T069 \[Q-M8\]** G highest match unavailable; W student chooses another eligible expert; T final choice honored without promised admission probability.

- **T070 \[Q-M8\]** G counselor timezone; W earliest booking boundary tested; T later of next local calendar day and 24-hour lead applies.

- **T071 \[Q-M8\]** G 30-minute session; W adjacent/end-of-day slots computed; T 15-minute buffer and finish 60 minutes before workday close enforced.

- **T072 \[Q-M8\]** G two students race for slot; W transactional confirmation; T one booking succeeds, loser sees refreshed alternatives.

- **T073 \[Q-M8,Q-M4\]** G existing counseling appointment; W another counseling/mentor booking requested; T second counseling denied; separate single mentor allowance preserved.

- **T074 \[Q-M8\]** G spring DST missing time; W recurring availability expands; T nonexistent local slot is omitted without changing confirmed instants.

- **T075 \[Q-M8\]** G autumn DST repeated time; W selecting slot; T distinguish UTC offsets and confirm exactly the selected instant.

- **T076 \[Q-M8\]** G appointment 48 hours/47h59m away; W self-reschedule; T allow only first; audited admin exception remains separate.

- **T077 \[Q-M8\]** G cancellation before/inside 24 hours; W cancel; T release slot, label late when applicable, charge nothing.

- **T078 \[Q-M8\]** G calendar/conference adapter timeout; W booking confirms; T retain booking, show sync failure/link preparing and allow safe retry.

- **T079 \[Q-M8\]** G duplicated reminder jobs; W 24h/2h/10m sends execute; T each event/channel/version has one authorized send intent.

- **T080 \[Q-M8\]** G rescheduled/canceled appointment or reminder opt-out; W old queued reminder executes; T revalidate state and suppress obsolete notice.

- **T081 \[Q-M8\]** G participant refuses recording; W session starts; T meeting/manual summary work and no recording/transcription starts.

- **T082 \[Q-M8\]** G recorded session; W participant withdraws or new participant joins; T capture pauses/stops until valid all-participant consent, including guardian.

- **T083 \[Q-M8,Q-X\]** G transcript contains instructions to reveal another case; W AI draft generated; T no tool action/data expansion and human review required.

- **T084 \[Q-M8\]** G private notes/QA feedback/draft advisory; W student views report; T only counselor-approved shareable version accessible.

- **T085 \[Q-M8\]** G session ends or participant absent; W reconciling attendance; T completion/no-show distinguished, counselor miss escalated and rebooking offered.

- **T086 \[Q-M8\]** G safety-related counselor-change reason; W handoff/follow-up runs; T full safety report stays admin-only; authorized tasks close/update without note leakage.

### Rewards, referrals and reward administration

- **T087 \[Q-R\]** G completed/logged/rated/admin-approved mentoring session; W approval retries; T append exactly one 25-point award.

<!-- -->

- **T088 \[Q-R\]** G referred student not approved or Modules 2/3 incomplete; W referral processed; T no points until all conditions; self-referral denied.

- **T089 \[Q-R\]** G valid copied/QR/shared referral; W delayed signup completes; T attribution preserved once without promising instant points.

- **T090 \[Q-R\]** G unique mentee counts 4/5/9/10/14/15/24/25; W tier updates; T Star/Silver/Gold/Platinum thresholds and notifications use unique mentees.

- **T091 \[Q-R\]** G balance 499/500; W recognition-pack redemption; T reject below 500; reserve once at 500 with clear fulfillment status.

- **T092 \[Q-R,Q-X\]** G 500 points and concurrent redemptions; W requests commit; T one reservation only, no negative available balance.

- **T093 \[Q-R\]** G unfunded gift cards; W catalog viewed; T disabled; enabled inventory displays 10–12 working-day fulfillment, never instant issuance.

- **T094 \[Q-R\]** G five/six calendar months inactive; W scheduled jobs repeat; T one warning then append-only spendable expiry; reservations remain reconciled.

- **T095 \[Q-R\]** G sign-in/qualifying activity races expiry; W transactions serialize; T activity timestamp rechecked and no duplicate or unjustified expiry.

- **T096 \[Q-R\]** G verified session minutes and Gold+ tier; W certificate/invitation generated; T actual hours and managed event content only; no invented achievement.

### Module 11: learning

- **T097 \[Q-M11\]** G published learning catalog; W category navigation; T tutorials/courses/videos/micro-lessons/skills/parent guidance/library are all reachable.

<!-- -->

- **T098 \[Q-M11\]** G lesson partially completed; W background/resume across devices; T persisted progress resumes without falsely completing unseen content.

- **T099 \[Q-M11\]** G video or PDF unavailable; W learning opened; T accessible caption/transcript or alternative resource and retry guidance appear.

- **T100 \[Q-M11\]** G counselor draft or withdrawn resource; W member requests direct URL; T no unpublished access or accredited-qualification claim.

### Module 12: news

- **T101 \[Q-M12\]** G counselor/university content submission; W submitted; T verified review workflow required, not independent university-admin privilege.

<!-- -->

- **T102 \[Q-M12\]** G published admission/scholarship/fair/program/platform update; W browsing; T concise preview and full accessible content render.

- **T103 \[Q-M12\]** G repeated save/like/follow requests; W retry after timeout; T one final state; sharing reveals only permitted content.

- **T104 \[Q-M12,Q-X\]** G consent withdrawn from named story; W feed/cache/delayed link requested; T public item removed and no private fallback exposed.

### Alumni journey and roadmap

- **T105 \[Q-J\]** G selected university criteria; W roadmap generated; T owner/status/due date/document evidence tracked without external submission.

<!-- -->

- **T106 \[Q-J\]** G self-reported visa/arrival/semester/internship/graduation/job updates; W saved; T remain private unless separately approved for publication.

- **T107 \[Q-J\]** G inconsistent milestone dates; W save/report attempted; T flag inconsistency, preserve provenance and avoid fabricated positive durations.

- **T108 \[Q-J\]** G missing semester/job outcomes; W analytics generated; T unknown excluded from observed-outcome denominator but reported in coverage denominator.

### Administration, privacy and operations

- **T109 \[Q-A,Q-X\]** G ordinary member/alumni token; W object-ID substitution across APIs/storage/realtime/export; T deny other cases, money data and recordings.

<!-- -->

- **T110 \[Q-A,Q-X\]** G worker dies after provider acceptance; W lease expires/retry starts; T reconcile delivery ID before resend; uncertain delivery is flagged.

- **T111 \[Q-A,Q-X\]** G recording30d/transcript90d retention boundaries; W purge runs; T expired objects/references removed except documented holds.

- **T112 \[Q-A,Q-X\]** G account deletion/export request; W verified workflow completes; T export excludes others’ private notes; deletion follows 30-day workflow/holds.

- **T113 \[Q-X\]** G client offline/backgrounded with stale permissions; W resumes or delayed authenticated link opens; T reauthenticate/refetch before private content/action.

- **T114 \[Q-X\]** G platform/viewport matrix; W keyboard/zoom/VoiceOver/TalkBack traversal; T all essential tasks work without hidden controls or unlabeled actions.

- **T115 \[Q-A,Q-X\]** G backup and pending outbox; W restore/redeploy drill; T reconcile counts/balances/jobs without replaying fulfilled external actions.

- **T116 \[Q-A,Q-X\]** G malformed file, script content or oversized payload; W upload/render/API processing; T reject/quarantine safely and redact sensitive diagnostics.

## Threat model and data-quality invariants

Prioritize IDOR across parents, role escalation, alumni access to money/recordings, stolen links, private-note leakage and withdrawn-consent processing as release-blocking threats. Verify server authorization on every object read/write, signed-object issuance, export and realtime subscription. Revocation invalidates future authorized access; the product must not promise to retract files already legitimately downloaded.

Treat page text, documents, transcripts and AI output as untrusted. AI cannot independently grant access, publish, award points or determine eligibility. Constrain URLs/redirects/outbound destinations, schemas, sizes and timeouts. Verify webhook signatures, replay handling, secret rotation and redaction. Record adversarial fixtures and containment evidence.

Daily invariant checks must reconcile: UUID uniqueness and unrecycled GSC IDs; verified relationship scopes; saved/review caps; single active appointments per type; nonoverlapping expert occupancy; criterion source/version; original currency/fee basis; positive FX rates; no unknown-as-zero conversions; and published content attribution. Monetary readiness uses the stated horizon and no intermediate rounding.

Rewards reconcile earned minus redeemed/expired against available plus reserved, with compensating entries rather than ledger edits. Session credits are unique by qualifying session; referrals unique by qualifying referred student; tiers count distinct supported verified mentees. Jobs have bounded retries, lease ownership, attempt history and dead-letter inspection. A database commit and its outbox event are atomic; external delivery is reconciled rather than falsely claiming end-to-end exactly-once delivery.

Privacy text is implementation-oriented drafting, **not legal advice** and not a compliance claim. Notices must describe actual purposes, recipients, providers/regions, optional fields, recording choices, publication choices, retention, account rights and support contact. Separate consent purposes and versions; do not treat accepting a general policy as permission for recording, named publicity or all-parent sharing. Legal and rights review supplies release evidence, not new product approval questions.

## Success measurement without misleading attribution

Instrument server-confirmed events with pseudonymous account/case IDs, event ID, timestamp, cohort, platform and schema version; exclude document text, religion, money amounts and transcripts. Product/analytics owns definitions; backend owns reconciliation; QA compares event counts to fixture transactions. Use approval-week cohorts for onboarding, session-week cohorts for counseling, and actual university-start/graduation cohorts for outcomes.

| Metric                        | Numerator / denominator and interpretation                                                                                                                                                       |
|-------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Seven-day activation          | Approved students completing Modules 2/3 and saving a program within seven days / approved students with seven elapsed observation days. Declined optional finances still count complete.        |
| Core journey completion       | Activated students receiving first approved advisory within 30 days / activated students with 30 elapsed observation days. Report unavailable-counselor cases separately, not silently excluded. |
| Attendance                    | Confirmed noncanceled sessions with both parties’ attendance evidence / confirmed noncanceled sessions whose scheduled end elapsed. Unknown attendance gets its own count.                       |
| Advisory timeliness           | Completed sessions with approved advisory within 24 hours / completed sessions with at least 24 hours elapsed. Missing advisory is a failure, not omitted.                                       |
| Feedback response and clarity | Valid respondents / completed sessions eligible for feedback; positive clarity responses / valid clarity responses. Keep source role-specific scales distinct.                                   |
| Financial-data coverage       | Completed Module 3 cases with usable savings and expense denominator / all completed Module 3 cases. Report declines/missing costs separately; low disclosure is not failure.                    |
| Academic outcome              | Self-reported passing first-semester standing / valid reported first-semester outcomes within a university-start cohort. Also report respondents / cohort members due for follow-up.             |
| Placement within 180 days     | Graduates reporting first offer by 180 days / graduates with known 180-day outcome and full observation. Separately show known outcomes / all eligible graduates.                                |
| Time to internship/offer      | Median elapsed days among valid reported events with known start/graduation dates; denominator is that observed subset. Report subset size and missing/censored counts alongside median.         |
| Perceived platform influence  | “Yes” responses / valid Yes-or-No answers to influence question; response coverage / all invited cohort members. This is perceived influence, not causal attribution.                            |
| Operational correctness       | Duplicate business effects or unauthorized accesses / tested attempts; notification failures / eligible send intents; reconciliation discrepancies / checked entities.                           |

Proposed engineering gates are zero unauthorized fixture accesses, zero duplicate financial/booking effects, 100% fixture-event reconciliation, and no unexplained ledger discrepancy. For product adoption/outcome metrics, establish the first complete observation-window baseline before setting improvement targets. Always publish numerator, denominator, observation window, unknowns and cohort size; suppress small sensitive breakdowns using a minimum-ten reporting rule. Do not infer admission, academic or employment improvement from self-selected respondents, omit nonrespondents, or label temporal associations “platform advantage”.

## Phased release and evidence gates

**Foundation and integration proving:** complete WP-01–04 and the conferencing/native technical spike. Provision separate development/staging/production credentials and verify EU Frankfurt placement where available, documenting other regions/subprocessors. Demonstrate staff MFA, row protections, private files, audit and repeatable deployment before any real personal-data pilot.

**Core journey construction:** complete WP-05–09. Run student, independent adult, guardian and counselor journeys on web/iOS/Android. Manual advisory remains available when recording or AI is unavailable. A limited pilot may expose only enabled, tested capabilities with truthful messaging, but its release notes explicitly list the remaining full-product packages.

**Complete-source construction:** deliver WP-10–16 in dependency order, parallelizing learning/news with mentorship where safe. Build rewards after contribution evidence, advanced catalog after review infrastructure, and public success stories after publication controls. Gift-card functionality remains operationally gated until funded fulfillment exists; this is not permission to omit its workflow implementation.

**Release hardening and expansion:** WP-17 closes functional, security, accessibility, native, content and operational evidence. Execute all relevant specified cases; record build, fixture, device, observed result and defect reference. Critical/high-severity security, data-loss, incorrect-balance or blocked-core-journey defects prevent release. Cosmetic accepted defects need owner, impact, workaround and retest plan; failed safety controls are not waivable cosmetic issues.

DevOps owns real provisioning evidence for Resend delivery domains, Twilio verification/opt-in templates, Daily meeting/recording behavior, OpenAI adapter access, Google/Microsoft OAuth callback and calendar scopes, FX responses and map-link handling. Check callback authenticity, quotas/timeouts, rejection paths and provider outage recovery using actual accounts. No selected vendor capability is presumed proven by its inclusion here.

Content/legal operations must verify ranking-feed permissions or permitted manual entries, university retrieval rights, logos, testimonials, video/music/font rights, participant recording arrangements, child-safety procedures, privacy notices, processor terms and any cross-region transfer arrangements. Confirm functioning support contact and export/deletion routes. Unverified rights block the affected publication/integration, not trigger a product-choice questionnaire.

Native release evidence includes organization store accounts, signing/bundle identities, app links/domain association, camera/microphone/photo permission explanations, applicable privacy/data disclosures matching actual SDK behavior, age/content classifications, account-deletion route, review credentials, screenshots, support/privacy URLs and platform policy review current at submission. Check both stores’ actual requirements during release preparation rather than claiming advance acceptance or fixed version support.

Roll out through staff fixtures, consented pilot cohorts, then progressively wider cohorts after observed stability. Use feature switches for ingestion, recording/AI and redemption; preserve existing bookings and ledger truth during rollback. Test backward-compatible migrations, restore and worker reconciliation before expansion. Pause rollout for unauthorized disclosure, balance drift, lost appointments or widespread core failures; assign incident lead, preserve restricted evidence, disable the affected action and communicate known impact without speculation.

The release dossier includes traceability, executed tests, defects, design/vendor/rights/privacy reviews, restore evidence, store outcomes, content inventory, monitoring ownership and support training. Completion requires gates for the entire retained scope, not just a live pilot. No committed date or budget is invented.

[^1]: Expo monorepo documentation: <https://docs.expo.dev/guides/monorepos/>

[^2]: Supabase Next.js guide: <https://supabase.com/docs/guides/getting-started/quickstarts/nextjs>

[^3]: WCAG 2.2: <https://www.w3.org/TR/WCAG22/>

[^4]: ETS score-report guidance: <https://www.ets.org/toefl/test-takers/ibt/scores/understand-scores.html>

[^5]:

[^6]:
