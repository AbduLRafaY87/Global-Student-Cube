export const TOUR_AUDIENCES = [
  "overall",
  "student",
  "parent",
  "mentor",
  "counselor",
] as const;

export type TourAudience = (typeof TOUR_AUDIENCES)[number];

export interface TourStep {
  title: string;
  instructions: [string, string, string];
}

export const TOUR_STEPS: Record<TourAudience, TourStep[]> = {
  overall: [
    {
      title: "Explore published universities",
      instructions: [
        "Browse the public catalog without creating an account.",
        "Missing facts stay Not provided.",
        "Recommendations appear only after a complete academic profile.",
      ],
    },
    {
      title: "Register when you are ready",
      instructions: [
        "Start as a student. Staff accounts are invited, not self-selected.",
        "Email verification unlocks the signed-in workspace.",
        "A tour skip never marks onboarding complete.",
      ],
    },
    {
      title: "Counseling stays 30 minutes",
      instructions: [
        "The first counseling session is a 30-minute virtual meeting.",
        "Application URLs stay gated until the published rules allow them.",
        "Global Student Cube does not submit university or scholarship applications.",
      ],
    },
  ],
  student: [
    {
      title: "Build an academic profile",
      instructions: [
        "Add level, field and ordered country preferences.",
        "Manual university picks lead a set of at most ten.",
        "You can save at most three university and program pairs later.",
      ],
    },
    {
      title: "Read sourced fees carefully",
      instructions: [
        "Annual tuition and full-course fees are labelled separately.",
        "The comparison line is a tuition and accommodation estimate, not a total cost of attendance.",
        "Unknown costs sort after known costs.",
      ],
    },
    {
      title: "Prepare evidence before you save",
      instructions: [
        "Saving a program waits until financial planning is complete.",
        "Month-only deadlines stay a month, never an invented last day.",
        "There is no admission-probability score.",
      ],
    },
  ],
  parent: [
    {
      title: "Link only with consent",
      instructions: [
        "A parent account is created by invitation, not public signup.",
        "You see the linked student’s shared case, not every private note.",
        "Financial figures stay in the student’s planning tools.",
      ],
    },
    {
      title: "Use the public catalog first",
      instructions: [
        "University pages are public when published.",
        "Scholarship applications happen on the provider’s website.",
        "Mentors and counselors have separate, reviewed profiles.",
      ],
    },
    {
      title: "Ask for the 30-minute session",
      instructions: [
        "The first counseling session is thirty minutes and virtual.",
        "Rescheduling needs 48 hours’ notice once booking exists.",
        "Skipping this tour does not finish family onboarding.",
      ],
    },
  ],
  mentor: [
    {
      title: "Only approved profiles are public",
      instructions: [
        "A teaser never includes private contact details.",
        "Tips stay muted and do not autoplay under reduced motion.",
        "Unpublished or withdrawn mentors are unavailable.",
      ],
    },
    {
      title: "Mentorship is invited",
      instructions: [
        "Mentor accounts are created by invitation or admin action.",
        "Current-student mentors record anticipated graduation honestly.",
        "Rewards are verified separately from this teaser.",
      ],
    },
    {
      title: "Registration is required to connect",
      instructions: [
        "Guests can read a published teaser only.",
        "Asking a question requires a registered account.",
        "Skipping the tour does not create a mentee profile.",
      ],
    },
  ],
  counselor: [
    {
      title: "Counselor accounts are invited",
      instructions: [
        "There is no public counselor self-signup.",
        "MFA is required for counselor and staff sessions.",
        "Catalog contributions stay review candidates until published.",
      ],
    },
    {
      title: "Sessions are booked, not invented",
      instructions: [
        "Sessions are 30 minutes with a 15-minute buffer.",
        "A calendar failure still leaves the booking confirmed.",
        "Private notes never appear on public university pages.",
      ],
    },
    {
      title: "Students explore first",
      instructions: [
        "The public catalog is the same list students see.",
        "Recommendations are deterministic, not an admission score.",
        "Skipping this tour does not complete counselor onboarding.",
      ],
    },
  ],
};

export function resolveTourAudience(value: string | null): {
  audience: TourAudience;
  fellBack: boolean;
} {
  if (value && (TOUR_AUDIENCES as readonly string[]).includes(value)) {
    return { audience: value as TourAudience, fellBack: false };
  }
  return { audience: "overall", fellBack: Boolean(value) };
}
