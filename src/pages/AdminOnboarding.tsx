import { FormEvent, useEffect, useState } from "react";
import { MeetingTimePicker, type TimeChoice } from "../components/MeetingTimePicker";
import { useAuth } from "../lib/auth";
import { deleteGoogleCalendarEvent, nextSaturdayAtFourWat, saveGoogleCalendarEvent } from "../lib/calendar";
import { named, openLocalEmail, researcherOnboardingEmail, seniorOnboardingEmail, type EmailDraft } from "../lib/email";
import { userFacingError } from "../lib/errors";
import {
  deleteOnboardingMeeting,
  listOnboardingMeetings,
  saveOnboardingMeeting,
  type OnboardingAudience,
  type OnboardingGuest,
  type OnboardingMeeting,
  type ResearcherRoute,
} from "../lib/onboarding";
import { PROGRAMME_ZONE, formatZonedSpan, zonedDateAndTime, zonedWallTime } from "../lib/timezones";

const INVITE_COPY: Record<
  OnboardingAudience,
  { person: string; people: string; title: string; details: string }
> = {
  researcher: {
    person: "Researcher",
    people: "Researchers",
    title: "Researcher onboarding",
    details: "TRI AI Research Mentorship Programme. Researcher onboarding. This calendar event includes the meeting.",
  },
  senior_researcher: {
    person: "Senior Researcher",
    people: "Senior Researchers",
    title: "Senior Researcher onboarding",
    details: "TRI AI Research Mentorship Programme. Senior Researcher onboarding. This calendar event includes the meeting.",
  },
};

export function InviteResearchers() {
  return <InviteOnboarding audience="researcher" />;
}

export function InviteSeniorResearchers() {
  return <InviteOnboarding audience="senior_researcher" />;
}

function blankGuest(): OnboardingGuest {
  return { name: "", email: "" };
}

function routeLabel(route: ResearcherRoute | undefined) {
  if (route === "award") return "TRI AI Saturdays Research Award";
  if (route === "proposal") return "Direct Proposal";
  return "";
}

function routeSummary(guests: OnboardingGuest[]) {
  const proposal = guests.filter((guest) => guest.route === "proposal").length;
  const award = guests.filter((guest) => guest.route === "award").length;
  const parts = [
    proposal === 1 ? "1 Direct Proposal" : proposal > 1 ? `${proposal} Direct Proposals` : "",
    award === 1 ? "1 TRI AI Saturdays Research Award" : award > 1 ? `${award} TRI AI Saturdays Research Award` : "",
  ].filter(Boolean);
  return parts.join(", ");
}

function openingChoice(): TimeChoice {
  const opening = nextSaturdayAtFourWat();
  return { date: opening.date, start: opening.start, end: opening.end, zone: PROGRAMME_ZONE };
}

function choiceFromMeeting(meeting: OnboardingMeeting): TimeChoice {
  const zone = meeting.timeZone || PROGRAMME_ZONE;
  const start = zonedDateAndTime(meeting.startsAt, zone);
  const end = zonedDateAndTime(meeting.endsAt, zone);
  return { date: start.date, start: start.time, end: end.time, zone };
}

function withAdmin(emails: string[], adminEmail: string) {
  const next = emails.filter(Boolean);
  const admin = adminEmail.trim();
  if (admin && !next.some((email) => email.toLowerCase() === admin.toLowerCase())) next.push(admin);
  return next;
}

function InviteOnboarding({ audience }: { audience: OnboardingAudience }) {
  const copy = INVITE_COPY[audience];
  const { user, profile } = useAuth();
  const [title, setTitle] = useState(copy.title);
  const [when, setWhen] = useState<TimeChoice>(openingChoice);
  const [guests, setGuests] = useState<OnboardingGuest[]>([blankGuest()]);
  const [meetings, setMeetings] = useState<OnboardingMeeting[]>([]);
  const [editingId, setEditingId] = useState("");
  const [confirmingId, setConfirmingId] = useState("");
  const [drafts, setDrafts] = useState<{ draft: EmailDraft; routeLabel: string }[]>([]);
  const [calendarHref, setCalendarHref] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listOnboardingMeetings(audience)
      .then(setMeetings)
      .catch((err: unknown) => setError(userFacingError(err, "Could not load onboarding meetings.")));
  }, [audience]);

  function updateGuest(index: number, patch: Partial<OnboardingGuest>) {
    setGuests((current) => current.map((guest, item) => (item === index ? { ...guest, ...patch } : guest)));
  }

  function beginNew() {
    setEditingId("");
    setConfirmingId("");
    setTitle(copy.title);
    setWhen(openingChoice());
    setGuests([blankGuest()]);
    setDrafts([]);
    setCalendarHref("");
    setMessage("");
    setError("");
  }

  function beginEdit(meeting: OnboardingMeeting) {
    setEditingId(meeting.id);
    setConfirmingId("");
    setTitle(meeting.title);
    setWhen(choiceFromMeeting(meeting));
    setGuests(meeting.guests.length > 0 ? meeting.guests : [blankGuest()]);
    setDrafts([]);
    setCalendarHref(meeting.meetingLink);
    setMessage("");
    setError("");
  }

  async function removeMeeting(meeting: OnboardingMeeting) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      let calendarNote = "";
      if (meeting.calendarEventId) {
        const removed = await deleteGoogleCalendarEvent(meeting.calendarEventId);
        if (!removed) {
          setConfirmingId("");
          setError("Sign in with Google to delete this meeting from Google Calendar.");
          return;
        }
        calendarNote =
          removed === "removed"
            ? " Guests are notified by Google Calendar."
            : " It was not on this Google Calendar. Cancel it there if it is still listed.";
      }
      await deleteOnboardingMeeting(meeting.id);
      setMeetings((current) => current.filter((item) => item.id !== meeting.id));
      if (editingId === meeting.id) beginNew();
      setConfirmingId("");
      setDrafts([]);
      setMessage(`The meeting is deleted.${calendarNote}`);
    } catch (err) {
      setError(userFacingError(err, "Could not delete the onboarding meeting."));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setError("");
    setMessage("");
    const people = guests
      .map((guest) => ({
        name: guest.name.trim(),
        email: guest.email.trim(),
        ...(guest.route ? { route: guest.route } : {}),
      }))
      .filter((guest) => guest.name || guest.email);
    if (people.length === 0) {
      setError(`Add at least one ${copy.person}.`);
      return;
    }
    if (people.some((guest) => !guest.name || !guest.email.includes("@"))) {
      setError(`Each ${copy.person} needs a name and an email address.`);
      return;
    }
    if (audience === "researcher" && people.some((guest) => guest.route !== "proposal" && guest.route !== "award")) {
      setError("Choose Direct Proposal or TRI AI Saturdays Research Award for each Researcher.");
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
    const existing = meetings.find((meeting) => meeting.id === editingId);
    const calendarWindow = window.open("", "_blank");
    let calendarOpened = false;
    setBusy(true);
    try {
      const meetingTitle = title.trim() || copy.title;
      const created = await saveGoogleCalendarEvent({
        eventId: existing?.calendarEventId,
        title: meetingTitle,
        starts: startsAt,
        ends: endsAt,
        details: copy.details,
        emails: withAdmin(
          people.map((guest) => guest.email),
          adminEmail,
        ),
        timeZone: when.zone,
        meet: true,
      });
      if (!created) {
        calendarWindow?.close();
        setError(`Sign in with Google to add these ${copy.people} to Google Calendar. The email uses that calendar link.`);
        return;
      }
      if (calendarWindow && !calendarWindow.closed) {
        calendarWindow.location.href = created.link;
        calendarOpened = true;
      } else calendarWindow?.close();
      setCalendarHref(created.link);
      const id = await saveOnboardingMeeting({
        id: existing?.id,
        audience,
        title: meetingTitle,
        startsAt,
        endsAt,
        meetingLink: created.link,
        calendarEventId: created.eventId,
        timeZone: when.zone,
        guests: people,
        uid: user.uid,
      });
      const saved: OnboardingMeeting = {
        id,
        audience,
        title: meetingTitle,
        startsAt,
        endsAt,
        meetingLink: created.link,
        calendarEventId: created.eventId,
        timeZone: when.zone,
        guests: people,
      };
      setMeetings((current) =>
        [...current.filter((meeting) => meeting.id !== id), saved].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
      );
      setEditingId(id);
      const span = formatZonedSpan(startsAt, endsAt, when.zone);
      setDrafts(
        people.map((guest) => ({
          routeLabel: routeLabel(guest.route),
          draft:
            audience === "researcher"
              ? researcherOnboardingEmail({
                  researcher: named(guest.name, guest.email),
                  route: guest.route === "award" ? "award" : "proposal",
                  title: meetingTitle,
                  when: span,
                  calendarLink: created.link,
                })
              : seniorOnboardingEmail({
                  senior: named(guest.name, guest.email),
                  title: meetingTitle,
                  when: span,
                  calendarLink: created.link,
                }),
        })),
      );
      setMessage(
        existing
          ? "The meeting is saved and Google Calendar is open. Open each email in your email app."
          : people.length === 1
            ? "Google Calendar is open, with you on the event. Open the email in your email app."
            : `Google Calendar is open, with you on the event. Open each of the ${people.length} emails in your email app.`,
      );
    } catch (err) {
      if (!calendarOpened) calendarWindow?.close();
      setError(userFacingError(err, "Could not save the onboarding meeting."));
    } finally {
      setBusy(false);
    }
  }

  const editing = Boolean(editingId);

  return (
    <div className="invite-panel">
      <p className="quiet">
        Add one or more {copy.people}. You are added to the same Google Calendar event, and that event includes the meeting. Saved meetings stay here, so you can change the time, add another {copy.person}, or delete the meeting. Add to Google Calendar opens the event. Each email opens in your email app with the calendar link.
        {audience === "researcher"
          ? " Choose Direct Proposal or TRI AI Saturdays Research Award for each Researcher. That sets their email."
          : ""}
      </p>
      <div>
        <h3>Saved meetings</h3>
        {meetings.length === 0 ? (
          <p className="quiet">No onboarding meetings yet.</p>
        ) : (
          <ul className="invite-saved">
            {meetings.map((meeting) => (
              <li key={meeting.id} className={meeting.id === editingId ? "is-current" : undefined}>
                <p>
                  <strong>{meeting.title}</strong>
                  <br />
                  <span className="quiet">{formatZonedSpan(meeting.startsAt, meeting.endsAt, meeting.timeZone || PROGRAMME_ZONE)}</span>
                  <br />
                  <span className="quiet">
                    {meeting.guests.length === 1 ? `1 ${copy.person}` : `${meeting.guests.length} ${copy.people}`}
                    {audience === "researcher" && routeSummary(meeting.guests) ? `. ${routeSummary(meeting.guests)}` : ""}
                  </span>
                </p>
                <div className="actions">
                  <button className="btn btn-ghost btn-compact" type="button" disabled={busy} onClick={() => beginEdit(meeting)}>
                    Edit
                  </button>
                  {confirmingId === meeting.id ? (
                    <button className="btn btn-danger btn-compact" type="button" disabled={busy} onClick={() => void removeMeeting(meeting)}>
                      {busy ? "Deleting…" : "Confirm delete"}
                    </button>
                  ) : (
                    <button
                      className="btn btn-ghost btn-compact"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setConfirmingId(meeting.id);
                        setError("");
                        setMessage("");
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form className="fields invite-form" onSubmit={(event) => void onSubmit(event)}>
        <div className="invite-form-head">
          <h3>{editing ? "Edit meeting" : "New meeting"}</h3>
          {editing ? (
            <button className="btn btn-ghost btn-compact" type="button" onClick={beginNew}>
              New meeting
            </button>
          ) : null}
        </div>
        <label>
          Meeting title
          <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={180} />
        </label>
        <MeetingTimePicker value={when} onChange={setWhen} people={[]} />
        <fieldset className="invite-guests">
          <legend>{copy.people}</legend>
          {guests.map((guest, index) => (
            <div className="invite-guest" key={`${editingId}-${index}`}>
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
              {audience === "researcher" ? (
                <fieldset className="role-pick">
                  <legend className="sr-only">Route for {guest.name || `Researcher ${index + 1}`}</legend>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={guest.route === "proposal"}
                    className={guest.route === "proposal" ? "is-selected" : ""}
                    onClick={() => updateGuest(index, { route: "proposal" })}
                  >
                    <strong>Direct Proposal</strong>
                    <p className="quiet">Create a profile, then submit a proposal.</p>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={guest.route === "award"}
                    className={guest.route === "award" ? "is-selected" : ""}
                    onClick={() => updateGuest(index, { route: "award" })}
                  >
                    <strong>TRI AI Saturdays Research Award</strong>
                    <p className="quiet">Create a profile.</p>
                  </button>
                </fieldset>
              ) : null}
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
          <button className="btn btn-ghost btn-compact" type="button" onClick={() => setGuests((current) => [...current, blankGuest()])}>
            Add another {copy.person}
          </button>
        </fieldset>
        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="notice">{message}</p> : null}
        <div className="actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy && !confirmingId ? "Saving…" : editing ? "Save changes" : "Add to Google Calendar"}
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
          {drafts.map(({ draft, routeLabel: label }) => (
            <li key={draft.to[0]?.email}>
              <p>
                <strong>{draft.to[0]?.name}</strong> {draft.to[0]?.email}
                {label ? (
                  <>
                    <br />
                    <span className="quiet">{label}</span>
                  </>
                ) : null}
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
