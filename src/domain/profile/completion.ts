import { validateEducationSection, type EducationSectionInput } from "./education";
import { validateExperience, type ExperienceInput } from "./experience";
import { validatePreferences, type PreferencesInput } from "./preferences";
import { validateTestsSection, type TestResultInput } from "./tests";

export const MODULE2_STEPS = [
  "education",
  "tests",
  "preferences",
  "experience",
  "review",
] as const;

export type Module2Step = (typeof MODULE2_STEPS)[number];

export interface Module2Snapshot {
  education: EducationSectionInput;
  testsTaken: boolean | null;
  tests: TestResultInput[];
  preferences: PreferencesInput;
  experience: ExperienceInput;
  supportedCountryCount: number;
  undecidedDisciplineId: string | null;
}

export interface CompletionReport {
  complete: boolean;
  missing: string[];
  firstIncompleteStep: Module2Step;
}

export function module2MissingFields(snapshot: Module2Snapshot): string[] {
  const missing: string[] = [];

  if (!snapshot.education.level) {
    missing.push("student.education_level");
  }
  if (snapshot.education.educationYears === null) {
    missing.push("student.education_years");
  }
  if (snapshot.education.records.length === 0) {
    missing.push("education.school.name");
  }
  missing.push(
    ...validateEducationSection(snapshot.education).map((error) => error.path),
  );

  if (snapshot.testsTaken === null) {
    missing.push("student.tests_taken");
  }
  missing.push(
    ...validateTestsSection({
      testsTaken: snapshot.testsTaken,
      tests: snapshot.tests,
    }).map((error) => error.path),
  );

  missing.push(
    ...validatePreferences(
      snapshot.preferences,
      snapshot.supportedCountryCount,
      snapshot.undecidedDisciplineId,
    ).map((error) => error.path),
  );

  missing.push(
    ...validateExperience(snapshot.experience).map((error) => error.path),
  );

  return [...new Set(missing)];
}

export function firstIncompleteStep(snapshot: Module2Snapshot): Module2Step {
  const missing = new Set(module2MissingFields(snapshot));
  if (
    [...missing].some(
      (key) =>
        key.startsWith("student.education") ||
        key.startsWith("education.") ||
        key.startsWith("records.") ||
        key === "level" ||
        key === "educationYears",
    )
  ) {
    return "education";
  }
  if ([...missing].some((key) => key.startsWith("tests") || key === "student.tests_taken")) {
    return "tests";
  }
  if (
    [...missing].some((key) =>
      [
        "targetLevel",
        "fieldIds",
        "previousFieldIds",
        "disciplineIds",
        "countries",
        "intakeMonth",
        "accommodation",
      ].some((prefix) => key === prefix || key.startsWith(`${prefix}.`)),
    )
  ) {
    return "preferences";
  }
  if (
    [...missing].some(
      (key) =>
        key.startsWith("careerGoal") ||
        key.startsWith("activities") ||
        key.startsWith("awards") ||
        key.startsWith("scholarship") ||
        key.startsWith("relative"),
    )
  ) {
    return "experience";
  }
  return "review";
}

export function evaluateModule2(snapshot: Module2Snapshot): CompletionReport {
  const missing = module2MissingFields(snapshot);
  return {
    complete: missing.length === 0,
    missing,
    firstIncompleteStep: firstIncompleteStep(snapshot),
  };
}

export function profileStepHref(caseId: string, step: Module2Step): string {
  switch (step) {
    case "education":
      return `/cases/${caseId}/profile/education`;
    case "tests":
      return `/cases/${caseId}/profile/tests`;
    case "preferences":
      return `/cases/${caseId}/profile/preferences`;
    case "experience":
      return `/cases/${caseId}/profile/experience`;
    default:
      return `/cases/${caseId}/profile`;
  }
}

export function module2ProgressPercent(snapshot: Module2Snapshot): number {
  const checks = [
    Boolean(snapshot.education.level) && snapshot.education.educationYears !== null,
    snapshot.education.records.length > 0,
    snapshot.testsTaken !== null,
    Boolean(snapshot.preferences.targetLevel && snapshot.preferences.fieldIds.length > 0),
    snapshot.preferences.countries.length > 0,
    Boolean(snapshot.experience.careerGoal.trim()),
    snapshot.experience.scholarshipReceived !== null,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}
