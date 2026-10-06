import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import type { AttentionNotice } from "./notices";
import { listDismissedNotices } from "./records";
import { firestore } from "./firebase";

function notificationRef(uid: string, noticeId: string) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  return doc(db, "users", uid, "notifications", noticeId.replaceAll("/", "_"));
}

function clip(value: string, max: number) {
  return value.length > max ? value.slice(0, max) : value;
}

export async function syncNotifications(uid: string, notices: AttentionNotice[]) {
  const db = firestore();
  if (!db) return;
  const dismissed = new Set(await listDismissedNotices(uid));
  await Promise.all(
    notices.map((notice) =>
      runTransaction(db, async (tx) => {
        const ref = notificationRef(uid, notice.id);
        const existing = await tx.get(ref);
        if (existing.exists()) return;
        tx.set(ref, {
          noticeId: notice.id.replaceAll("/", "_"),
          status: clip(notice.status, 79),
          text: clip(notice.text, 599),
          next: clip(notice.next, 299),
          owner: clip(notice.owner, 79),
          href: clip(notice.href ?? "", 199),
          action: clip(notice.action ?? "", 79),
          closed: dismissed.has(notice.id),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }),
    ),
  );
}

export function watchNotifications(uid: string, onItems: (items: AttentionNotice[]) => void, onError: (message: string) => void) {
  const db = firestore();
  if (!db) return () => undefined;
  const inbox = collection(db, "users", uid, "notifications");
  return onSnapshot(
    inbox,
    (snapshot) => {
      const items = snapshot.docs
        .map((item) => item.data())
        .filter((item) => item.closed !== true)
        .map((item) => ({
          id: String(item.noticeId ?? ""),
          status: String(item.status ?? ""),
          text: String(item.text ?? ""),
          next: String(item.next ?? ""),
          owner: String(item.owner ?? ""),
          href: item.href ? String(item.href) : undefined,
          action: item.action ? String(item.action) : undefined,
        }));
      onItems(items);
    },
    (err) => onError(err.message),
  );
}

export async function closeNotification(uid: string, noticeId: string) {
  await updateDoc(notificationRef(uid, noticeId), {
    closed: true,
    updatedAt: serverTimestamp(),
  });
}

