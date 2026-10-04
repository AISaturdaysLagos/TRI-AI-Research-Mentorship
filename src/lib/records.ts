import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import type { ProposalDraft, SeniorProfileDraft } from "../types/domain";
import { firestore } from "./firebase";

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

export async function saveProposal(
  id: string | null,
  ownerId: string,
  draft: ProposalDraft,
  status: "draft" | "received" | "research_scoping",
) {
  const db = firestore();
  if (!db) throw new Error("Firebase is not configured.");
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
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function listProposals() {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "proposals"));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function saveSeniorProfile(uid: string, draft: SeniorProfileDraft) {
  const db = firestore();
  if (!db) throw new Error("Firebase is not configured.");
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
  return snapshot.exists() ? snapshot.data() : null;
}

export async function listPublicProjects() {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(
    query(collection(db, "projects"), where("publicShowcase", "==", true)),
  );
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function getAward(token: string) {
  const db = firestore();
  if (!db) return null;
  const snapshot = await getDoc(doc(db, "awards", token));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function listMentorMatches(mentorId: string) {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, "matches"), where("mentorId", "==", mentorId)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}
