import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import { firestore } from "./firebase";

export type ProgrammeTask = {
  id: string;
  title: string;
  detail: string;
  status: "open" | "done";
  createdAt: Date | null;
  createdByName: string;
  doneAt: Date | null;
  doneByName: string;
  sourceKey: string;
};

export function taskActorName(displayName: string, email: string) {
  const name = displayName.trim();
  if (name) return name;
  const mail = email.trim();
  if (mail) return mail;
  return "TRI AI Admin";
}

function asDate(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as Timestamp).toDate === "function") {
    const date = (value as Timestamp).toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function asTask(id: string, data: Record<string, unknown>): ProgrammeTask {
  const status = data.status === "done" ? "done" : "open";
  return {
    id,
    title: String(data.title ?? ""),
    detail: String(data.detail ?? ""),
    status,
    createdAt: asDate(data.createdAt),
    createdByName: String(data.createdByName ?? ""),
    doneAt: asDate(data.doneAt),
    doneByName: String(data.doneByName ?? ""),
    sourceKey: String(data.sourceKey ?? ""),
  };
}

export function watchTasks(onTasks: (tasks: ProgrammeTask[]) => void, onError: (message: string) => void) {
  const db = firestore();
  if (!db) return () => undefined;
  return onSnapshot(
    collection(db, "tasks"),
    (snapshot) => {
      const tasks = snapshot.docs.map((item) => asTask(item.id, item.data()));
      tasks.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      onTasks(tasks);
    },
    (err) => onError(err.message),
  );
}

export async function addTask(input: { title: string; detail: string; actorId: string; actorName: string }) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  const title = input.title.trim();
  const detail = input.detail.trim();
  if (!title || title.length >= 160) throw new Error("Give the task a shorter title.");
  if (detail.length >= 500) throw new Error("Use a shorter note.");
  if (!input.actorId || !input.actorName) throw new Error("Sign in to add a task.");
  await addDoc(collection(db, "tasks"), {
    title,
    detail,
    status: "open",
    createdAt: serverTimestamp(),
    createdBy: input.actorId,
    createdByName: input.actorName,
    updatedAt: serverTimestamp(),
  });
}

export async function finishProgrammeTask(input: {
  sourceKey: string;
  title: string;
  detail: string;
  actorId: string;
  actorName: string;
}) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  const title = input.title.trim();
  const detail = input.detail.trim();
  if (!/^[\w:-]+$/.test(input.sourceKey) || input.sourceKey.length >= 120) {
    throw new Error("Could not save this task.");
  }
  if (!title || title.length >= 160) throw new Error("Give the task a shorter title.");
  if (detail.length >= 500) throw new Error("Use a shorter note.");
  if (!input.actorId || !input.actorName) throw new Error("Sign in to mark this task done.");
  await setDoc(doc(db, "tasks", input.sourceKey), {
    title,
    detail,
    status: "done",
    sourceKey: input.sourceKey,
    createdAt: serverTimestamp(),
    createdBy: input.actorId,
    createdByName: input.actorName,
    updatedAt: serverTimestamp(),
    doneAt: serverTimestamp(),
    doneBy: input.actorId,
    doneByName: input.actorName,
  });
}

export async function completeTask(taskId: string, actorId: string, actorName: string) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  if (!taskId || !actorId || !actorName) throw new Error("Sign in to mark this task done.");
  await updateDoc(doc(db, "tasks", taskId), {
    status: "done",
    doneAt: serverTimestamp(),
    doneBy: actorId,
    doneByName: actorName,
    updatedAt: serverTimestamp(),
  });
}
