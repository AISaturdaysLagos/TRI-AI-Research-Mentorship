import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import { firebaseAuth, firestore } from "./firebase";
import { formatZonedWhen } from "./timezones";

export type MeetingPerson = { uid: string; name: string; email: string };

export type MeetingKind = "scoping" | "project";

export type MeetingResponseValue = "attending" | "not_attending" | "needs_another_time";

export const scopingNeedsMatch = "Introduce a Senior Researcher first.";

export function meetingReplyPhrase(response: string | undefined) {
  if (response === "attending") return "can attend";
  if (response === "not_attending") return "can't attend";
  if (response === "needs_another_time") return "needs another time";
  return "has not replied";
}

export type MeetingRow = {
  id: string;
  kind?: MeetingKind;
  title?: string;
  proposalId?: string;
  projectId?: string;
  startsAt?: { toDate?: () => Date };
  endsAt?: { toDate?: () => Date };
  note?: string;
  participantIds?: string[];
  researchers?: MeetingPerson[];
  seniorResearchers?: MeetingPerson[];
  admins?: MeetingPerson[];
  calendarEventId?: string;
  calendarLink?: string;
  status?: string;
};

export type MeetingReply = {
  id: string;
  response?: MeetingResponseValue;
  note?: string;
};

export function meetingDate(value: { toDate?: () => Date } | undefined) {
  const date = value?.toDate?.();
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
}

export function meetingHasHappened(
  meeting: { status?: string; endsAt?: { toDate?: () => Date } },
  now = new Date(),
) {
  if (meeting.status === "cancelled") return false;
  const end = meetingDate(meeting.endsAt);
  return Boolean(end && end.getTime() < now.getTime());
}

export function meetingIsArchived(meeting: MeetingRow, now = new Date()) {
  return meeting.status === "cancelled" || meetingHasHappened(meeting, now);
}

export function meetingAttendees(meeting: Pick<MeetingRow, "researchers" | "seniorResearchers" | "admins">) {
  return [...(meeting.researchers ?? []), ...(meeting.seniorResearchers ?? []), ...(meeting.admins ?? [])];
}

export function meetingForProject(
  meeting: MeetingRow,
  project: { id: string; proposalId?: string },
) {
  if (meeting.projectId && meeting.projectId === project.id) return true;
  return Boolean(
    meeting.kind === "scoping" && project.proposalId && meeting.proposalId === project.proposalId,
  );
}

export function formatMeetingWhen(value: { toDate?: () => Date } | undefined) {
  const date = meetingDate(value);
  if (!date) return "Time not set";
  return formatZonedWhen(date, "Africa/Lagos");
}

export async function listMeetings() {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "meetings"));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as MeetingRow[];
}

export async function listParticipantMeetings(uid: string) {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(
    query(collection(db, "meetings"), where("participantIds", "array-contains", uid)),
  );
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as MeetingRow[];
}

export async function listMeetingReplies(meetingId: string) {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "meetings", meetingId, "responses"));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as MeetingReply[];
}

export const scopingMeetingTaken =
  "This project already has a scoping meeting.";

async function reserveScopingMeeting(
  proposalId: string,
  uid: string,
  claim: { matchId?: string; projectId?: string },
) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  const slotRef = doc(db, "scopingSlots", proposalId);
  const meetingId = doc(collection(db, "meetings")).id;
  const slot = await getDoc(slotRef);
  if (slot.exists()) {
    const priorId = String(slot.data()?.meetingId ?? "");
    if (priorId) {
      try {
        const prior = await getDoc(doc(db, "meetings", priorId));
        if (prior.exists() && prior.data()?.status !== "cancelled") throw new Error(scopingMeetingTaken);
      } catch (err) {
        if (err instanceof Error && err.message === scopingMeetingTaken) throw err;
      }
    }
  }
  try {
    await runTransaction(db, async (tx) => {
      tx.set(slotRef, {
        meetingId,
        proposalId,
        claimedBy: uid,
        updatedAt: serverTimestamp(),
        ...(claim.matchId ? { matchId: claim.matchId } : {}),
        ...(claim.projectId ? { projectId: claim.projectId } : {}),
      });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("PERMISSION_DENIED") || message.includes("evaluation error")) {
      throw new Error(scopingMeetingTaken);
    }
    throw err;
  }
  return meetingId;
}

export async function ensureScopingSlots(meetings: MeetingRow[], uid: string) {
  const db = firestore();
  if (!db || !uid) return;
  const failures: string[] = [];
  const chosen = new Map<string, MeetingRow>();
  for (const meeting of meetings) {
    if (meeting.kind !== "scoping" || meeting.status === "cancelled" || !meeting.proposalId) continue;
    const current = chosen.get(meeting.proposalId);
    const start = meetingDate(meeting.startsAt)?.getTime() ?? 0;
    const currentStart = current ? (meetingDate(current.startsAt)?.getTime() ?? 0) : Number.POSITIVE_INFINITY;
    if (!current || start < currentStart) chosen.set(meeting.proposalId, meeting);
  }
  await Promise.all(
    [...chosen.entries()].map(async ([proposalId, meeting]) => {
      const slotRef = doc(db, "scopingSlots", proposalId);
      try {
        await runTransaction(db, async (tx) => {
          const slot = await tx.get(slotRef);
          if (slot.exists()) return;
          tx.set(slotRef, {
            meetingId: meeting.id,
            proposalId,
            claimedBy: uid,
            updatedAt: serverTimestamp(),
          });
        });
      } catch (err) {
        failures.push(err instanceof Error ? err.message : "Could not record the scoping meeting.");
      }
    }),
  );
  return failures;
}

export async function saveMeeting(input: {
  kind: MeetingKind;
  title: string;
  proposalId: string;
  projectId: string;
  starts: Date;
  ends: Date;
  note: string;
  researchers: MeetingPerson[];
  seniorResearchers: MeetingPerson[];
  admins?: MeetingPerson[];
  calendarEventId: string;
  calendarLink: string;
  createdBy: string;
  claim?: { matchId?: string; projectId?: string };
}) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  if (input.kind === "scoping") {
    const matches = await getDocs(query(collection(db, "matches"), where("proposalId", "==", input.proposalId)));
    const matched = matches.docs.some((item) => {
      const row = item.data();
      return row.introduced === true && typeof row.mentorId === "string" && row.mentorId.length > 0;
    });
    if (!matched) throw new Error(scopingNeedsMatch);
  }
  const admins = input.kind === "scoping" ? (input.admins ?? []).slice(0, 3) : [];
  const participantIds = [
    ...new Set([...input.researchers, ...input.seniorResearchers, ...admins].map((person) => person.uid)),
  ];
  const uid = firebaseAuth()?.currentUser?.uid || input.createdBy;
  const meetingId =
    input.kind === "scoping"
      ? await reserveScopingMeeting(input.proposalId, uid, input.claim ?? {})
      : doc(collection(db, "meetings")).id;
  await setDoc(doc(db, "meetings", meetingId), {
    kind: input.kind,
    title: input.title,
    proposalId: input.proposalId,
    projectId: input.projectId,
    startsAt: Timestamp.fromDate(input.starts),
    endsAt: Timestamp.fromDate(input.ends),
    note: input.note,
    participantIds,
    researchers: input.researchers,
    seniorResearchers: input.seniorResearchers,
    ...(input.kind === "scoping" ? { admins } : {}),
    calendarEventId: input.calendarEventId,
    calendarLink: input.calendarLink,
    status: "scheduled",
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return meetingId;
}

export async function updateMeeting(id: string, input: { starts: Date; ends: Date; note: string; calendarLink: string }) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  await setDoc(
    doc(db, "meetings", id),
    {
      startsAt: Timestamp.fromDate(input.starts),
      endsAt: Timestamp.fromDate(input.ends),
      note: input.note,
      calendarLink: input.calendarLink,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function cancelMeeting(id: string) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  await setDoc(doc(db, "meetings", id), { status: "cancelled", updatedAt: serverTimestamp() }, { merge: true });
}

export async function saveMeetingReply(meetingId: string, uid: string, response: MeetingResponseValue, note: string) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  await setDoc(doc(db, "meetings", meetingId, "responses", uid), {
    response,
    note,
    updatedAt: serverTimestamp(),
  });
}
