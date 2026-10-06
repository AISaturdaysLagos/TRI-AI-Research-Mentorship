import { FormEvent, useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { EmailSupport } from "../components/EmailSupport";
import { Loader } from "../components/Loader";
import { MeetingClocks, MeetingTimePicker, TimezoneField, type TimeChoice } from "../components/MeetingTimePicker";
import { meetingEmail, named, type EmailDraft } from "../lib/email";
import { Mark } from "../components/Icon";
import { MeetingSchedule } from "../components/MeetingSchedule";
import { useAuth } from "../lib/auth";
import { calendarTemplateLink, createGoogleCalendarEvent, nextSaturdayAtFourWat, watDateAndTime } from "../lib/calendar";
import { PROGRAMME_ZONE, formatNoteClocks, loadTimezones, saveTimezone, zonedWallTime } from "../lib/timezones";
import { firestore } from "../lib/firebase";
import {
  cancelMeeting,
  formatMeetingWhen,
  listMeetingReplies,
  meetingAttendees,
  meetingDate,
  meetingIsArchived,
  meetingReplyPhrase,
  ensureScopingSlots,
  listMeetings,
  saveMeeting,
  scopingMeetingTaken,
  scopingNeedsMatch,
  updateMeeting,
  type MeetingKind,
  type MeetingPerson,
  type MeetingReply,
  type MeetingRow,
} from "../lib/meetings";
import { listMatches, listProjects, listProposals } from "../lib/records";

type DirectoryPerson = MeetingPerson & { role?: string };

type ProposalOption = {
  id: string;
  title?: string;
  introduction?: string;
  status?: string;
  ownerId?: string;
  researcherIds?: string[];
  name?: string;
};

type MatchOption = {
  proposalId?: string;
  mentorId?: string;
  mentorName?: string;
  introduced?: boolean;
  response?: string;
};

type ProjectOption = {
  id: string;
  title?: string;
  status?: string;
  proposalId?: string;
  researchers?: { uid?: string; name?: string }[];
  seniorResearchers?: { uid?: string; name?: string }[];
};

function personFrom(directory: DirectoryPerson[], uid: string, fallbackName: string): MeetingPerson | null {
  if (!uid) return null;
  const found = directory.find((item) => item.uid === uid);
  const name = found?.name || fallbackName;
  if (!name) return null;
  return { uid, name, email: found?.email || "" };
}

function AdminMeetingCard({
  meeting,
  replies,
  busy,
  zones,
  onChanged,
}: {
  meeting: MeetingRow;
  replies: MeetingReply[];
  busy: boolean;
  zones: Record<string, string>;
  onChanged: (message: string) => Promise<void>;
}) {
  const start = meetingDate(meeting.startsAt);
  const opening = start ? watDateAndTime(start) : { date: nextSaturdayAtFourWat().date, time: "16:00" };
  const ending = meetingDate(meeting.endsAt);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editWhen, setEditWhen] = useState<TimeChoice>({
    date: opening.date,
    start: opening.time,
    end: ending ? watDateAndTime(ending).time : "17:00",
    zone: PROGRAMME_ZONE,
  });
  const [note, setNote] = useState(meeting.note || "");
  const [error, setError] = useState("");
  const attendees = meetingAttendees(meeting).map((person) => ({
    name: person.name,
    zone: zones[person.uid] || PROGRAMME_ZONE,
  }));

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const starts = zonedWallTime(editWhen.date, editWhen.start, editWhen.zone);
    const ends = zonedWallTime(editWhen.date, editWhen.end, editWhen.zone);
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()) || ends <= starts) {
      setError("Choose a start time that is earlier than the end time.");
      return;
    }
    const emails = meetingAttendees(meeting).map((person) => person.email);
    const calendarLink = calendarTemplateLink({
      title: meeting.title || "Meeting",
      starts,
      ends,
      details: note.trim() || "TRI AI Research Programme meeting.",
      emails,
    });
    try {
      await updateMeeting(meeting.id, { starts, ends, note: note.trim(), calendarLink });
      setEditing(false);
      await onChanged("Meeting updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this meeting.");
    }
  }

  async function cancel() {
    setError("");
    try {
      await cancelMeeting(meeting.id);
      setConfirming(false);
      await onChanged("Meeting cancelled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel this meeting.");
    }
  }

  return (
    <article className="opportunity">
      <p className="mono">
        {meeting.status === "cancelled" ? "Cancelled" : meeting.kind === "scoping" ? "New scoping meeting" : "Active project meeting"}
      </p>
      <h3>{meeting.title}</h3>
      <p>
        {formatMeetingWhen(meeting.startsAt)} – {formatMeetingWhen(meeting.endsAt)}
      </p>
      <MeetingClocks start={meetingDate(meeting.startsAt)} end={meetingDate(meeting.endsAt)} people={attendees} />
      <p>Researchers: {(meeting.researchers ?? []).map((person) => person.name).join(", ") || "—"}</p>
      <p>Senior Researchers: {(meeting.seniorResearchers ?? []).map((person) => person.name).join(", ") || "—"}</p>
      {(meeting.admins ?? []).length > 0 ? (
        <p>TRI AI: {(meeting.admins ?? []).map((person) => person.name).join(", ")}</p>
      ) : null}
      {meeting.note ? <p className="quiet">{formatNoteClocks(meeting.note)}</p> : null}
      {meeting.calendarLink ? (
        <p>
          <a className="btn btn-ghost btn-compact" href={meeting.calendarLink} target="_blank" rel="noreferrer">
            Open in Google Calendar
          </a>
        </p>
      ) : null}
      <p className="quiet">
        Responses:{" "}
        {replies.length === 0
          ? "No one has replied yet."
          : replies
              .map((reply) => {
                const person = meetingAttendees(meeting).find(
                  (item) => item.uid === reply.id,
                );
                return `${person?.name || "Someone"} ${meetingReplyPhrase(reply.response)}${reply.note ? ` (${formatNoteClocks(reply.note)})` : ""}`;
              })
              .join("; ")}
      </p>
      {meeting.status !== "cancelled" ? (
        <div className="actions">
          <button className="btn btn-ghost btn-compact" type="button" disabled={busy} onClick={() => setEditing((value) => !value)}>
            {editing ? "Close editor" : "Edit"}
          </button>
          {confirming ? (
            <button className="btn btn-primary btn-compact" type="button" disabled={busy} onClick={() => void cancel()}>
              Confirm cancel
            </button>
          ) : (
            <button className="btn btn-ghost btn-compact" type="button" disabled={busy} onClick={() => setConfirming(true)}>
              Cancel meeting
            </button>
          )}
        </div>
      ) : null}
      {editing && meeting.status !== "cancelled" ? (
        <form className="fields" onSubmit={(event) => void saveEdit(event)}>
          <MeetingTimePicker value={editWhen} onChange={setEditWhen} people={attendees} preserveInstantOnZone />
          <label>
            Note
            <textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <div className="button-row">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              Save changes
            </button>
          </div>
        </form>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </article>
  );
}

export function AdminMeetingsPage() {
  const { user, profile } = useAuth();
  const [kind, setKind] = useState<MeetingKind>("scoping");
  const [recordId, setRecordId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const opening = nextSaturdayAtFourWat();
  const [when, setWhen] = useState<TimeChoice>({
    date: opening.date,
    start: opening.start,
    end: opening.end,
    zone: PROGRAMME_ZONE,
  });
  const [zones, setZones] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [proposals, setProposals] = useState<ProposalOption[]>([]);
  const [matches, setMatches] = useState<MatchOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [directory, setDirectory] = useState<DirectoryPerson[]>([]);
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [replies, setReplies] = useState<Record<string, MeetingReply[]>>({});
  const [message, setMessage] = useState("");
  const [mail, setMail] = useState<EmailDraft | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [creating, setCreating] = useState(false);

  async function reload() {
    const db = firestore();
    const [proposalRows, matchRows, projectRows, meetingRows, directoryDocs] = await Promise.all([
      listProposals(),
      listMatches(),
      listProjects(),
      listMeetings(),
      db ? getDocs(collection(db, "users")) : Promise.resolve(null),
    ]);
    setProposals(proposalRows as ProposalOption[]);
    setMatches(matchRows as MatchOption[]);
    setProjects(projectRows as ProjectOption[]);
    setMeetings(meetingRows);
    const participantIds = meetingRows.flatMap((meeting) => meetingAttendees(meeting).map((person) => person.uid));
    if (user) setZones(await loadTimezones([user.uid, ...participantIds]));
    setDirectory(
      directoryDocs
        ? directoryDocs.docs.map((item) => ({
            uid: item.id,
            name: String(item.data().displayName ?? ""),
            email: String(item.data().email ?? ""),
            role: String(item.data().role ?? ""),
          }))
        : [],
    );
    const replyEntries = await Promise.all(
      meetingRows.map(async (meeting) => [meeting.id, await listMeetingReplies(meeting.id)] as const),
    );
    setReplies(Object.fromEntries(replyEntries));
    if (user) await ensureScopingSlots(meetingRows, user.uid);
    setLoaded(true);
  }

  useEffect(() => {
    if (profile?.role !== "admin" || !user) return;
    void reload().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not load meetings.");
      setLoaded(true);
    });
  }, [profile?.role, user]);

  const matchedProposalIds = new Set(
    matches.filter((item) => item.introduced && item.mentorId && item.proposalId).map((item) => item.proposalId),
  );
  const scopingProposals = proposals.filter((item) => matchedProposalIds.has(item.id));
  const activeProjects = projects.filter((item) => item.status === "active");
  const options = kind === "scoping" ? scopingProposals : activeProjects;

  const candidates = useMemo(() => {
    if (!recordId) return [];
    if (kind === "scoping") {
      const proposal = proposals.find((item) => item.id === recordId);
      if (!proposal) return [];
      const researcherIds = proposal.researcherIds?.length ? proposal.researcherIds : proposal.ownerId ? [proposal.ownerId] : [];
      const researchers = researcherIds
        .map((uid, index) => personFrom(directory, uid, index === 0 ? proposal.name || "Researcher" : "Researcher"))
        .filter((item): item is MeetingPerson => Boolean(item));
      const seniors = matches
        .filter((item) => item.proposalId === proposal.id && item.introduced && item.mentorId)
        .map((item) => personFrom(directory, item.mentorId || "", item.mentorName || "Senior Researcher"))
        .filter((item): item is MeetingPerson => Boolean(item));
      const uniqueSeniors = [...new Map(seniors.map((item) => [item.uid, item])).values()];
      return [...researchers, ...uniqueSeniors];
    }
    const project = projects.find((item) => item.id === recordId);
    if (!project) return [];
    const researchers = (project.researchers ?? [])
      .map((item) => personFrom(directory, item.uid || "", item.name || "Researcher"))
      .filter((item): item is MeetingPerson => Boolean(item));
    const seniors = (project.seniorResearchers ?? [])
      .map((item) => personFrom(directory, item.uid || "", item.name || "Senior Researcher"))
      .filter((item): item is MeetingPerson => Boolean(item));
    return [...researchers, ...seniors];
  }, [directory, kind, matches, projects, proposals, recordId]);

  useEffect(() => {
    setSelected(candidates.map((person) => person.uid));
  }, [candidates]);

  useEffect(() => {
    const ids = candidates.map((person) => person.uid);
    if (ids.length === 0) return;
    void loadTimezones(ids).then((next) => setZones((current) => ({ ...current, ...next }))).catch(() => undefined);
  }, [candidates]);

  function titleFor(id: string) {
    if (kind === "scoping") return proposals.find((item) => item.id === id)?.title || "Scoping meeting";
    return projects.find((item) => item.id === id)?.title || "Project meeting";
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setError("");
    setMessage("");
    const startDate = zonedWallTime(when.date, when.start, when.zone);
    const endDate = zonedWallTime(when.date, when.end, when.zone);
    if (!recordId || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      setError("Choose the record and a start time that is earlier than the end time.");
      return;
    }
    const researchers = candidates.filter(
      (person) => selected.includes(person.uid) && directory.find((item) => item.uid === person.uid)?.role !== "senior_researcher",
    );
    const seniorResearchers = candidates.filter(
      (person) => selected.includes(person.uid) && directory.find((item) => item.uid === person.uid)?.role === "senior_researcher",
    );
    const programmeAdmins =
      kind === "scoping"
        ? directory
            .filter((person) => person.role === "admin" && person.uid && person.name)
            .filter(
              (person) =>
                !researchers.some((item) => item.uid === person.uid) &&
                !seniorResearchers.some((item) => item.uid === person.uid),
            )
            .map((person) => ({ uid: person.uid, name: person.name || "TRI AI Admin", email: person.email }))
        : [];
    if (kind === "scoping" && !matchedProposalIds.has(recordId)) {
      setError(scopingNeedsMatch);
      return;
    }
    if (researchers.length === 0 || seniorResearchers.length === 0) {
      setError("Choose at least one Researcher and one Senior Researcher.");
      return;
    }
    if (kind === "scoping" && programmeAdmins.length === 0) {
      setError("Add a TRI AI admin.");
      return;
    }
    if (
      kind === "scoping" &&
      meetings.some((meeting) => meeting.kind === "scoping" && meeting.proposalId === recordId && meeting.status !== "cancelled")
    ) {
      setError(scopingMeetingTaken);
      return;
    }
    const subject = kind === "scoping" ? `Scoping meeting: ${titleFor(recordId)}` : `Project meeting: ${titleFor(recordId)}`;
    const details = note.trim() || "TRI AI Research Programme meeting.";
    const guests = [...researchers, ...seniorResearchers, ...programmeAdmins];
    const emails = guests.map((person) => person.email);
    const template = calendarTemplateLink({
      title: subject,
      starts: startDate,
      ends: endDate,
      details,
      emails,
    });
    setBusy(true);
    let calendarLink = template;
    let calendarEventId = "";
    let opened = false;
    try {
      const created = await createGoogleCalendarEvent({
        title: subject,
        starts: startDate,
        ends: endDate,
        details,
        emails,
      });
      if (created) {
        calendarLink = created.link;
        calendarEventId = created.eventId;
      } else {
        opened = window.open(template, "_blank", "noopener,noreferrer") !== null;
      }
      await saveMeeting({
        kind,
        title: subject,
        proposalId: kind === "scoping" ? recordId : "",
        projectId:
          kind === "project"
            ? recordId
            : projects.find((item) => item.proposalId === recordId && item.status === "scoping")?.id || "",
        starts: startDate,
        ends: endDate,
        note: details,
        researchers,
        seniorResearchers,
        admins: programmeAdmins,
        calendarEventId,
        calendarLink,
        createdBy: user.uid,
      });
      setMessage(
        created
          ? "Meeting saved. Invites sent."
          : opened
            ? "Finish the meeting in Google Calendar."
            : "Meeting saved.",
      );
      setMail(
        meetingEmail({
          title: subject,
          when: formatMeetingWhen({ toDate: () => startDate }),
          scoping: kind === "scoping",
          attendees: guests.map((person) => named(person.name, person.email)),
        }),
      );
      setNote("");
      setCreating(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this meeting.");
    } finally {
      setBusy(false);
    }
  }

  const upcoming = meetings.filter((meeting) => !meetingIsArchived(meeting));
  const archived = meetings.filter((meeting) => meetingIsArchived(meeting));

  if (profile?.role !== "admin") {
    return <p>A TRI AI admin sets scoping meetings.</p>;
  }
  if (!loaded) return <Loader label="Loading meetings" />;

  return (
    <div>
      {user ? (
        <div className="zone-self">
          <TimezoneField
            label="Your time zone"
            value={zones[user.uid] || PROGRAMME_ZONE}
            onChange={(zone) => {
              setZones((current) => ({ ...current, [user.uid]: zone }));
              void saveTimezone(user.uid, zone).catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Could not save your time zone.");
              });
            }}
          />
        </div>
      ) : null}
      {creating ? null : (
        <div className="button-row">
          <button className="btn btn-primary" type="button" aria-expanded={false} onClick={() => setCreating(true)}>
            Create Meetings
          </button>
        </div>
      )}
      {creating ? (
      <form className="fields" onSubmit={(event) => void onSubmit(event)}>
        <div className="archive-head">
          <h2><Mark name="meeting">Create Meetings</Mark></h2>
          <button className="btn btn-ghost btn-compact" type="button" aria-expanded onClick={() => setCreating(false)}>
            Close
          </button>
        </div>
        <p className="quiet">Set a scoping meeting, or a meeting on an active project.</p>
        <label>
          Meeting
          <select
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as MeetingKind);
              setRecordId("");
            }}
          >
            <option value="scoping">New scoping meeting</option>
            <option value="project">Active project meeting</option>
          </select>
        </label>
        <label>
          {kind === "scoping" ? "Proposal" : "Active project"}
          <select value={recordId} onChange={(event) => setRecordId(event.target.value)}>
            <option value="">Select</option>
            {options.map((item) => {
              const taken =
                kind === "scoping" &&
                meetings.some((meeting) => meeting.kind === "scoping" && meeting.proposalId === item.id && meeting.status !== "cancelled");
              return (
              <option key={item.id} value={item.id} disabled={taken}>
                {item.title || "Untitled"}
                {taken ? " — scoping meeting already set" : ""}
              </option>
              );
            })}
          </select>
        </label>
        {kind === "scoping" && scopingProposals.length === 0 ? (
          <p className="quiet">Introduce a Senior Researcher first.</p>
        ) : null}
        {recordId && (candidates.filter((person) => directory.find((item) => item.uid === person.uid)?.role === "senior_researcher").length === 0 || candidates.filter((person) => directory.find((item) => item.uid === person.uid)?.role !== "senior_researcher").length === 0) ? (
          <p className="quiet">Add a Researcher and a Senior Researcher.</p>
        ) : null}
        {candidates.length > 0 ? (
          <fieldset className="fields">
            <legend>Invite</legend>
            {candidates.map((person) => (
              <label className="check" key={person.uid}>
                <input
                  type="checkbox"
                  checked={selected.includes(person.uid)}
                  onChange={(event) => {
                    setSelected((current) =>
                      event.target.checked ? [...current, person.uid] : current.filter((id) => id !== person.uid),
                    );
                  }}
                />
                <span>
                  {person.name}
                  {person.email ? ` · ${person.email}` : " · no email on the account"}
                </span>
              </label>
            ))}
          </fieldset>
        ) : null}
        {kind === "scoping" ? (
          <p className="quiet">
            {directory.some((person) => person.role === "admin")
              ? `TRI AI is invited: ${directory
                  .filter((person) => person.role === "admin")
                  .map((person) => person.name || "TRI AI Admin")
                  .join(", ")}`
              : "Add a TRI AI admin before saving."}
          </p>
        ) : null}
        <MeetingTimePicker
          value={when}
          onChange={setWhen}
          resetOnDate
          people={[
            ...candidates
              .filter((person) => selected.includes(person.uid))
              .map((person) => ({ name: person.name, zone: zones[person.uid] || PROGRAMME_ZONE })),
            ...(kind === "scoping"
              ? directory
                  .filter((person) => person.role === "admin")
                  .map((person) => ({ name: person.name || "TRI AI Admin", zone: zones[person.uid] || PROGRAMME_ZONE }))
              : []),
          ]}
        />
        <label>
          Note
          <textarea value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <div className="button-row">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save and add to Google Calendar"}
          </button>
        </div>
      </form>
      ) : null}
      {message ? <p className="notice">{message}</p> : null}
      <EmailSupport draft={mail} />
      <h2 style={{ marginTop: 28 }}><Mark name="meeting">Upcoming</Mark></h2>
      <MeetingSchedule
        meetings={upcoming}
        renderMeeting={(meeting) => (
          <AdminMeetingCard
            meeting={meeting}
            replies={replies[meeting.id] ?? []}
            busy={busy}
            zones={zones}
            onChanged={async (message) => {
              setMessage(message);
              await reload();
            }}
          />
        )}
        list={
          upcoming.length === 0 ? (
            <div className="empty">No upcoming meetings.</div>
          ) : (
            upcoming.map((meeting) => (
              <AdminMeetingCard
                key={meeting.id}
                meeting={meeting}
                replies={replies[meeting.id] ?? []}
                busy={busy}
            zones={zones}
                onChanged={async (message) => {
                  setMessage(message);
                  await reload();
                }}
              />
            ))
          )
        }
      />
      <div className="archive-head">
        <h2><Mark name="archive">Archive</Mark></h2>
        <button
          className="btn btn-ghost btn-compact"
          type="button"
          aria-expanded={showArchive}
          onClick={() => setShowArchive((value) => !value)}
        >
          {showArchive ? "Hide archive" : `Show archive${archived.length > 0 ? ` (${archived.length})` : ""}`}
        </button>
      </div>
      {showArchive ? (
        <>
          {archived.length === 0 ? <div className="empty">Past and cancelled meetings appear here.</div> : null}
          {archived.map((meeting) => (
            <AdminMeetingCard
              key={meeting.id}
              meeting={meeting}
              replies={replies[meeting.id] ?? []}
              busy={busy}
            zones={zones}
              onChanged={async (nextMessage) => {
                setMessage(nextMessage);
                await reload();
              }}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}
