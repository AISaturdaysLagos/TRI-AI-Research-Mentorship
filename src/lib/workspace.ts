import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { firestore } from "./firebase";

export type WorkspaceProject = {
  id: string;
  title?: string;
  summary?: string;
  researchArea?: string;
  status?: string;
  health?: string;
  question?: string;
  contribution?: string;
  year?: string;
  publicShowcase?: boolean;
  scoped?: boolean;
  charterSigned?: boolean;
  awardId?: string;
  proposalId?: string;
  researchers?: { uid?: string; name?: string }[];
  seniorResearchers?: { uid?: string; name?: string }[];
  participantIds?: string[];
  driveFolderId?: string;
  driveFolderUrl?: string;
  driveFiles?: { id: string; name: string; url: string; kind: "folder" | "document" }[];
};

export type CharterRecord = {
  objectives: string;
  outOfScope: string;
  duration: string;
  researcherDuties: string;
  seniorDuties: string;
  triDuties: string;
  cadence: string;
  meetingFormat: string;
  resources: string;
  integrity: string;
  risks: string;
  authorship: string;
  ip: string;
  release: string;
  successCriteria: string;
  communication: string;
  notes: string;
};

export const EMPTY_CHARTER: CharterRecord = {
  objectives: "",
  outOfScope: "",
  duration: "",
  researcherDuties: "",
  seniorDuties: "",
  triDuties: "",
  cadence: "",
  meetingFormat: "",
  resources: "",
  integrity: "",
  risks: "",
  authorship: "",
  ip: "",
  release: "",
  successCriteria: "",
  communication: "",
  notes: "",
};

export const CHARTER_FIELD_LABELS: { key: keyof CharterRecord; label: string }[] = [
  { key: "objectives", label: "Objectives" },
  { key: "outOfScope", label: "Out of scope" },
  { key: "duration", label: "Duration" },
  { key: "researcherDuties", label: "Researcher responsibilities" },
  { key: "seniorDuties", label: "Senior Researcher responsibilities" },
  { key: "triDuties", label: "TRI AI responsibilities" },
  { key: "cadence", label: "Meeting cadence" },
  { key: "meetingFormat", label: "Meeting format" },
  { key: "resources", label: "Resources" },
  { key: "integrity", label: "Integrity and ethics" },
  { key: "risks", label: "Risks" },
  { key: "authorship", label: "Authorship" },
  { key: "ip", label: "Intellectual property" },
  { key: "release", label: "Release expectations" },
  { key: "successCriteria", label: "Success criteria" },
  { key: "communication", label: "Communication" },
  { key: "notes", label: "Additional notes" },
];

export type MilestoneRecord = {
  id: string;
  title?: string;
  ownerName?: string;
  due?: string;
  status?: string;
  evidence?: string;
};

export type ProgressRecord = {
  id: string;
  period?: string;
  changes?: string;
  evidence?: string;
  blockers?: string;
  nextStep?: string;
  triAction?: string;
};

export type ResourceRecord = {
  id: string;
  type?: string;
  request?: string;
  status?: string;
  limits?: string;
};

export type OutputRecord = {
  id: string;
  type?: string;
  title?: string;
  status?: string;
  link?: string;
  venue?: string;
  year?: string;
  public?: boolean;
};

export const OUTPUT_TYPES = [
  ["paper", "Paper"],
  ["preprint", "Preprint"],
  ["dataset", "Dataset"],
  ["benchmark", "Benchmark"],
  ["model", "Model"],
  ["software", "Software"],
  ["report", "Technical report"],
] as const;

export const OUTPUT_STATUSES = [
  ["planned", "Planned"],
  ["drafting", "Drafting"],
  ["internal_review", "Internal review"],
  ["submitted", "Submitted"],
  ["accepted", "Accepted"],
  ["published", "Published"],
  ["rejected", "Rejected"],
  ["archived", "Archived"],
] as const;

export const RESOURCE_TYPES = [
  ["compute", "Compute"],
  ["data", "Data"],
  ["software", "Software"],
] as const;

export const PROJECT_STATUSES = [
  ["scoping", "Scoping"],
  ["active", "Active"],
  ["paused", "Paused"],
  ["internal_review", "Internal review"],
  ["completed", "Completed"],
  ["discontinued", "Discontinued"],
] as const;

function dbOrThrow() {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  return db;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function clip(value: string, max: number) {
  return value.trim().slice(0, max);
}

export async function getWorkspaceProject(projectId: string) {
  const db = firestore();
  if (!db) return null;
  const snapshot = await getDoc(doc(db, "projects", projectId));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as WorkspaceProject;
}

export async function saveProjectDrive(
  projectId: string,
  drive: { id: string; url: string; files: { id: string; name: string; url: string; kind: "folder" | "document" }[] },
) {
  const db = dbOrThrow();
  await setDoc(
    doc(db, "projects", projectId),
    {
      driveFolderId: drive.id,
      driveFolderUrl: drive.url,
      driveFiles: drive.files.slice(0, 80).map((file) => ({
        id: file.id,
        name: file.name.slice(0, 180),
        url: file.url.slice(0, 300),
        kind: file.kind,
      })),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function saveProjectOverview(
  projectId: string,
  input: {
    question: string;
    contribution: string;
    year: string;
    health: string;
    status: string;
    publicShowcase: boolean;
  },
) {
  const db = dbOrThrow();
  await setDoc(
    doc(db, "projects", projectId),
    {
      question: clip(input.question, 700),
      contribution: clip(input.contribution, 700),
      year: clip(input.year, 4),
      health: input.health,
      status: input.status,
      publicShowcase: input.publicShowcase,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function getCharter(projectId: string) {
  const db = firestore();
  if (!db) return EMPTY_CHARTER;
  const snapshot = await getDoc(doc(db, "projects", projectId, "charter", "current"));
  if (!snapshot.exists()) return EMPTY_CHARTER;
  const data = snapshot.data();
  const legacyScope = text(data.scope);
  const legacyRoles = text(data.roles);
  return {
    objectives: text(data.objectives) || legacyScope,
    outOfScope: text(data.outOfScope),
    duration: text(data.duration),
    researcherDuties: text(data.researcherDuties) || legacyRoles,
    seniorDuties: text(data.seniorDuties),
    triDuties: text(data.triDuties),
    cadence: text(data.cadence),
    meetingFormat: text(data.meetingFormat),
    resources: text(data.resources),
    integrity: text(data.integrity),
    risks: text(data.risks),
    authorship: text(data.authorship),
    ip: text(data.ip),
    release: text(data.release),
    successCriteria: text(data.successCriteria),
    communication: text(data.communication),
    notes: text(data.notes),
  };
}

export async function saveCharter(projectId: string, charter: CharterRecord, uid: string) {
  const db = dbOrThrow();
  const next = {
    objectives: clip(charter.objectives, 1999),
    outOfScope: clip(charter.outOfScope, 1999),
    duration: clip(charter.duration, 1999),
    researcherDuties: clip(charter.researcherDuties, 1999),
    seniorDuties: clip(charter.seniorDuties, 1999),
    triDuties: clip(charter.triDuties, 1999),
    cadence: clip(charter.cadence, 1999),
    meetingFormat: clip(charter.meetingFormat, 1999),
    resources: clip(charter.resources, 1999),
    integrity: clip(charter.integrity, 1999),
    risks: clip(charter.risks, 1999),
    authorship: clip(charter.authorship, 1999),
    ip: clip(charter.ip, 1999),
    release: clip(charter.release, 1999),
    successCriteria: clip(charter.successCriteria, 1999),
    communication: clip(charter.communication, 1999),
    notes: clip(charter.notes, 1999),
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, "projects", projectId, "charter", "current"), next);
}

async function listNamed<T>(projectId: string, name: string) {
  const db = firestore();
  if (!db) return [] as T[];
  const snapshot = await getDocs(collection(db, "projects", projectId, name));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T);
}

export function listMilestones(projectId: string) {
  return listNamed<MilestoneRecord>(projectId, "milestones");
}

export function listProgress(projectId: string) {
  return listNamed<ProgressRecord>(projectId, "updates");
}

export function listResources(projectId: string) {
  return listNamed<ResourceRecord>(projectId, "resources");
}

export function listOutputs(projectId: string) {
  return listNamed<OutputRecord>(projectId, "outputs");
}

export type ProjectActivity = {
  projectId: string;
  milestones: MilestoneRecord[];
  updates: ProgressRecord[];
  resources: ResourceRecord[];
  outputs: OutputRecord[];
};

export type WorkTask = {
  id: string;
  title?: string;
  status?: "todo" | "doing" | "done" | string;
  ownerName?: string;
  due?: string;
  notes?: string;
  createdBy?: string;
};

export function listWorkTasks(projectId: string) {
  return listNamed<WorkTask>(projectId, "workTasks");
}

export async function addWorkTask(
  projectId: string,
  input: { title: string; ownerName: string },
  uid: string,
) {
  const db = dbOrThrow();
  const created = await addDoc(collection(db, "projects", projectId, "workTasks"), {
    title: clip(input.title, 150),
    status: "todo",
    ownerName: clip(input.ownerName, 100),
    due: "",
    notes: "",
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return created.id;
}

export async function saveWorkTask(
  projectId: string,
  taskId: string,
  input: { title: string; status: string; ownerName: string; due: string; notes: string },
) {
  const db = dbOrThrow();
  const status = input.status === "doing" || input.status === "done" ? input.status : "todo";
  await setDoc(
    doc(db, "projects", projectId, "workTasks", taskId),
    {
      title: clip(input.title, 150),
      status,
      ownerName: clip(input.ownerName, 100),
      due: clip(input.due, 10),
      notes: clip(input.notes, 1800),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function removeWorkTask(projectId: string, taskId: string) {
  const db = dbOrThrow();
  await deleteDoc(doc(db, "projects", projectId, "workTasks", taskId));
}

export async function listProjectActivities(projectIds: string[]) {
  return Promise.all(
    projectIds.map(async (projectId) => ({
      projectId,
      milestones: await listMilestones(projectId),
      updates: await listProgress(projectId),
      resources: await listResources(projectId),
      outputs: await listOutputs(projectId),
    })),
  );
}

export async function listPublicOutputs(projectId: string) {
  const db = firestore();
  if (!db) return [] as OutputRecord[];
  const snapshot = await getDocs(query(collection(db, "projects", projectId, "outputs"), where("public", "==", true)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as OutputRecord);
}

export async function addMilestone(
  projectId: string,
  input: { title: string; ownerName: string; due: string; evidence: string },
  uid: string,
) {
  const db = dbOrThrow();
  await addDoc(collection(db, "projects", projectId, "milestones"), {
    title: clip(input.title, 150),
    ownerName: clip(input.ownerName, 100),
    due: clip(input.due, 10),
    status: "open",
    evidence: clip(input.evidence, 480),
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function setMilestoneStatus(projectId: string, milestoneId: string, status: "open" | "done") {
  const db = dbOrThrow();
  await setDoc(
    doc(db, "projects", projectId, "milestones", milestoneId),
    { status, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function addProgress(
  projectId: string,
  input: { period: string; changes: string; evidence: string; blockers: string; nextStep: string; triAction: string },
  uid: string,
) {
  const db = dbOrThrow();
  await addDoc(collection(db, "projects", projectId, "updates"), {
    period: clip(input.period, 70),
    changes: clip(input.changes, 1800),
    evidence: clip(input.evidence, 1800),
    blockers: clip(input.blockers, 1800),
    nextStep: clip(input.nextStep, 1800),
    triAction: clip(input.triAction, 1800),
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function addResource(projectId: string, input: { type: string; request: string }, uid: string) {
  const db = dbOrThrow();
  await addDoc(collection(db, "projects", projectId, "resources"), {
    type: input.type,
    request: clip(input.request, 900),
    status: "requested",
    limits: "",
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function decideResource(projectId: string, resourceId: string, status: string, limits: string) {
  const db = dbOrThrow();
  await setDoc(
    doc(db, "projects", projectId, "resources", resourceId),
    { status, limits: clip(limits, 480), updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function addOutput(
  projectId: string,
  input: { type: string; title: string; status: string; link: string; venue: string; year: string },
  uid: string,
) {
  const db = dbOrThrow();
  await addDoc(collection(db, "projects", projectId, "outputs"), {
    type: input.type,
    title: clip(input.title, 180),
    status: input.status,
    link: clip(input.link, 480),
    venue: clip(input.venue, 180),
    year: clip(input.year, 4),
    public: false,
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function setOutputPublic(projectId: string, outputId: string, isPublic: boolean) {
  const db = dbOrThrow();
  await setDoc(
    doc(db, "projects", projectId, "outputs", outputId),
    { public: isPublic, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
