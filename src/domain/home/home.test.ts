import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStudentHome, type StudentHomeInput } from "./home";

function emptyInput(overrides: Partial<StudentHomeInput> = {}): StudentHomeInput {
  return {
    studentName: "",
    gscId: null,
    caseId: null,
    profileReport: null,
    profilePercent: 0,
    module2Complete: false,
    recommendationCount: null,
    shortlist: [],
    deadlines: [],
    incompleteDocuments: [],
    readiness: null,
    ...overrides,
  };
}

describe("student home widgets", () => {
  it("renders honest empty widgets for a new student and invents no catalog or session rows", () => {
    const home = buildStudentHome(emptyInput());
    assert.equal(home.greetingName, "there");
    assert.equal(home.gscId, "Not provided");
    assert.equal(home.profile.complete, false);
    assert.equal(home.recommendations.empty, true);
    assert.equal(home.recommendations.count, null);
    assert.equal(home.recommendations.items.length, 0);
    assert.equal(home.shortlist.savedCount, 0);
    assert.equal(home.shortlist.empty, true);
    assert.equal(home.deadlines.empty, true);
    assert.equal(home.documents.empty, true);
    assert.equal(home.messages.empty, true);
    assert.equal(home.session.empty, true);
    assert.equal(home.tasks.empty, true);
    assert.equal(home.scholarships.empty, true);
    assert.equal(home.mentorship.empty, true);
    assert.equal(home.readiness.empty, true);
    assert.equal(home.readiness.displayPercent, null);
    assert.equal(home.news.empty, true);
    assert.equal(home.journey.empty, true);
    assert.equal(home.journey.href, "/journey");
    assert.equal(home.tasks.count, 0);
    assert.equal(home.tasks.href, "/tasks");
    assert.ok(home.nextActions.some((action) => action.href === "/profile"));
    assert.equal(home.messages.emptyMessage.includes("unanswered counselor"), true);
  });

  it("shows real shortlist, deadline and readiness values for a complete student without filling empty modules", () => {
    const home = buildStudentHome(
      emptyInput({
        studentName: "Ada",
        gscId: "GSC-1",
        caseId: "11111111-1111-4111-8111-111111111111",
        module2Complete: true,
        profilePercent: 100,
        profileReport: {
          complete: true,
          missing: [],
          firstIncompleteStep: "review",
        },
        recommendationCount: 2,
        shortlist: [
          {
            id: "s1",
            universityName: "SYNTHETIC University",
            programName: "SYNTHETIC Program",
          },
        ],
        deadlines: [
          {
            key: "ucas",
            label: "UCAS · equal consideration",
            when: "2027-01-15",
            tone: "neutral",
            toneLabel: "Scheduled",
          },
        ],
        incompleteDocuments: [{ id: "f1", label: "Transcript in review" }],
        unansweredCounselorMessages: [
          {
            conversationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            preview: "Please reply when you can",
            href: "/messages/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          },
        ],
        readiness: {
          displayPercent: "120.0",
          barValue: 100,
          savingsDeclined: false,
          known: true,
        },
      }),
    );
    assert.equal(home.greetingName, "Ada");
    assert.equal(home.gscId, "GSC-1");
    assert.equal(home.profile.complete, true);
    assert.equal(home.profile.ctaLabel, "Explore matches");
    assert.equal(home.recommendations.empty, false);
    assert.equal(home.recommendations.count, 2);
    assert.equal(home.recommendations.items.length, 0);
    assert.equal(home.shortlist.savedCount, 1);
    assert.equal(home.shortlist.items[0]?.universityName, "SYNTHETIC University");
    assert.equal(home.deadlines.items.length, 1);
    assert.equal(home.documents.items.length, 1);
    assert.equal(home.readiness.displayPercent, "120.0");
    assert.equal(home.readiness.barValue, 100);
    assert.equal(home.session.empty, true);
    assert.equal(home.messages.empty, false);
    assert.equal(home.messages.items[0]?.preview, "Please reply when you can");
    assert.equal(home.news.empty, true);
    assert.ok(home.nextActions.some((action) => action.href === "/journey"));
  });

  it("feeds derived roadmap tasks and private milestones into the home widgets", () => {
    const caseId = "11111111-1111-4111-8111-111111111111";
    const home = buildStudentHome(
      emptyInput({
        caseId,
        roadmapTasks: [
          { id: "t1", title: "UCAS personal statement", status: "open" },
        ],
        journeyItems: [
          { id: "m1", label: "University start", when: "2026-09-01" },
        ],
      }),
    );
    assert.equal(home.tasks.empty, false);
    assert.equal(home.tasks.count, 1);
    assert.equal(home.tasks.href, `/cases/${caseId}/roadmap`);
    assert.equal(home.journey.empty, false);
    assert.equal(home.journey.items[0]?.label, "University start");
    assert.equal(home.journey.href, "/journey");
  });

  it("never turns a declined savings disclosure into a readiness percentage", () => {
    const home = buildStudentHome(
      emptyInput({
        caseId: "11111111-1111-4111-8111-111111111111",
        readiness: {
          displayPercent: "80.0",
          barValue: 80,
          savingsDeclined: true,
          known: true,
        },
      }),
    );
    assert.equal(home.readiness.empty, true);
    assert.equal(home.readiness.displayPercent, null);
    assert.ok(home.readiness.message.includes("declined"));
  });
});
