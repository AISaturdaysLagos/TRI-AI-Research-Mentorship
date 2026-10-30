import { FormEvent, Fragment, useState } from "react";
import { MeetingTimePicker, type TimeChoice } from "../components/MeetingTimePicker";
import { useAuth } from "../lib/auth";
import { nextSaturdayAtFourWat } from "../lib/calendar";
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

export function AdminOnboardingPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState("Senior Researcher onboarding");
  const [meetingLink, setMeetingLink] = useState("");
  const [when, setWhen] = useState<TimeChoice>(openingChoice);
  const [guests, setGuests] = useState<OnboardingGuest[]>([blankGuest()]);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
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
    const link = meetingLink.trim();
    if (!link.startsWith("https://")) {
      setError("The meeting link must start with https://.");
      return;
    }
    const startsAt = zonedWallTime(when.date, when.start, when.zone);
    const endsAt = zonedWallTime(when.date, when.end, when.zone);
    if (!(endsAt.getTime() > startsAt.getTime())) {
      setError("The meeting needs an end time after the start.");
      return;
    }
    setBusy(true);
    try {
      await saveOnboardingMeeting({
        title: title.trim() || "Senior Researcher onboarding",
        startsAt,
        endsAt,
        meetingLink: link,
        guests: people,
        uid: user.uid,
      });
      const span = formatZonedSpan(startsAt, endsAt, when.zone);
      const meetingTitle = title.trim() || "Senior Researcher onboarding";
      setDrafts(
        people.map((guest) =>
          seniorOnboardingEmail({
            senior: named(guest.name, guest.email),
            title: meetingTitle,
            when: span,
            meetingLink: link,
          }),
        ),
      );
      setMessage(
        people.length === 1
          ? "The meeting is saved. Open the email, then send it."
          : `The meeting is saved. Open each of the ${people.length} emails, then send them.`,
      );
    } catch (err) {
      setError(userFacingError(err, "Could not save the onboarding meeting."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2>Invite Senior Researchers</h2>
      <p className="quiet">
        Add one or more people. Each receives their own email. They share one meeting and one meeting link.
      </p>
      <form className="fields" onSubmit={(event) => void onSubmit(event)}>
        <label>
          Meeting title
          <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={180} />
        </label>
        <label>
          Meeting link
          <input
            type="url"
            inputMode="url"
            placeholder="https://"
            value={meetingLink}
            onChange={(event) => setMeetingLink(event.target.value)}
            required
          />
        </label>
        <MeetingTimePicker value={when} onChange={setWhen} people={[]} />
        <fieldset>
          <legend>Senior Researchers</legend>
          {guests.map((guest, index) => (
            <Fragment key={index}>
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
            </Fragment>
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
            {busy ? "Saving…" : "Save meeting and prepare emails"}
          </button>
        </div>
      </form>
      {drafts.length > 0 ? (
        <ul>
          {drafts.map((draft) => (
            <li key={draft.to[0]?.email}>
              <p>
                <strong>{draft.to[0]?.name}</strong> {draft.to[0]?.email}
              </p>
              <button className="btn btn-ghost btn-compact" type="button" onClick={() => void openLocalEmail(draft)}>
                Open email
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
