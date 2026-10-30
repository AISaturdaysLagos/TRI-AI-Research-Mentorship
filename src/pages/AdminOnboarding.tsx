import { FormEvent, useState } from "react";
import { MeetingTimePicker, type TimeChoice } from "../components/MeetingTimePicker";
import { useAuth } from "../lib/auth";
import { createGoogleCalendarEvent, nextSaturdayAtFourWat } from "../lib/calendar";
import { named, openLocalEmail, seniorOnboardingEmail, type EmailDraft } from "../lib/email";
import { userFacingError } from "../lib/errors";
import { saveOnboardingMeeting, type OnboardingGuest } from "../lib/onboarding";
import { PROGRAMME_ZONE, formatZonedSpan, zonedWallTime } from "../lib/timezones";

const MAX_GUESTS = 8;

function blankGuest(): OnboardingGuest {
  return { name: "", email: "" };
}

function openingChoice(): TimeChoice {
  const opening = nextSaturdayAtFourWat();
  return { date: opening.date, start: opening.start, end: opening.end, zone: PROGRAMME_ZONE };
}

function withAdmin(emails: string[], adminEmail: string) {
  const next = emails.filter(Boolean);
  const admin = adminEmail.trim();
  if (admin && !next.some((email) => email.toLowerCase() === admin.toLowerCase())) next.push(admin);
  return next;
}

export function InviteSeniorResearchers() {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState("Senior Researcher onboarding");
  const [when, setWhen] = useState<TimeChoice>(openingChoice);
  const [guests, setGuests] = useState<OnboardingGuest[]>([blankGuest()]);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [calendarHref, setCalendarHref] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function updateGuest(index: number, patch: Partial<OnboardingGuest>) {
    setGuests((current) => current.map((guest, item) => (item === index ? { ...guest, ...patch } : guest)));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setError("");
    setMessage("");
    const people = guests
      .map((guest) => ({ name: guest.name.trim(), email: guest.email.trim() }))
      .filter((guest) => guest.name || guest.email);
    if (people.length === 0) {
      setError("Add at least one Senior Researcher.");
      return;
    }
    if (people.some((guest) => !guest.name || !guest.email.includes("@"))) {
      setError("Each Senior Researcher needs a name and an email address.");
      return;
    }
    const emails = new Set<string>();
    for (const guest of people) {
      const key = guest.email.toLowerCase();
      if (emails.has(key)) {
        setError("Each email address can be invited once.");
        return;
      }
      emails.add(key);
    }
    const startsAt = zonedWallTime(when.date, when.start, when.zone);
    const endsAt = zonedWallTime(when.date, when.end, when.zone);
    if (!(endsAt.getTime() > startsAt.getTime())) {
      setError("The meeting needs an end time after the start.");
      return;
    }
    const adminEmail = (profile?.email || user.email || "").trim();
    if (!adminEmail) {
      setError("Your account needs an email address before it can be added to Google Calendar.");
      return;
    }
    const calendarWindow = window.open("", "_blank");
    let calendarOpened = false;
    setBusy(true);
    try {
      const meetingTitle = title.trim() || "Senior Researcher onboarding";
      const created = await createGoogleCalendarEvent({
        title: meetingTitle,
        starts: startsAt,
        ends: endsAt,
        details: "TRI AI Senior Researcher onboarding. This calendar event includes the meeting.",
        emails: withAdmin(people.map((guest) => guest.email), adminEmail),
        timeZone: when.zone,
        meet: true,
      });
      if (!created) {
        calendarWindow?.close();
        setError("Sign in with Google to add these Senior Researchers to Google Calendar. The email uses that calendar link.");
        return;
      }
      if (calendarWindow && !calendarWindow.closed) {
        calendarWindow.location.href = created.link;
        calendarOpened = true;
      } else calendarWindow?.close();
      setCalendarHref(created.link);
      await saveOnboardingMeeting({
        title: meetingTitle,
        startsAt,
        endsAt,
        meetingLink: created.link,
        guests: people,
        uid: user.uid,
      });
      const span = formatZonedSpan(startsAt, endsAt, when.zone);
      setDrafts(
        people.map((guest) =>
          seniorOnboardingEmail({
            senior: named(guest.name, guest.email),
            title: meetingTitle,
            when: span,
            calendarLink: created.link,
          }),
        ),
      );
      setMessage(
        people.length === 1
          ? "Google Calendar is open, with you on the event. Open the email in your mail app."
          : `Google Calendar is open, with you on the event. Open each of the ${people.length} emails in your mail app.`,
      );
    } catch (err) {
      if (!calendarOpened) calendarWindow?.close();
      setError(userFacingError(err, "Could not save the onboarding meeting."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="invite-panel">
      <p className="quiet">
        Add one or more Senior Researchers. You are added to the same Google Calendar event, and that event includes the meeting. Add to Google Calendar opens the event. Each email opens in your mail app with the calendar link.
      </p>
      <form className="fields invite-form" onSubmit={(event) => void onSubmit(event)}>
        <label>
          Meeting title
          <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={180} />
        </label>
        <MeetingTimePicker value={when} onChange={setWhen} people={[]} />
        <fieldset className="invite-guests">
          <legend>Senior Researchers</legend>
          {guests.map((guest, index) => (
            <div className="invite-guest" key={index}>
              <div className="fields two">
                <label>
                  Name
                  <input
                    value={guest.name}
                    onChange={(event) => updateGuest(index, { name: event.target.value })}
                    autoComplete="name"
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={guest.email}
                    onChange={(event) => updateGuest(index, { email: event.target.value })}
                    autoComplete="off"
                  />
                </label>
              </div>
              {guests.length > 1 ? (
                <button
                  className="btn btn-ghost btn-compact"
                  type="button"
                  onClick={() => setGuests((current) => current.filter((_, item) => item !== index))}
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          {guests.length < MAX_GUESTS ? (
            <button className="btn btn-ghost btn-compact" type="button" onClick={() => setGuests((current) => [...current, blankGuest()])}>
              Add another Senior Researcher
            </button>
          ) : (
            <p className="quiet">Eight Senior Researchers can share one onboarding meeting.</p>
          )}
        </fieldset>
        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="notice">{message}</p> : null}
        <div className="actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Adding to Google Calendar…" : "Add to Google Calendar"}
          </button>
          {calendarHref ? (
            <a className="btn btn-ghost" href={calendarHref} target="_blank" rel="noreferrer">
              Open Google Calendar
            </a>
          ) : null}
        </div>
      </form>
      {drafts.length > 0 ? (
        <ul className="invite-emails">
          {drafts.map((draft) => (
            <li key={draft.to[0]?.email}>
              <p>
                <strong>{draft.to[0]?.name}</strong> {draft.to[0]?.email}
              </p>
              <button className="btn btn-ghost btn-compact" type="button" onClick={() => void openLocalEmail(draft, { client: true })}>
                Open email
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
