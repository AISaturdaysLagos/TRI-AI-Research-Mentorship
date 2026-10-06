export const ROLES = [
  "researcher",
  "senior_researcher",
  "admin",
  "reviewer",
] as const;

export type Role = (typeof ROLES)[number];

export const SELF_SERVE_ROLES = ["researcher", "senior_researcher"] as const;
export type SelfServeRole = (typeof SELF_SERVE_ROLES)[number];

export type DirectProposalStatus =
  | "draft"
  | "received"
  | "under_review"
  | "revise"
  | "approved_for_matching"
  | "held_for_matching"
  | "matching"
  | "no_current_match"
  | "declined";

export type SaturdaysStatus =
  | "awarded"
  | "research_scoping"
  | "ready_for_matching"
  | "matching"
  | "no_current_match"
  | "activated";

export type ProjectStatus =
  | "scoping"
  | "active"
  | "paused"
  | "internal_review"
  | "completed"
  | "discontinued";

export type ProjectHealth = "green" | "amber" | "red";

export type MentorAvailability =
  | "available"
  | "limited_capacity"
  | "at_capacity"
  | "temporarily_unavailable"
  | "inactive";

export type MatchResponse =
  | "pending"
  | "interested"
  | "interested_with_questions"
  | "not_available"
  | "not_a_fit";

export const FIT_DIMENSIONS = [
  { key: "researchArea", label: "Research area", max: 5 },
  { key: "method", label: "Method", max: 5 },
  { key: "interest", label: "Interest", max: 5 },
  { key: "availability", label: "Availability", max: 5 },
  { key: "complementarity", label: "Complementarity", max: 5 },
] as const;

export type FitKey = (typeof FIT_DIMENSIONS)[number]["key"];
export type FitScores = Record<FitKey, number>;

export const EMPTY_FIT: FitScores = {
  researchArea: 0,
  method: 0,
  interest: 0,
  availability: 0,
  complementarity: 0,
};

export const MATCH_RESPONSES: { value: Exclude<MatchResponse, "pending">; label: string }[] = [
  { value: "interested", label: "Interested" },
  { value: "interested_with_questions", label: "Interested with revisions/questions" },
  { value: "not_available", label: "Not available" },
  { value: "not_a_fit", label: "Not a fit" },
];

export type UserRecord = {
  email: string;
  displayName: string;
  role: Role;
};

export function workspacePath(role: Role) {
  if (role === "admin" || role === "reviewer") return "/admin";
  return "/dashboard";
}

export function roleLabel(role: Role) {
  if (role === "senior_researcher") return "Senior Researcher";
  if (role === "researcher") return "Researcher";
  if (role === "admin") return "TRI AI admin";
  if (role === "reviewer") return "TRI AI reviewer";
  return role;
}

export type ResearcherProfileDraft = {
  name: string;
  affiliation: string;
  location: string;
  applicantStatus: string;
  bio: string;
  github: string;
  scholar: string;
};

export const EMPTY_RESEARCHER_PROFILE: ResearcherProfileDraft = {
  name: "",
  affiliation: "",
  location: "",
  applicantStatus: "",
  bio: "",
  github: "",
  scholar: "",
};

export type ProposalDraft = {
  name: string;
  affiliation: string;
  location: string;
  applicantStatus: string;
  bio: string;
  github: string;
  scholar: string;
  title: string;
  researchArea: string;
  africaRelevance: string;
  summary: string;
  problem: string;
  question: string;
  relatedWork: string;
  methodology: string;
  data: string;
  evaluation: string;
  contribution: string;
  readiness: string;
  mentorExpertise: string;
  resources: string;
  timeline: string;
  intendedOutput: string;
  risks: string;
  links: string;
};

export const EMPTY_PROPOSAL: ProposalDraft = {
  name: "",
  affiliation: "",
  location: "",
  applicantStatus: "",
  bio: "",
  github: "",
  scholar: "",
  title: "",
  researchArea: "",
  africaRelevance: "",
  summary: "",
  problem: "",
  question: "",
  relatedWork: "",
  methodology: "",
  data: "",
  evaluation: "",
  contribution: "",
  readiness: "",
  mentorExpertise: "",
  resources: "",
  timeline: "",
  intendedOutput: "",
  risks: "",
  links: "",
};

export type SeniorProfileDraft = {
  name: string;
  affiliation: string;
  currentRole: string;
  country: string;
  researchAreas: string;
  methods: string;
  publications: string;
  capacity: string;
  cadence: string;
  availability: MentorAvailability;
};

export const EMPTY_SENIOR: SeniorProfileDraft = {
  name: "",
  affiliation: "",
  currentRole: "",
  country: "",
  researchAreas: "",
  methods: "",
  publications: "",
  capacity: "1",
  cadence: "",
  availability: "available",
};

export const PROPOSAL_LABELS: Record<keyof ProposalDraft, string> = {
  name: "Full name",
  affiliation: "Institution or organisation",
  location: "Country or location",
  applicantStatus: "Current status",
  bio: "Field or programme of study",
  github: "GitHub or portfolio",
  scholar: "Google Scholar or publications",
  title: "Project title",
  researchArea: "Primary research area",
  africaRelevance:
    "Does this address an African problem, population, dataset, language, environment, or context?",
  summary: "Executive summary",
  problem: "Why does this problem matter?",
  question: "Main research question or hypothesis",
  relatedWork: "Relevant prior work",
  methodology: "Proposed methodology",
  data: "Datasets and data access status",
  evaluation: "Evaluation approach",
  contribution: "Expected research contribution",
  readiness: "Relevant skills and previous work",
  mentorExpertise: "What expertise do you need from a Senior Researcher?",
  resources: "Major compute or resource needs",
  timeline: "Expected project duration",
  intendedOutput: "Intended research output",
  risks: "Main risks or dependencies",
  links: "Link to supporting code, preliminary experiments, or materials",
};

export const REVIEW_CRITERIA = [
  { key: "problemImportance", label: "Problem importance and relevance", max: 20 },
  { key: "novelty", label: "Research question and novelty", max: 20 },
  { key: "methodology", label: "Methodology and evaluation", max: 20 },
  { key: "feasibility", label: "Feasibility", max: 15 },
  { key: "readiness", label: "Researcher readiness", max: 15 },
  { key: "outputPotential", label: "Output potential", max: 10 },
] as const;

export type ReviewCriterion = (typeof REVIEW_CRITERIA)[number]["key"];

export const REVIEW_FLAGS = [
  { key: "ethics", label: "Ethics" },
  { key: "dataRights", label: "Data rights" },
  { key: "safety", label: "Safety" },
  { key: "compute", label: "Unrealistic compute" },
  { key: "ownership", label: "Ownership" },
  { key: "weakDesign", label: "Weak design" },
] as const;

export type ReviewFlag = (typeof REVIEW_FLAGS)[number]["key"];

export type ReviewScores = Record<ReviewCriterion, number>;

export type ReviewRecord = ReviewScores & {
  proposalId: string;
  reviewerId: string;
  strengths: string;
  concerns: string;
  mentorExpertise: string;
  note: string;
  flags: Record<ReviewFlag, boolean>;
  decision: string;
};

export const EMPTY_REVIEW_SCORES: ReviewScores = {
  problemImportance: 0,
  novelty: 0,
  methodology: 0,
  feasibility: 0,
  readiness: 0,
  outputPotential: 0,
};

export const DIRECT_DECISIONS = [
  { status: "approved_for_matching", label: "Approved for Matching" },
  { status: "revise", label: "Revise" },
  { status: "held_for_matching", label: "Hold for Matching" },
  { status: "declined", label: "Decline" },
] as const;

export const SCOPING_DECISIONS = [
  { status: "ready_for_matching", label: "Ready for Matching" },
  { status: "research_scoping", label: "Further scoping needed" },
] as const;

export const PROPOSAL_STEPS = [
  "Applicant profile",
  "Proposal overview",
  "Research plan",
  "Applicant and Senior Researcher fit",
  "Resources and risks",
  "Supporting materials",
  "Review and submit",
] as const;
