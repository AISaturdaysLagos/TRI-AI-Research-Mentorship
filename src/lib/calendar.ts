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

type CalendarEventInput = {
  title: string;
  starts: Date;
  ends: Date;
  details: string;
  emails: string[];
  timeZone?: string;
  meet?: boolean;
};

type CalendarEventResult = { eventId: string; link: string };

async function calendarAccessToken() {
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
  return GoogleAuthProvider.credentialFromResult(result)?.accessToken ?? null;
}

function calendarEventBody(input: CalendarEventInput, meet: boolean) {
  const timeZone = input.timeZone || "Africa/Lagos";
  return {
    summary: input.title,
    description: input.details,
    start: { dateTime: input.starts.toISOString(), timeZone },
    end: { dateTime: input.ends.toISOString(), timeZone },
    attendees: input.emails.filter(Boolean).map((email) => ({ email })),
    ...(meet
      ? {
          conferenceData: {
            createRequest: {
              requestId: crypto.randomUUID(),
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }
      : {}),
  };
}

async function insertCalendarEvent(token: string, input: CalendarEventInput): Promise<CalendarEventResult> {
  const meet = input.meet !== false;
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("sendUpdates", "all");
  if (meet) url.searchParams.set("conferenceDataVersion", "1");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(calendarEventBody(input, meet)),
  });
  if (!response.ok) throw new Error("Could not save this meeting in Google Calendar.");
  const body = (await response.json()) as { id?: string; htmlLink?: string; hangoutLink?: string };
  if (!body.htmlLink?.startsWith("https://")) throw new Error("Could not save this meeting in Google Calendar.");
  if (meet && !body.hangoutLink?.startsWith("https://")) {
    throw new Error("Google Calendar did not add a meeting to this event.");
  }
  return { eventId: String(body.id ?? ""), link: body.htmlLink };
}

export async function createGoogleCalendarEvent(input: CalendarEventInput) {
  const token = await calendarAccessToken();
  if (!token) return null;
  return insertCalendarEvent(token, input);
}

/** Create the event, or update it when it already exists. One Google sign-in covers both. */
export async function saveGoogleCalendarEvent(input: CalendarEventInput & { eventId?: string }) {
  const token = await calendarAccessToken();
  if (!token) return null;
  const eventId = input.eventId?.trim();
  if (eventId) {
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    );
    url.searchParams.set("sendUpdates", "all");
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(calendarEventBody(input, false)),
    });
    if (response.ok) {
      const body = (await response.json()) as { id?: string; htmlLink?: string };
      if (body.htmlLink?.startsWith("https://")) {
        return { eventId: String(body.id || eventId), link: body.htmlLink };
      }
    } else if (response.status !== 404) {
      throw new Error("Could not save this meeting in Google Calendar.");
    }
  }
  return insertCalendarEvent(token, { ...input, meet: true });
}

/** Remove an event from the signed-in Google Calendar and notify the guests. */
export async function deleteGoogleCalendarEvent(eventId: string) {
  const token = await calendarAccessToken();
  if (!token) return null;
  const id = eventId.trim();
  if (!id) return "missing" as const;
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(id)}`);
  url.searchParams.set("sendUpdates", "all");
  const response = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 204 || response.status === 200) return "removed" as const;
  if (response.status === 404 || response.status === 410) return "missing" as const;
  throw new Error("Could not remove this meeting from Google Calendar.");
}
