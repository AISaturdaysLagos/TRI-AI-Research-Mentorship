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

/** Route label for a project: award path vs direct proposal path. */
export function projectTypeLabel(project: { awardId?: string | null }) {
  return project.awardId ? "TRI AI Saturdays Research Award" : "Direct proposal";
}

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
  scholar: string;
  linkedin: string;
  github: string;
  website: string;
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
  scholar: "",
  linkedin: "",
  github: "",
  website: "",
  capacity: "1",
  cadence: "",
  availability: "available",
};

export const SENIOR_ROLE_OPTIONS = [
  "Faculty / lecturer",
  "Research scientist",
  "Postdoctoral researcher",
  "Industry researcher",
  "PhD researcher",
  "Independent researcher",
  "Other",
] as const;

export { COUNTRY_OPTIONS as SENIOR_COUNTRY_OPTIONS, COUNTRY_OPTIONS } from "../lib/countries";

export const RESEARCH_AREA_OPTIONS = [
  "Natural language processing",
  "Speech and audio",
  "Computer vision",
  "Multimodal AI",
  "Machine learning",
  "Data-centric AI",
  "Responsible and trustworthy AI",
  "Health and biomedical AI",
  "Climate and earth observation",
  "Education technology",
  "African languages",
  "Human–computer interaction",
  "Robotics",
  "Information retrieval",
] as const;

export const SENIOR_RESEARCH_AREA_OPTIONS = RESEARCH_AREA_OPTIONS;

export const APPLICANT_STATUS_OPTIONS = [
  "Undergraduate student",
  "Masters student",
  "PhD student",
  "Postdoctoral researcher",
  "Faculty / lecturer",
  "Industry practitioner",
  "Independent researcher",
  "Other",
] as const;

export const SENIOR_METHOD_OPTIONS = [
  "Deep learning",
  "Statistical modelling",
  "Evaluation and benchmarking",
  "Dataset design and annotation",
  "Transfer and few-shot learning",
  "Causal inference",
  "Optimisation",
  "Software and MLOps",
  "Qualitative research",
  "User studies",
  "Survey design",
  "Grant and paper writing support",
] as const;

export const SENIOR_CAPACITY_OPTIONS = ["1", "2", "3"] as const;

export const SENIOR_CADENCE_OPTIONS = ["Weekly", "Fortnightly", "Monthly", "As needed", "Other"] as const;

export const SENIOR_AVAILABILITY_OPTIONS: { value: MentorAvailability; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "limited_capacity", label: "Limited capacity" },
  { value: "at_capacity", label: "At capacity" },
  { value: "temporarily_unavailable", label: "Temporarily unavailable" },
  { value: "inactive", label: "Inactive" },
];

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

export const CHARTER_OBJECTIVE_OPTIONS = [
  "Answer the main research question with a clear evaluation",
  "Build or release a dataset",
  "Train or adapt a model for the stated use case",
  "Reproduce and extend a baseline",
  "Write a paper or technical report",
  "Release open-source code or tools",
  "Produce a demo or prototype for stakeholders",
  "Complete an ethics or risk review for the work",
] as const;

export const CHARTER_OUT_OF_SCOPE_OPTIONS = [
  "Large-scale production deployment",
  "Collecting new primary human-subjects data without ethics approval",
  "Commercial product work outside the research release",
  "Grant writing beyond agreed support",
  "Work outside the agreed languages or regions",
  "Unlimited compute or paid API spend",
] as const;

export const CHARTER_DURATION_OPTIONS = [
  "About 3 months",
  "About 4 months",
  "About 6 months",
  "About 9 months",
  "About 12 months",
  "Other timeline set in the notes",
] as const;

export const CHARTER_RESEARCHER_DUTY_OPTIONS = [
  "Lead day-to-day research and experiments",
  "Own the literature review and related work",
  "Prepare data, code, and evaluation runs",
  "Draft papers, docs, and release materials",
  "Send progress updates on the agreed cadence",
  "Flag blockers to the Senior Researcher and TRI AI early",
  "Keep the project workspace and shared docs current",
] as const;

export const CHARTER_SENIOR_DUTY_OPTIONS = [
  "Advise on research design and methods",
  "Review milestones and draft outputs",
  "Help prioritise experiments and scope",
  "Support writing and release quality",
  "Join the agreed meetings",
  "Escalate risks or ethics concerns to TRI AI",
] as const;

export const CHARTER_TRI_DUTY_OPTIONS = [
  "Coordinate matching, scoping, and activation",
  "Host the project workspace and shared Drive folder",
  "Support meeting setup and programme tracking",
  "Help with agreed compute or resource requests",
  "Run internal review before public release",
  "Stay available for coordination blockers",
] as const;

export const CHARTER_CADENCE_OPTIONS = [
  "Weekly research meeting",
  "Fortnightly research meeting",
  "Monthly research meeting",
  "Async updates with meetings as needed",
  "Other cadence agreed in the notes",
] as const;

export const CHARTER_MEETING_FORMAT_OPTIONS = [
  "Video call",
  "In person when possible, otherwise video",
  "Async written update plus a short call",
  "Mixed: working sessions and review meetings",
] as const;

export const CHARTER_RESOURCE_OPTIONS = [
  "Shared Google Drive project folder",
  "Programme compute support on request",
  "Public datasets already identified",
  "Private or licensed data with access rules",
  "Researcher-managed local compute",
  "Cloud credits or API budget if TRI AI approves",
  "No special resources beyond ordinary tooling",
] as const;

export const CHARTER_INTEGRITY_OPTIONS = [
  "Follow TRI AI research integrity expectations",
  "Disclose conflicts of interest",
  "Document data provenance and consent where needed",
  "Do not fabricate, plagiarise, or misrepresent results",
  "Seek ethics review before human-subjects work",
  "Keep sensitive data access limited to the project team",
] as const;

export const CHARTER_RISK_OPTIONS = [
  "Data access delays",
  "Compute limits",
  "Scope creep",
  "Timeline slip",
  "Privacy or dual-use concerns",
  "Dependency on external partners",
  "Publication or release bottlenecks",
] as const;

export const CHARTER_AUTHORSHIP_OPTIONS = [
  "Researcher is lead author; Senior Researcher advises and co-authors if they contribute",
  "Authorship follows contribution and will be confirmed before submission",
  "TRI AI staff are acknowledged unless they meet authorship criteria",
  "All named authors approve the final manuscript before submission",
] as const;

export const CHARTER_IP_OPTIONS = [
  "Prefer open release of code and non-sensitive artefacts",
  "IP follows the Researcher’s institution where required",
  "Background IP stays with its owner, and new project IP is agreed before release",
  "Sensitive or third-party data will not be redistributed",
] as const;

export const CHARTER_RELEASE_OPTIONS = [
  "Conference or journal paper",
  "Technical report or blog note",
  "Open-source repository",
  "Dataset release with documentation",
  "Model card or evaluation report",
  "Internal demo only until TRI AI clears public sharing",
] as const;

export const CHARTER_SUCCESS_OPTIONS = [
  "Main research question answered with reported evidence",
  "Agreed output drafted and internally reviewed",
  "Code or data packaged for reuse where promised",
  "Progress updates completed on cadence",
  "Risks and ethics items closed or explicitly deferred",
] as const;

export const CHARTER_COMMUNICATION_OPTIONS = [
  "Project workspace on this site",
  "Shared Google Drive docs",
  "Email for formal notices",
  "WhatsApp or chat for quick coordination",
  "Meeting notes stored in the project Drive folder",
] as const;
