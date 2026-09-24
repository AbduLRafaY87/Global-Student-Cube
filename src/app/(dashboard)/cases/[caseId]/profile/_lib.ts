import {
  evaluateModule2,
  module2ProgressPercent,
  type Module2Snapshot,
} from "@/domain/profile/completion";
import type { LoadedProfile } from "@/server/modules/profile/load";

export function toSnapshot(
  profile: LoadedProfile,
  supportedCountryCount: number,
  undecidedDisciplineId: string | null,
): Module2Snapshot {
  return {
    education: {
      level: profile.level as Module2Snapshot["education"]["level"],
      educationYears: profile.educationYears,
      records: profile.records,
    },
    testsTaken: profile.testsTaken,
    tests: profile.tests,
    preferences: {
      continuingField: profile.continuingField,
      targetLevel: profile.targetLevel as Module2Snapshot["preferences"]["targetLevel"],
      fieldIds: profile.fieldIds,
      previousFieldIds: profile.previousFieldIds,
      disciplineIds: profile.disciplineIds,
      specializationIds: profile.specializationIds,
      countries: profile.countries,
      intakeMonth: profile.intakeMonth,
      intakeYear: profile.intakeYear,
      intakeUndecided: profile.intakeUndecided,
      accommodation: profile.accommodation as Module2Snapshot["preferences"]["accommodation"],
    },
    experience: {
      careerGoal: profile.careerGoal,
      activities: profile.activities,
      scholarshipReceived: profile.scholarshipReceived,
      scholarshipNotGranted: profile.scholarshipNotGranted,
      awards: profile.awards,
      relative: profile.relative,
      introFileId: profile.introFileId,
    },
    supportedCountryCount,
    undecidedDisciplineId,
  };
}

export function profileMetrics(
  profile: LoadedProfile,
  supportedCountryCount: number,
  undecidedDisciplineId: string | null,
) {
  const snapshot = toSnapshot(profile, supportedCountryCount, undecidedDisciplineId);
  return {
    snapshot,
    report: evaluateModule2(snapshot),
    percent: module2ProgressPercent(snapshot),
  };
}
