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

export type UserRecord = {
  email: string;
  displayName: string;
  role: Role;
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

export const PROPOSAL_STEPS = [
  "Applicant profile",
  "Proposal overview",
  "Research plan",
  "Applicant and mentorship fit",
  "Resources and risks",
  "Supporting materials",
  "Review and submit",
] as const;
