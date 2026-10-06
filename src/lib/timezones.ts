import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore } from "./firebase";

export const PROGRAMME_ZONE = "Africa/Lagos";

const FEATURED = [
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Africa/Cairo",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Kolkata",
  "UTC",
];

export function listTimeZones() {
  const supported = Intl.supportedValuesOf?.("timeZone");
  const zones = supported && supported.length > 0 ? supported : FEATURED;
  return [...new Set([PROGRAMME_ZONE, ...zones])];
}

export function isKnownZone(zone: string) {
  return listTimeZones().includes(zone);
}

export function zoneClockName(zone: string, when = new Date()) {
  if (zone === PROGRAMME_ZONE) return "WAT";
  const name = new Intl.DateTimeFormat("en-GB", { timeZone: zone, timeZoneName: "short" })
    .formatToParts(when)
    .find((part) => part.type === "timeZoneName")?.value;
  return name || zone;
}

export function zoneLabel(zone: string, when = new Date()) {
  const place = zone.replaceAll("_", " ");
  const clock = zoneClockName(zone, when);
  if (zone === PROGRAMME_ZONE) return `West Africa Time (WAT) — default · ${place}`;
  return `${place} · ${clock}`;
}

export function featuredZones() {
  return FEATURED.filter((zone) => isKnownZone(zone));
}

function zonedParts(value: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
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
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour,
    minute: parts.minute,
  };
}

export function zonedDateAndTime(value: Date, timeZone: string) {
  const parts = zonedParts(value, timeZone);
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function zonedWallTime(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let utc = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = zonedParts(new Date(utc), timeZone);
    const shown = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    const delta = shown - desired;
    if (delta === 0) break;
    utc -= delta;
  }
  return new Date(utc);
}

export function quarterHours() {
  const times: string[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of [0, 15, 30, 45]) {
      times.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  }
  return times;
}

export function formatClock(time: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return time;
  const hour = Number(match[1]);
  const suffix = hour >= 12 ? "pm" : "am";
  return `${hour % 12 || 12}:${match[2]} ${suffix}`;
}

export function formatNoteClocks(note: string) {
  return note.replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g, (time) => formatClock(time));
}

export function formatZonedDateTime(value: Date, timeZone: string, includeDate = true) {
  const time = value
    .toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\s*([AP])M$/i, (_, mark: string) => ` ${mark.toLowerCase()}m`);
  if (!includeDate) return time;
  const date = value.toLocaleDateString("en-GB", { timeZone, day: "numeric", month: "short", year: "numeric" });
  return `${date}, ${time}`;
}

export function formatZonedWhen(value: Date, timeZone: string) {
  return `${formatZonedDateTime(value, timeZone)} ${zoneClockName(timeZone, value)}`;
}

export function formatZonedSpan(start: Date, end: Date, timeZone: string) {
  const startDay = zonedDateAndTime(start, timeZone).date;
  const endDay = zonedDateAndTime(end, timeZone).date;
  const startLabel = formatZonedDateTime(start, timeZone);
  const endLabel = startDay === endDay ? formatZonedDateTime(end, timeZone, false) : formatZonedDateTime(end, timeZone);
  return `${startLabel} – ${endLabel} ${zoneClockName(timeZone, start)}`;
}

export async function loadTimezones(uids: string[]) {
  const db = firestore();
  const unique = [...new Set(uids.filter(Boolean))];
  if (!db || unique.length === 0) {
    return Object.fromEntries(unique.map((uid) => [uid, PROGRAMME_ZONE]));
  }
  const entries = await Promise.all(
    unique.map(async (uid) => {
      const snapshot = await getDoc(doc(db, "timezones", uid));
      const zone = snapshot.exists() ? String(snapshot.data().timezone ?? "") : "";
      return [uid, isKnownZone(zone) ? zone : PROGRAMME_ZONE] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export async function saveTimezone(uid: string, timezone: string) {
  const db = firestore();
  if (!db) throw new Error("This is unavailable right now.");
  if (!isKnownZone(timezone)) throw new Error("Choose a time zone from the list.");
  await setDoc(doc(db, "timezones", uid), { timezone, updatedAt: serverTimestamp() });
}
