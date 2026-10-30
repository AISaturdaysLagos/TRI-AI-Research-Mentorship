import { Timestamp, collection, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore } from "./firebase";
import { PROGRAMME_ZONE } from "./timezones";

export type OnboardingGuest = { name: string; email: string };

export type OnboardingMeeting = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  meetingLink: string;
  calendarEventId: string;
  timeZone: string;
  guests: OnboardingGuest[];
};

function asDate(value: unknown) {
  if (value instanceof Timestamp) return value.toDate();
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  return new Date(NaN);
}

function asGuests(value: unknown): OnboardingGuest[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { name?: unknown; email?: unknown };
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const email = typeof row.email === "string" ? row.email.trim() : "";
    if (!name && !email) return [];
    return [{ name, email }];
  });
}

export async function listOnboardingMeetings() {
  const db = firestore();
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "onboardingMeetings"));
  return snapshot.docs
    .map((item) => {
      const data = item.data();
      const startsAt = asDate(data.startsAt);
      const endsAt = asDate(data.endsAt);
      return {
        id: item.id,
        title: String(data.title || "Senior Researcher onboarding"),
        startsAt,
        endsAt,
        meetingLink: String(data.meetingLink || ""),
        calendarEventId: String(data.calendarEventId || ""),
        timeZone: String(data.timeZone || PROGRAMME_ZONE),
        guests: asGuests(data.guests),
      } satisfies OnboardingMeeting;
    })
    .filter((meeting) => !Number.isNaN(meeting.startsAt.getTime()))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export async function saveOnboardingMeeting(input: {
  id?: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  meetingLink: string;
  calendarEventId: string;
  timeZone: string;
  guests: OnboardingGuest[];
  uid: string;
}) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  const ref = input.id ? doc(db, "onboardingMeetings", input.id) : doc(collection(db, "onboardingMeetings"));
  const guests = input.guests.map((guest) => ({ name: guest.name.trim(), email: guest.email.trim() }));
  const shared = {
    title: input.title.trim(),
    startsAt: Timestamp.fromDate(input.startsAt),
    endsAt: Timestamp.fromDate(input.endsAt),
    meetingLink: input.meetingLink.trim(),
    calendarEventId: input.calendarEventId.trim(),
    timeZone: input.timeZone.trim(),
    guests,
  };
  if (input.id) {
    await setDoc(ref, shared, { merge: true });
    return ref.id;
  }
  await setDoc(ref, {
    ...shared,
    createdBy: input.uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
