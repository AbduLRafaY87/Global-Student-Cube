export interface TaxonomyLeaf {
  id: string;
  label: string;
  group: string;
}

export interface TaxonomyGroup {
  id: string;
  label: string;
  leaves: TaxonomyLeaf[];
}

function group(id: string, label: string, leaves: readonly [string, string][]): TaxonomyGroup {
  return {
    id,
    label,
    leaves: leaves.map(([leafId, leafLabel]) => ({
      id: leafId,
      label: leafLabel,
      group: id,
    })),
  };
}

export const ALUMNI_TOPIC_GROUPS: readonly TaxonomyGroup[] = [
  group("academic", "Academic & University Support", [
    ["academic-study-skills-time-management", "Study skills & time management"],
    ["academic-managing-coursework-assignments", "Managing coursework & assignments"],
    ["academic-choosing-majors-minors", "Choosing majors/minors"],
    ["academic-handling-academic-pressure", "Handling academic pressure"],
    ["academic-understanding-grading-systems", "Understanding grading systems"],
  ]),
  group("career", "Career & Professional Development", [
    ["career-cv-resume-building", "CV/Resume building"],
    ["career-internship-search-strategies", "Internship search strategies"],
    ["career-part-time-job-tips", "Part-time job tips"],
    ["career-networking-linkedin-guidance", "Networking & LinkedIn guidance"],
    ["career-industry-insights", "Industry insights (field-specific)"],
    ["career-interview-preparation", "Interview preparation"],
  ]),
  group("life-abroad", "Life Abroad & Adjustment", [
    ["life-abroad-culture-shock-adaptation", "Culture shock & adaptation"],
    ["life-abroad-local-transportation-navigation", "Local transportation & navigation"],
    ["life-abroad-food-groceries-daily-routines", "Food, groceries & daily routines"],
    ["life-abroad-managing-homesickness", "Managing homesickness"],
    ["life-abroad-making-friends", "Making friends abroad"],
  ]),
  group("finance", "Financial & Practical Management", [
    ["finance-budgeting-abroad", "Budgeting abroad"],
    ["finance-opening-bank-account", "Opening a bank account"],
    ["finance-money-saving-tips", "Money-saving tips"],
    ["finance-scholarships-application-guidance", "Scholarships application guidance"],
    ["finance-working-while-studying", "Working while studying (rules & experience)"],
  ]),
  group("housing", "Housing & Accommodation Support", [
    ["housing-choose-safe-areas", "How to choose safe areas"],
    ["housing-landlords-leasing", "Dealing with landlords/leasing agreements"],
    ["housing-living-with-roommates", "Living with roommates"],
    ["housing-hidden-costs", "Hidden costs to expect"],
  ]),
  group("community", "Community & Networking", [
    ["community-joining-clubs-societies", "Joining clubs/societies"],
    ["community-meeting-international-students", "Meeting international students"],
    ["community-university-resources", "University community resources"],
    ["community-weekend-activities-safe-travel", "Weekend activities & safe travel"],
  ]),
  group("wellbeing", "Wellbeing & Personal Growth", [
    ["wellbeing-navigating-resources", "Wellbeing & Navigating Resources"],
    ["wellbeing-building-confidence", "Building confidence"],
    ["wellbeing-handling-stress", "Handling stress"],
    ["wellbeing-work-study-life-balance", "Work–study–life balance"],
  ]),
  group("postgrad", "Post-Graduation Guidance", [
    ["postgrad-job-search", "Job search after graduation"],
    ["postgrad-work-visa-process", "Post-study work visa process"],
    ["postgrad-staying-vs-returning", "Staying back versus returning home"],
    ["postgrad-preparing-professional-life", "Preparing for professional life abroad"],
  ]),
];

export const PARENT_TOPIC_GROUPS: readonly TaxonomyGroup[] = [
  group("parent-admissions", "Admissions & University Process", [
    ["parent-admissions-university-process", "Applications, documents, deadlines, entrance tests"],
  ]),
  group("parent-finance", "Financial Planning & Payments", [
    ["parent-financial-planning-payments", "Fees, scholarships, budgeting, funds transfer"],
  ]),
  group("parent-accommodation", "Accommodation & Local Living", [
    ["parent-accommodation-local-living", "Hostels, apartments, costs, safety"],
  ]),
  group("parent-academic", "Academic & Career Guidance", [
    ["parent-academic-career-guidance", "Course, workload, internships, job outlook"],
  ]),
  group("parent-wellbeing", "Student Life & Wellbeing", [
    ["parent-student-life-wellbeing", "Social adjustment, culture, stress, mental health"],
  ]),
  group("parent-community", "Local Community & Support Network", [
    ["parent-local-community-support", "Alumni groups, parent help, language, contacts"],
  ]),
  group("parent-digital", "Technology & Digital Setup", [
    ["parent-technology-digital-setup", "SIM and internet, university portals, digital payments, recommended apps and tools"],
  ]),
  group("parent-health", "Health, Insurance & Medical Services", [
    ["parent-health-insurance-medical", "Medical insurance, local health registration, emergency and hospital access"],
  ]),
];

export const INDUSTRY_GROUPS: readonly TaxonomyGroup[] = [
  group("business", "Business & Management", [
    ["industry-business-administration", "Business Administration"],
    ["industry-finance-accounting", "Finance & Accounting"],
    ["industry-banking-investment", "Banking & Investment"],
    ["industry-marketing-advertising", "Marketing & Advertising"],
    ["industry-human-resource-management", "Human Resource Management"],
    ["industry-entrepreneurship", "Entrepreneurship"],
    ["industry-supply-chain-logistics", "Supply Chain & Logistics"],
    ["industry-hospitality-tourism", "Hospitality & Tourism Management"],
  ]),
  group("engineering", "Engineering & Technology", [
    ["industry-mechanical-engineering", "Mechanical Engineering"],
    ["industry-electrical-electronics", "Electrical & Electronics Engineering"],
    ["industry-civil-engineering", "Civil Engineering"],
    ["industry-chemical-engineering", "Chemical Engineering"],
    ["industry-computer-engineering", "Computer Engineering"],
    ["industry-software-development-it", "Software Development/IT"],
    ["industry-ai-data-science", "Artificial Intelligence & Data Science"],
    ["industry-cybersecurity", "Cybersecurity"],
    ["industry-robotics-automation", "Robotics & Automation"],
    ["industry-aerospace-engineering", "Aerospace Engineering"],
  ]),
  group("health", "Health & Life Sciences", [
    ["industry-medicine", "Medicine"],
    ["industry-nursing", "Nursing"],
    ["industry-pharmacy", "Pharmacy"],
    ["industry-dentistry", "Dentistry"],
    ["industry-public-health", "Public Health"],
    ["industry-biotechnology", "Biotechnology"],
    ["industry-biomedical-sciences", "Biomedical Sciences"],
    ["industry-nutrition-dietetics", "Nutrition & Dietetics"],
    ["industry-physiotherapy", "Physiotherapy"],
  ]),
  group("social", "Social Sciences & Humanities", [
    ["industry-psychology", "Psychology"],
    ["industry-sociology", "Sociology"],
    ["industry-anthropology", "Anthropology"],
    ["industry-political-science", "Political Science"],
    ["industry-international-relations", "International Relations"],
    ["industry-education-teaching", "Education & Teaching"],
    ["industry-social-work", "Social Work"],
    ["industry-history", "History"],
  ]),
  group("creative", "Creative Arts, Media & Design", [
    ["industry-graphic-design", "Graphic Design"],
    ["industry-fashion-design", "Fashion Design"],
    ["industry-architecture", "Architecture"],
    ["industry-interior-design", "Interior Design"],
    ["industry-media-communication", "Media & Communication"],
    ["industry-film-animation", "Film & Animation"],
    ["industry-performing-arts", "Performing Arts"],
  ]),
  group("law", "Law, Governance & Public Service", [
    ["industry-law", "Law"],
    ["industry-criminology", "Criminology"],
    ["industry-public-administration", "Public Administration"],
    ["industry-public-policy", "Public Policy"],
  ]),
  group("science", "Science, Environment & Research", [
    ["industry-physics", "Physics"],
    ["industry-chemistry", "Chemistry"],
    ["industry-mathematics", "Mathematics"],
    ["industry-environmental-science", "Environmental Science"],
    ["industry-marine-science", "Marine Science"],
    ["industry-geology", "Geology"],
    ["industry-agriculture-food-science", "Agriculture & Food Science"],
  ]),
  group("emerging", "Business Tech & Emerging Fields", [
    ["industry-fintech", "FinTech"],
    ["industry-ecommerce", "E-commerce"],
    ["industry-blockchain", "Blockchain"],
    ["industry-game-development", "Game Development"],
    ["industry-cloud-computing", "Cloud Computing"],
  ]),
  group("trade", "Trade, Technical & Vocational Fields", [
    ["industry-aviation-pilot-training", "Aviation & Pilot Training"],
    ["industry-automotive-technology", "Automotive Technology"],
    ["industry-culinary-arts", "Culinary Arts"],
    ["industry-health-safety", "Health & Safety"],
    ["industry-construction-trades", "Construction Trades"],
    ["industry-other", "Other"],
  ]),
];

export const INDUSTRY_OTHER_ID = "industry-other";

export const ALUMNI_TOPIC_IDS: readonly string[] = ALUMNI_TOPIC_GROUPS.flatMap((item) =>
  item.leaves.map((leaf) => leaf.id),
);

export const PARENT_TOPIC_IDS: readonly string[] = PARENT_TOPIC_GROUPS.flatMap((item) =>
  item.leaves.map((leaf) => leaf.id),
);

export const INDUSTRY_IDS: readonly string[] = INDUSTRY_GROUPS.flatMap((item) =>
  item.leaves.map((leaf) => leaf.id),
);

const ALUMNI_TOPIC_SET = new Set(ALUMNI_TOPIC_IDS);
const PARENT_TOPIC_SET = new Set(PARENT_TOPIC_IDS);
const INDUSTRY_SET = new Set(INDUSTRY_IDS);

export function isAlumniTopic(value: string): boolean {
  return ALUMNI_TOPIC_SET.has(value);
}

export function isParentTopic(value: string): boolean {
  return PARENT_TOPIC_SET.has(value);
}

export function isIndustryId(value: string): boolean {
  return INDUSTRY_SET.has(value);
}

export function labelForTaxonomy(id: string): string {
  for (const collection of [ALUMNI_TOPIC_GROUPS, PARENT_TOPIC_GROUPS, INDUSTRY_GROUPS]) {
    for (const item of collection) {
      const leaf = item.leaves.find((entry) => entry.id === id);
      if (leaf) {
        return leaf.label;
      }
    }
  }
  return "Not provided";
}
