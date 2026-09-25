# Manual test sheet

Cases the catalogue cannot run in CI without owner credentials, assistive technology, or a vendor account. Do not mark these passed by mock.

| test id | Why manual | Steps | Pass when |
|---------|------------|-------|-----------|
| T005 | Captions + AT | Open a published video lesson. Tab to play/pause. Enable captions. Repeat with NVDA or VoiceOver. | Captions visible, controls reachable, no unlabeled control |
| T006 live | Login lockout against Auth | Fail login 5 times on one email from one IP | 429 and “Too many attempts”; sixth try still blocked in the window |
| T013 vendor | Resend | Request verification email on a real inbox | Email arrives; link verifies; unverified still blocked |
| T018 live | Staff MFA | Sign in as counselor/admin with AAL2 required | MFA challenge appears; dashboard blocked until verified |
| T019 | Screen-reader signup | AUTH-01→04 with NVDA/VoiceOver/TalkBack | Every field has a name; errors announced; no keyboard trap |
| T030 live | Upload + scan | Upload PDF transcript; try HTML/SVG | PDF pending→clean or rejected; HTML/SVG blocked |
| T039 live | If-Match | Concurrent profile save from two tabs | Second write 409/conflict, no silent clobber |
| T051, T068–T070 | SES-01–05 not built | n/a until counselor matching ships | Do not pass |
| T078, T079 | Daily room | Join lobby, equipment check, roster | Camera check works; failure stays “Preparing link” |
| T080 | Session follow-up task | After a completed session, confirm a case task | Task is case-scoped |
| T110 | Outbox worker | WP-17 worker not built | Do not pass |
| T114 AT | Screen reader / keyboard | Follow `docs/release/accessibility-checklist.md` on public + one signed-in role | WCAG 2.2 AA checklist complete |
| T115 | Restore | Owner runs PITR on the test project | Row restored; audit retained |
| Role e2e | No invented accounts | Set `PLAYWRIGHT_{STUDENT,PARENT,COUNSELOR,ADMIN}_EMAIL/PASSWORD` and re-run `npm run test:e2e` | Each role lands on its workspace |
| Native | D1 web only | n/a | Not a release gate |

Vendor adapters (Resend, Twilio Verify, Daily, OpenAI, calendar, FX) stay on this sheet until the named account is proved. Sandbox fallback is `DEPENDENCY_UNAVAILABLE`, not a pass.
