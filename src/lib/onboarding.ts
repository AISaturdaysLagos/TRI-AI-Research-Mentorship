import { Timestamp, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore } from "./firebase";

export type OnboardingGuest = { name: string; email: string };

export async function saveOnboardingMeeting(input: {
  title: string;
  startsAt: Date;
  endsAt: Date;
  meetingLink: string;
  guests: OnboardingGuest[];
  uid: string;
}) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  const ref = doc(collection(db, "onboardingMeetings"));
  await setDoc(ref, {
    title: input.title.trim(),
    startsAt: Timestamp.fromDate(input.startsAt),
    endsAt: Timestamp.fromDate(input.endsAt),
    meetingLink: input.meetingLink.trim(),
    guests: input.guests.map((guest) => ({ name: guest.name.trim(), email: guest.email.trim() })),
    createdBy: input.uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
