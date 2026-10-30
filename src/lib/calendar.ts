import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { firebaseAuth } from "./firebase";
import { zonedWallTime } from "./timezones";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function nextSaturdayAtFourWat(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Lagos",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  const weekday = WEEKDAYS.indexOf(parts.weekday);
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  let daysAhead = (6 - weekday + 7) % 7;
  if (daysAhead === 0 && (hour > 16 || (hour === 16 && minute > 0))) daysAhead = 7;
  const scheduled = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + daysAhead));
  const date = [
    scheduled.getUTCFullYear(),
    String(scheduled.getUTCMonth() + 1).padStart(2, "0"),
    String(scheduled.getUTCDate()).padStart(2, "0"),
  ].join("-");
  return { date, start: "16:00", end: "17:00" };
}

export function watDateAndTime(value: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(value)
      .map((part) => [part.type, part.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function watWallTime(date: string, time: string) {
  return zonedWallTime(date, time, "Africa/Lagos");
}

export function calendarTemplateLink(input: {
  title: string;
  starts: Date;
  ends: Date;
  details: string;
  emails: string[];
}) {
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", input.title);
  url.searchParams.set("dates", `${stamp(input.starts)}/${stamp(input.ends)}`);
  url.searchParams.set("details", input.details);
  const guests = input.emails.filter(Boolean);
  if (guests.length > 0) url.searchParams.set("add", guests.join(","));
  return url.toString();
}

export async function createGoogleCalendarEvent(input: {
  title: string;
  starts: Date;
  ends: Date;
  details: string;
  emails: string[];
  timeZone?: string;
  meet?: boolean;
}) {
  const auth = firebaseAuth();
  const current = auth?.currentUser;
  if (!auth || !current) return null;
  if (!current.providerData.some((item) => item.providerId === "google.com")) return null;
  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/calendar.events");
  provider.setCustomParameters({
    login_hint: current.email ?? "",
    prompt: "consent",
  });
  const result = await signInWithPopup(auth, provider);
  const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
  if (!token) return null;
  const timeZone = input.timeZone || "Africa/Lagos";
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("sendUpdates", "all");
  if (input.meet) url.searchParams.set("conferenceDataVersion", "1");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: input.title,
      description: input.details,
      start: { dateTime: input.starts.toISOString(), timeZone },
      end: { dateTime: input.ends.toISOString(), timeZone },
      attendees: input.emails.filter(Boolean).map((email) => ({ email })),
      ...(input.meet
        ? {
            conferenceData: {
              createRequest: {
                requestId: crypto.randomUUID(),
                conferenceSolutionKey: { type: "hangoutsMeet" },
              },
            },
          }
        : {}),
    }),
  });
  if (!response.ok) throw new Error("Could not save this meeting in Google Calendar.");
  const body = (await response.json()) as { id?: string; htmlLink?: string; hangoutLink?: string };
  if (!body.htmlLink?.startsWith("https://")) return null;
  if (input.meet && !body.hangoutLink?.startsWith("https://")) {
    throw new Error("Google Calendar did not add a meeting to this event.");
  }
  return { eventId: String(body.id ?? ""), link: body.htmlLink };
}
