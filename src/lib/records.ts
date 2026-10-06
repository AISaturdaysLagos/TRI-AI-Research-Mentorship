import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  EMPTY_PROPOSAL,
  EMPTY_RESEARCHER_PROFILE,
  EMPTY_SENIOR,
  type FitScores,
  type MatchResponse,
  type MentorAvailability,
  type ProposalDraft,
  type ResearcherProfileDraft,
  type ReviewRecord,
  type SeniorProfileDraft,
} from "../types/domain";
import { firestore, fixturesEnabled } from "./firebase";

function visibleRows<T>(rows: T[]) {
  if (fixturesEnabled) return rows;
  return rows.filter((row) => (row as { fixture?: unknown }).fixture !== true);
}

function visibleRow<T>(row: T | null) {
  if (!row || (!fixturesEnabled && (row as { fixture?: unknown }).fixture === true)) return null;
  return row;
}

const PROPOSAL_KEY = "triai-proposal-draft";
const PROPOSAL_ID_KEY = "triai-proposal-id";
const SENIOR_KEY = "triai-senior-draft";

export function readLocalProposal(): ProposalDraft | null {
  const raw = localStorage.getItem(PROPOSAL_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as ProposalDraft;
}

export function writeLocalProposal(draft: ProposalDraft, id: string | null) {
  localStorage.setItem(PROPOSAL_KEY, JSON.stringify(draft));
  if (id) localStorage.setItem(PROPOSAL_ID_KEY, id);
}

export function readLocalProposalId() {
  return localStorage.getItem(PROPOSAL_ID_KEY);
}

export function readLocalSenior(): SeniorProfileDraft | null {
  const raw = localStorage.getItem(SENIOR_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as SeniorProfileDraft;
}

export function writeLocalSenior(draft: SeniorProfileDraft) {
  localStorage.setItem(SENIOR_KEY, JSON.stringify(draft));
}

const SENIOR_AVAILABILITY: MentorAvailability[] = [
  "available",
  "limited_capacity",
  "at_capacity",
  "temporarily_unavailable",
  "inactive",
];

export function proposalDraftFromRecord(source: object | null | undefined): ProposalDraft {
  const next = { ...EMPTY_PROPOSAL };
  if (!source) return next;
  const data = source as Record<string, unknown>;
  for (const key of Object.keys(EMPTY_PROPOSAL) as (keyof ProposalDraft)[]) {
    const value = data[key];
    if (typeof value === "string") next[key] = value;
  }
  return next;
}

export function seniorDraftFromRecord(source: object | null | undefined): SeniorProfileDraft {
  const next = { ...EMPTY_SENIOR };
  if (!source) return next;
  const data = source as Record<string, unknown>;
  for (const key of Object.keys(EMPTY_SENIOR) as (keyof SeniorProfileDraft)[]) {
    const value = data[key];
    if (key === "availability") {
      if (SENIOR_AVAILABILITY.includes(value as MentorAvailability)) next.availability = value as MentorAvailability;
      continue;
    }
    if (typeof value === "string") next[key] = value;
  }
  return next;
}

export async function saveProposal(
  id: string | null,
  ownerId: string,
  draft: ProposalDraft,
  status: "draft" | "received" | "research_scoping",
) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  const name = draft.title.trim();
  const [owned, shared, projects] = await Promise.all([
    getDocs(query(collection(db, "proposals"), where("ownerId", "==", ownerId))),
    getDocs(query(collection(db, "proposals"), where("researcherIds", "array-contains", ownerId))),
    getDocs(query(collection(db, "projects"), where("participantIds", "array-contains", ownerId))),
  ]);
  const sameName = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase() === name.toLocaleLowerCase();
  const proposalTaken = [...owned.docs, ...shared.docs].some((item) => item.id !== id && sameName(item.data().title));
  const projectTaken = projects.docs.some(
    (item) => String(item.data().proposalId ?? "") !== id && sameName(item.data().title),
  );
  if (name && (proposalTaken || projectTaken)) throw new Error("A proposal or project already uses this name.");
  const linked = projects.docs.find((item) => String(item.data().proposalId ?? "") === id);
  if (linked && name && !sameName(linked.data().title)) {
    draft = { ...draft, title: String(linked.data().title ?? name) };
  }
  const ref = id ? doc(db, "proposals", id) : doc(collection(db, "proposals"));
  await setDoc(
    ref,
    {
      ...draft,
      ownerId,
      status,
      route: status === "research_scoping" ? "saturdays" : "direct",
      updatedAt: serverTimestamp(),
      ...(id ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );
  return ref.id;
}

export async function listOwnedProposals(ownerId: string) {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, "proposals"), where("ownerId", "==", ownerId)));
  return visibleRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
}

export async function listResearcherProposals(uid: string) {
  const db = firestore();
  if (!db) return [];
  const [owned, shared] = await Promise.all([
    getDocs(query(collection(db, "proposals"), where("ownerId", "==", uid))),
    getDocs(query(collection(db, "proposals"), where("researcherIds", "array-contains", uid))),
  ]);
  const byId = new Map<string, { id: string }>();
  for (const item of [...owned.docs, ...shared.docs]) {
    byId.set(item.id, { id: item.id, ...item.data() });
  }
  return visibleRows([...byId.values()]);
}

export async function listAwardsForRecipient(uid: string) {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, "awards"), where("recipientIds", "array-contains", uid)));
  return visibleRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
}

export function projectProposalIds(projects: { id?: string; proposalId?: string }[]) {
  const ids = new Set<string>();
  for (const project of projects) {
    if (project.proposalId) ids.add(project.proposalId);
    if (project.id) ids.add(project.id);
  }
  return ids;
}

export async function listParticipantProjects(uid: string) {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, "projects"), where("participantIds", "array-contains", uid)));
  return visibleRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
}

export async function listProposals() {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "proposals"));
  return visibleRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
}

export async function getProposal(id: string) {
  const db = firestore();
  if (!db) return null;
  const snapshot = await getDoc(doc(db, "proposals", id));
  return visibleRow(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
}

export async function updateProposalStatus(id: string, status: string) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  await setDoc(doc(db, "proposals", id), { status, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getReview(proposalId: string) {
  const db = firestore();
  if (!db) return null;
  const snapshot = await getDoc(doc(db, "reviews", proposalId));
  return visibleRow(snapshot.exists() ? (snapshot.data() as ReviewRecord) : null);
}

export async function listAssignedReviews(reviewerId: string) {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, "reviews"), where("reviewerId", "==", reviewerId)));
  return visibleRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
}

export async function listDismissedNotices(uid: string) {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDoc(doc(db, "users", uid));
  const value = snapshot.data()?.dismissedNotices;
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function saveReview(proposalId: string, review: ReviewRecord) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  await setDoc(
    doc(db, "reviews", proposalId),
    { ...review, proposalId, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function listAdmins() {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, "users"), where("role", "==", "admin")));
  return snapshot.docs
    .map((item) => ({
      uid: item.id,
      name: String(item.data().displayName || "").trim() || "TRI AI Admin",
      email: String(item.data().email ?? ""),
    }))
    .filter((person) => person.uid && person.name);
}

export async function listDirectory() {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map((item) => ({
    id: item.id,
    email: String(item.data().email ?? ""),
    displayName: String(item.data().displayName ?? ""),
    role: String(item.data().role ?? ""),
  }));
}

export async function listStaff() {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "users"));
  const people = snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((item) => {
      const role = String((item as { role?: string }).role ?? "");
      return role === "admin" || role === "reviewer";
    });
  return visibleRows(people);
}

export function researcherDraftFromRecord(source: object | null | undefined): ResearcherProfileDraft {
  const next = { ...EMPTY_RESEARCHER_PROFILE };
  if (!source) return next;
  const data = source as Record<string, unknown>;
  for (const key of Object.keys(EMPTY_RESEARCHER_PROFILE) as (keyof ResearcherProfileDraft)[]) {
    const value = data[key];
    if (typeof value === "string") next[key] = value;
  }
  return next;
}

export async function saveResearcherProfile(uid: string, draft: ResearcherProfileDraft) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  await setDoc(
    doc(db, "researcherProfiles", uid),
    { ...draft, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function getResearcherProfile(uid: string) {
  const db = firestore();
  if (!db) return null;
  const snapshot = await getDoc(doc(db, "researcherProfiles", uid));
  return visibleRow(snapshot.exists() ? snapshot.data() : null);
}

export async function saveSeniorProfile(uid: string, draft: SeniorProfileDraft) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  await setDoc(
    doc(db, "seniorResearcherProfiles", uid),
    { ...draft, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function getSeniorProfile(uid: string) {
  const db = firestore();
  if (!db) return null;
  const snapshot = await getDoc(doc(db, "seniorResearcherProfiles", uid));
  return visibleRow(snapshot.exists() ? snapshot.data() : null);
}

export async function listSeniorProfiles() {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "seniorResearcherProfiles"));
  return visibleRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
}

export async function updateMentorPool(
  uid: string,
  availability: MentorAvailability,
  poolStatus: "pending" | "in_pool",
) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  await setDoc(
    doc(db, "seniorResearcherProfiles", uid),
    { availability, poolStatus, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

const CURRENT_PROJECT_STATUSES = ["active", "scoping", "internal_review"];

export async function listResearchProjects() {
  const db = firestore();
  if (!db) return [];
  const [published, current] = await Promise.all([
    getDocs(query(collection(db, "projects"), where("publicShowcase", "==", true))),
    getDocs(query(collection(db, "projects"), where("status", "in", CURRENT_PROJECT_STATUSES))),
  ]);
  const byId = new Map<string, { id: string }>();
  for (const item of [...published.docs, ...current.docs]) {
    byId.set(item.id, { id: item.id, ...item.data() });
  }
  return visibleRows([...byId.values()]);
}

export async function getAward(token: string) {
  const db = firestore();
  if (!db) return null;
  const snapshot = await getDoc(doc(db, "awards", token));
  return visibleRow(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
}

export async function saveAwardScope(
  awardId: string,
  scope: { summary: string; question: string; timeline: string },
) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  await updateDoc(doc(db, "awards", awardId), {
    summary: scope.summary.slice(0, 3999),
    question: scope.question.slice(0, 3999),
    timeline: scope.timeline.slice(0, 3999),
    updatedAt: serverTimestamp(),
  });
}

export async function listMentorMatches(mentorId: string) {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, "matches"), where("mentorId", "==", mentorId)));
  return visibleRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
}

export async function listProgrammeIntroductions() {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, "matches"), where("introduced", "==", true)));
  return visibleRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
}

export async function listIntroducedMatches(uid: string) {
  const db = firestore();
  if (!db) return [];
  const [owned, shared] = await Promise.all([
    getDocs(query(collection(db, "matches"), where("researcherId", "==", uid), where("introduced", "==", true))),
    getDocs(
      query(collection(db, "matches"), where("researcherIds", "array-contains", uid), where("introduced", "==", true)),
    ),
  ]);
  const byId = new Map<string, { id: string }>();
  for (const item of [...owned.docs, ...shared.docs]) {
    byId.set(item.id, { id: item.id, ...item.data() });
  }
  return visibleRows([...byId.values()]);
}

export async function listMatches() {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "matches"));
  return visibleRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
}

export async function sendMatchOpportunity(input: {
  proposal: Record<string, unknown> & { id: string };
  mentorId: string;
  mentorName: string;
  fit: FitScores;
  note: string;
}) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  const fitScore = Object.values(input.fit).reduce((sum, value) => sum + Number(value || 0), 0);
  const ref = doc(collection(db, "matches"));
  const proposal = input.proposal;
  await setDoc(ref, {
    proposalId: proposal.id,
    title: String(proposal.title ?? ""),
    summary: String(proposal.summary ?? ""),
    question: String(proposal.question ?? ""),
    researchArea: String(proposal.researchArea ?? ""),
    africaRelevance: String(proposal.africaRelevance ?? ""),
    contribution: String(proposal.contribution ?? ""),
    researcherId: String(proposal.ownerId ?? ""),
    researcherName: String(proposal.name ?? ""),
    readiness: String(proposal.readiness ?? ""),
    methodology: String(proposal.methodology ?? ""),
    data: String(proposal.data ?? ""),
    evaluation: String(proposal.evaluation ?? ""),
    timeline: String(proposal.timeline ?? ""),
    mentorNeed: String(proposal.mentorExpertise ?? ""),
    mentorId: input.mentorId,
    mentorName: input.mentorName,
    fit: input.fit,
    fitScore,
    note: input.note,
    response: "pending",
    responseNote: "",
    introduced: false,
    invited: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await setDoc(
    doc(db, "proposals", proposal.id),
    { status: "matching", updatedAt: serverTimestamp() },
    { merge: true },
  );
  return ref.id;
}

export async function respondToMatch(id: string, response: MatchResponse, responseNote: string) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  await setDoc(
    doc(db, "matches", id),
    { response, responseNote: responseNote.slice(0, 1999), updatedAt: serverTimestamp() },
    { merge: true },
  );
}

function clip(value: unknown, max: number) {
  return String(value ?? "").slice(0, max);
}

export function interestMatchId(proposalId: string, mentorId: string) {
  return `${proposalId}__${mentorId}`;
}

export async function expressMatchInterest(input: {
  proposalId: string;
  mentorId: string;
  mentorName: string;
  response: Exclude<MatchResponse, "pending">;
  responseNote: string;
  proposal: Record<string, unknown>;
}) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  const proposal = input.proposal;
  const id = interestMatchId(input.proposalId, input.mentorId);
  await setDoc(doc(db, "matches", id), {
    proposalId: clip(input.proposalId, 119),
    title: clip(proposal.title, 180),
    summary: clip(proposal.summary, 1999),
    question: clip(proposal.question, 1999),
    researchArea: clip(proposal.researchArea, 180),
    africaRelevance: clip(proposal.africaRelevance, 1999),
    contribution: clip(proposal.contribution, 1999),
    researcherId: clip(proposal.researcherId, 119),
    researcherName: clip(proposal.researcherName, 180),
    readiness: clip(proposal.readiness, 1999),
    methodology: clip(proposal.methodology, 1999),
    data: clip(proposal.data, 1999),
    evaluation: clip(proposal.evaluation, 1999),
    timeline: clip(proposal.timeline, 180),
    mentorNeed: clip(proposal.mentorNeed, 1999),
    mentorId: input.mentorId,
    mentorName: clip(input.mentorName, 119),
    fit: { researchArea: 0, method: 0, interest: 0, availability: 0, complementarity: 0 },
    fitScore: 0,
    note: "",
    response: input.response,
    responseNote: input.responseNote.slice(0, 1999),
    introduced: false,
    invited: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export type InviteGuest = { name: string; email: string };

export function inviteGuests(rows: InviteGuest[]) {
  const people = rows
    .map((row) => ({ name: row.name.trim().slice(0, 79), email: row.email.trim().toLowerCase().slice(0, 119) }))
    .filter((row) => row.name || row.email);
  if (people.some((row) => !row.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))) {
    throw new Error("Add a name and an email address for each person.");
  }
  const seen = new Set<string>();
  for (const person of people) {
    if (seen.has(person.email)) throw new Error("Each email address can be invited once.");
    seen.add(person.email);
  }
  return people;
}

function awardGuest(person: InviteGuest) {
  return { name: person.name.slice(0, 79) };
}

export async function createAwardProject(input: {
  title: string;
  summary: string;
  researchArea: string;
  note: string;
  researchers?: InviteGuest[];
  seniors?: InviteGuest[];
}) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  const title = input.title.trim().slice(0, 200);
  if (!title) throw new Error("Add a title for this TRI AI Saturdays Award project.");
  const [proposalSnap, projectSnap] = await Promise.all([
    getDocs(collection(db, "proposals")),
    getDocs(collection(db, "projects")),
  ]);
  const taken = [...proposalSnap.docs, ...projectSnap.docs].some(
    (item) => String(item.data().title ?? "").trim().toLocaleLowerCase() === title.toLocaleLowerCase(),
  );
  if (taken) throw new Error("A proposal or project already uses this name.");
  const researchers = inviteGuests(input.researchers ?? []);
  const seniors = inviteGuests(input.seniors ?? []);
  const awardRef = doc(collection(db, "awards"));
  const projectRef = doc(collection(db, "projects"));
  const invites = [
    ...researchers.map((person) => ({ ...person, role: "researcher" as const, token: crypto.randomUUID() })),
    ...seniors.map((person) => ({ ...person, role: "senior_researcher" as const, token: crypto.randomUUID() })),
  ];
  const batch = writeBatch(db);
  batch.set(awardRef, {
    title,
    note: input.note.trim().slice(0, 500),
    recipientName: "",
    recipientIds: [],
    recipients: [],
    projectId: projectRef.id,
    researchers: researchers.map(awardGuest),
    seniorResearchers: seniors.map(awardGuest),
    summary: "",
    question: "",
    timeline: "",
    status: "scoping",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(projectRef, {
    title,
    summary: input.summary.trim().slice(0, 1000),
    researchArea: input.researchArea.trim().slice(0, 120),
    status: "scoping",
    health: "green",
    publicShowcase: false,
    proposalId: "",
    scoped: false,
    scopedMeetingId: "",
    charterSigned: false,
    awardId: awardRef.id,
    researchers: [],
    seniorResearchers: [],
    participantIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  for (const invite of invites) {
    batch.set(doc(db, "projectInvites", invite.token), {
      projectId: projectRef.id,
      projectTitle: title,
      role: invite.role,
      status: "open",
      awardId: awardRef.id,
      acceptedIds: [],
      guestName: invite.name,
      guestEmail: invite.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
  return { awardId: awardRef.id, projectId: projectRef.id, invites };
}

export async function listProjects() {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "projects"));
  return visibleRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
}

export async function markProjectScoped(projectId: string, meetingId: string) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  await setDoc(
    doc(db, "projects", projectId),
    { scoped: true, scopedMeetingId: meetingId, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function markProjectCharterSigned(projectId: string) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  await setDoc(
    doc(db, "projects", projectId),
    { charterSigned: true, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function activateProject(projectId: string) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  await setDoc(
    doc(db, "projects", projectId),
    { status: "active", updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function listProjectInvites() {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "projectInvites"));
  return visibleRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
}

export async function getProjectInvite(token: string) {
  const db = firestore();
  if (!db) return null;
  const snapshot = await getDoc(doc(db, "projectInvites", token));
  return visibleRow(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
}

export async function createProjectInvite(
  project: { id: string; title?: string; awardId?: string },
  role: "researcher" | "senior_researcher",
  guest: InviteGuest,
) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  const [person] = inviteGuests([guest]);
  if (!person) throw new Error("Add a name and an email address.");
  const token = crypto.randomUUID();
  const awardId = project.awardId || "";
  await setDoc(doc(db, "projectInvites", token), {
    projectId: project.id,
    projectTitle: project.title || "Project",
    role,
    status: "open",
    awardId,
    acceptedIds: [],
    guestName: person.name,
    guestEmail: person.email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  if (awardId) {
    await updateDoc(doc(db, "awards", awardId), {
      [role === "researcher" ? "researchers" : "seniorResearchers"]: arrayUnion(awardGuest(person)),
      updatedAt: serverTimestamp(),
    });
  }
  return { token, ...person, role };
}

export async function revokeProjectInvite(token: string) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  await updateDoc(doc(db, "projectInvites", token), {
    status: "revoked",
    updatedAt: serverTimestamp(),
  });
}

export async function projectMembership(projectId: string, uid: string) {
  const db = firestore();
  if (!db) return false;
  try {
    const snapshot = await getDoc(doc(db, "projects", projectId));
    if (!snapshot.exists()) return false;
    const ids = snapshot.data().participantIds;
    return Array.isArray(ids) && ids.includes(uid);
  } catch {
    return false;
  }
}

export async function acceptProjectInvite(
  token: string,
  uid: string,
  displayName: string,
  role: "researcher" | "senior_researcher",
) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  const inviteRef = doc(db, "projectInvites", token);
  const inviteSnap = await getDoc(inviteRef);
  if (!inviteSnap.exists()) throw new Error("This invite link is not active.");
  const invite = inviteSnap.data();
  if (invite.status !== "open") throw new Error("This invite link is closed.");
  if (invite.role !== role) {
    throw new Error(
      invite.role === "senior_researcher"
        ? "This invite is for a Senior Researcher."
        : "This invite is for a Researcher.",
    );
  }
  const projectId = String(invite.projectId ?? "");
  if (!projectId) throw new Error("This invite is not active.");
  if (await projectMembership(projectId, uid)) return "already" as const;

  const awardId = String(invite.awardId ?? "");
  if (role === "researcher" && awardId) {
    const lockRef = doc(db, "researcherAwardProjects", uid);
    const lock = await getDoc(lockRef);
    if (lock.exists() && lock.data().projectId !== projectId) {
      throw new Error(
        "You are already on a TRI AI Saturdays Award project.",
      );
    }
    if (!lock.exists()) {
      await setDoc(lockRef, { projectId, inviteToken: token });
    }
  }

  const claimRef = doc(db, "projectJoinClaims", uid, "projects", projectId);
  const claim = await getDoc(claimRef);
  if (!claim.exists()) await setDoc(claimRef, { inviteToken: token });

  const person = { uid, name: displayName.slice(0, 80) };
  const projectRef = doc(db, "projects", projectId);
  const membership =
    role === "researcher"
      ? { participantIds: arrayUnion(uid), researchers: arrayUnion(person), updatedAt: serverTimestamp() }
      : {
          participantIds: arrayUnion(uid),
          seniorResearchers: arrayUnion(person),
          updatedAt: serverTimestamp(),
        };
  const awardRef = awardId ? doc(db, "awards", awardId) : null;
  let addToAward = false;
  if (role === "researcher" && awardRef) {
    const awardSnap = await getDoc(awardRef);
    const ids = awardSnap.exists() ? awardSnap.data().recipientIds : [];
    addToAward = awardSnap.exists() && !(Array.isArray(ids) && ids.includes(uid));
  }

  await runTransaction(db, async (transaction) => {
    transaction.update(projectRef, membership);
    transaction.update(inviteRef, {
      acceptedIds: arrayUnion(uid),
      updatedAt: serverTimestamp(),
    });
    if (addToAward && awardRef) {
      transaction.update(awardRef, {
        recipientIds: arrayUnion(uid),
        recipients: arrayUnion(person),
        updatedAt: serverTimestamp(),
      });
    }
  });
  return "joined" as const;
}

type IntroducedMatch = {
  proposalId?: string;
  mentorId?: string;
  mentorName?: string;
  researcherId?: string;
  researcherIds?: string[];
  researcherName?: string;
  title?: string;
  introduced?: boolean;
};

function personRecord(uid: string, name: string) {
  return { uid, name: name.slice(0, 80) || "Researcher" };
}

function researchersForProposal(proposal: Record<string, unknown>, match: IntroducedMatch) {
  const fromProposal = Array.isArray(proposal.researcherIds) ? proposal.researcherIds.map(String).filter(Boolean) : [];
  const ids = fromProposal.length > 0 ? fromProposal : proposal.ownerId ? [String(proposal.ownerId)] : match.researcherId ? [match.researcherId] : [];
  const name = String(proposal.name || match.researcherName || "Researcher");
  return ids.map((uid, index) => personRecord(uid, index === 0 ? name : "Researcher"));
}

export async function ensureProjectsForIntroducedMatches(matches: IntroducedMatch[]) {
  const db = firestore();
  if (!db) return;
  const groups = new Map<string, IntroducedMatch[]>();
  for (const match of matches) {
    if (!match.introduced || !match.proposalId || !match.mentorId || !match.mentorName) continue;
    const list = groups.get(match.proposalId) ?? [];
    list.push(match);
    groups.set(match.proposalId, list);
  }
  if (groups.size === 0) return;
  const projectSnap = await getDocs(collection(db, "projects"));
  const byProposal = new Map<string, { id: string; title: string; participantIds: string[] }>();
  for (const item of projectSnap.docs) {
    const proposalId = String(item.data().proposalId ?? "");
    if (proposalId && !byProposal.has(proposalId)) {
      const participantIds = Array.isArray(item.data().participantIds) ? item.data().participantIds.map(String) : [];
      byProposal.set(proposalId, { id: item.id, title: String(item.data().title ?? ""), participantIds });
    }
  }
  for (const [proposalId, group] of groups) {
    const seniors = [...new Map(group.map((match) => [match.mentorId, personRecord(match.mentorId || "", match.mentorName || "")])).values()];
    const existing = byProposal.get(proposalId);
    const proposalSnap = await getDoc(doc(db, "proposals", proposalId));
    const proposal = proposalSnap.exists() ? proposalSnap.data() : {};
    const title = String(proposal.title || group[0].title || "Project").slice(0, 200);
    if (!existing) {
      const researchers = researchersForProposal(proposal, group[0]);
      await setDoc(doc(db, "projects", proposalId), {
        title,
        summary: String(proposal.summary ?? "").slice(0, 1000),
        researchArea: String(proposal.researchArea ?? ""),
        status: "scoping",
        health: "green",
        publicShowcase: false,
        proposalId,
        scoped: false,
        scopedMeetingId: "",
        charterSigned: false,
        awardId: String(proposal.awardId ?? ""),
        researchers,
        seniorResearchers: seniors,
        participantIds: [...new Set([...researchers.map((person) => person.uid), ...seniors.map((person) => person.uid)])],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      continue;
    }
    const missing = seniors.filter((person) => person.uid && !existing.participantIds.includes(person.uid));
    const titleChanged = title.length > 0 && title !== existing.title;
    if (missing.length === 0 && !titleChanged) continue;
    await updateDoc(doc(db, "projects", existing.id), {
      ...(titleChanged ? { title } : {}),
      ...(missing.length > 0
        ? {
            seniorResearchers: arrayUnion(...missing),
            participantIds: arrayUnion(...missing.map((person) => person.uid)),
          }
        : {}),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function introduceMatch(match: {
  id: string;
  proposalId: string;
  mentorId: string;
  mentorName: string;
  researcherId?: string;
  researcherName?: string;
  title?: string;
}) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  await ensureProjectsForIntroducedMatches([{ ...match, introduced: true }]);
  const introduction = `TRI AI has introduced you to ${match.mentorName}. The next step is a scoping meeting.`;
  await setDoc(
    doc(db, "matches", match.id),
    { introduced: true, updatedAt: serverTimestamp() },
    { merge: true },
  );
  await setDoc(
    doc(db, "proposals", match.proposalId),
    { introduction, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
