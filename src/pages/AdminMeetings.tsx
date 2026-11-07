import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmailSupport } from "../components/EmailSupport";
import { Loader } from "../components/Loader";
import { MeetingClocks, MeetingTimePicker, TimezoneField, type TimeChoice } from "../components/MeetingTimePicker";
import { meetingEmail, named, type EmailDraft } from "../lib/email";
import { Mark } from "../components/Icon";
import { MeetingSchedule } from "../components/MeetingSchedule";
import { useAuth } from "../lib/auth";
import { calendarTemplateLink, createGoogleCalendarEvent, nextSaturdayAtFourWat, watDateAndTime } from "../lib/calendar";
import { PROGRAMME_ZONE, formatNoteClocks, loadTimezones, saveTimezone, zonedWallTime } from "../lib/timezones";
import {
  cancelMeeting,
  formatMeetingWhen,
  listMeetingReplies,
  meetingAttendees,
  meetingDate,
  meetingIsArchived,
  meetingReplyPhrase,
  ensureScopingSlots,
  introductionMeetingTaken,
  listMeetings,
  meetingIncludesAdmins,
  meetingKindLabel,
  saveMeeting,
  scopingMeetingTaken,
  scopingNeedsMatch,
  updateMeeting,
  type MeetingGuest,
  type MeetingKind,
  type MeetingPerson,
  type MeetingReply,
  type MeetingRow,
} from "../lib/meetings";
import { listDirectory, listMatches, listProjectInvites, listProjects, listProposals } from "../lib/records";
import { peekRead, reads } from "../lib/readCache";
import { userFacingError } from "../lib/errors";
import { CloseButton } from "../components/CloseButton";
import { SearchSelect } from "../components/SearchSelect";
import { projectTypeLabel } from "../types/domain";

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

type ProjectInvite = {
  projectId?: string;
  role?: string;
  status?: string;
  guestName?: string;
  guestEmail?: string;
};

type MeetingCandidate = MeetingPerson & {
  key: string;
  projectRole?: "researcher" | "senior_researcher";
  pending?: boolean;
};

const GUEST_EMAIL = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

type ProjectOption = {
  id: string;
  title?: string;
  status?: string;
  proposalId?: string;
  awardId?: string;
  researchers?: { uid?: string; name?: string }[];
  seniorResearchers?: { uid?: string; name?: string }[];
};

function meetingNames(accounts?: { name: string }[], guests?: { name: string }[]) {
  const names = [...(accounts ?? []).map((person) => person.name), ...(guests ?? []).map((person) => person.name)].filter(Boolean);
  return names.join(", ") || "—";
}

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
      setError(userFacingError(err, "Could not update this meeting."));
    }
  }

  async function cancel() {
    setError("");
    try {
      await cancelMeeting(meeting.id);
      setConfirming(false);
      await onChanged("Meeting cancelled.");
    } catch (err) {
      setError(userFacingError(err, "Could not cancel this meeting."));
    }
  }

  return (
    <article className="opportunity">
      <p className="mono">
        {meetingKindLabel(meeting)}
      </p>
      <h3>{meeting.title}</h3>
      <p>
        {formatMeetingWhen(meeting.startsAt)} – {formatMeetingWhen(meeting.endsAt)}
      </p>
      <MeetingClocks start={meetingDate(meeting.startsAt)} end={meetingDate(meeting.endsAt)} people={attendees} />
      <p>Researchers: {meetingNames(meeting.researchers, meeting.invitedResearchers)}</p>
      <p>Senior Researchers: {meetingNames(meeting.seniorResearchers, meeting.invitedSeniors)}</p>
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
      {meeting.status !== "cancelled" && !editing ? (
        <div className="actions">
          <button className="btn btn-ghost btn-compact" type="button" disabled={busy} onClick={() => setEditing(true)}>
            Edit
          </button>
          {confirming ? (
            <button className="btn btn-danger btn-compact" type="button" disabled={busy} onClick={() => void cancel()}>
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
        <form className="fields has-dismiss" onSubmit={(event) => void saveEdit(event)}>
          <CloseButton label="Close editor" className="btn-compact" disabled={busy} onClick={() => setEditing(false)} />
          <div className="archive-head">
            <h3>Edit meeting</h3>
          </div>
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

function directoryPeople(rows: { id: string; email: string; displayName: string; role: string }[]) {
  return rows.map((person) => ({
    uid: person.id,
    name: person.displayName,
    email: person.email,
    role: person.role,
  }));
}

function warmAdminMeetings(uid: string) {
  const proposals = peekRead<ProposalOption[]>(reads.proposals);
  const matches = peekRead<MatchOption[]>(reads.matches);
  const projects = peekRead<ProjectOption[]>(reads.projects);
  const meetingRows = peekRead<MeetingRow[]>(reads.meetings);
  const directoryRows = peekRead<{ id: string; email: string; displayName: string; role: string }[]>(reads.directory);
  if (!proposals || !matches || !projects || !meetingRows || !directoryRows) return undefined;
  const replies: Record<string, MeetingReply[]> = {};
  for (const meeting of meetingRows) {
    const rows = peekRead<MeetingReply[]>(reads.meetingReplies(meeting.id));
    if (!rows) return undefined;
    replies[meeting.id] = rows;
  }
  const participantIds = meetingRows.flatMap((meeting) => meetingAttendees(meeting).map((person) => person.uid));
  const zones = peekRead<Record<string, string>>(reads.timezones([uid, ...participantIds]));
  if (!zones) return undefined;
  return {
    proposals,
    matches,
    projects,
    meetings: meetingRows,
    directory: directoryPeople(directoryRows),
    replies,
    zones,
  };
}

export function AdminMeetingsPage() {
  const { user, profile } = useAuth();
  const warm = user ? warmAdminMeetings(user.uid) : undefined;
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
  const [zones, setZones] = useState<Record<string, string>>(() => warm?.zones ?? {});
  const [note, setNote] = useState("");
  const [proposals, setProposals] = useState<ProposalOption[]>(() => warm?.proposals ?? []);
  const [matches, setMatches] = useState<MatchOption[]>(() => warm?.matches ?? []);
  const [projects, setProjects] = useState<ProjectOption[]>(() => warm?.projects ?? []);
  const [directory, setDirectory] = useState<DirectoryPerson[]>(() => warm?.directory ?? []);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [meetings, setMeetings] = useState<MeetingRow[]>(() => warm?.meetings ?? []);
  const [replies, setReplies] = useState<Record<string, MeetingReply[]>>(() => warm?.replies ?? {});
  const [message, setMessage] = useState("");
  const [mail, setMail] = useState<EmailDraft | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(() => warm !== undefined);
  const [busy, setBusy] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [creating, setCreating] = useState(false);

  async function reload() {
    const [proposalRows, matchRows, projectRows, meetingRows, directoryRows, inviteRows] = await Promise.all([
      listProposals(),
      listMatches(),
      listProjects(),
      listMeetings(),
      listDirectory(),
      listProjectInvites(),
    ]);
    setProposals(proposalRows as ProposalOption[]);
    setMatches(matchRows as MatchOption[]);
    setProjects(projectRows as ProjectOption[]);
    setMeetings(meetingRows);
    const participantIds = meetingRows.flatMap((meeting) => meetingAttendees(meeting).map((person) => person.uid));
    if (user) setZones(await loadTimezones([user.uid, ...participantIds]));
    setDirectory(directoryPeople(directoryRows));
    setInvites(inviteRows as ProjectInvite[]);
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
      setError(userFacingError(err, "Could not load meetings."));
      setLoaded(true);
    });
  }, [profile?.role, user]);

  const matchedProposalIds = new Set(
    matches.filter((item) => item.introduced && item.mentorId && item.proposalId).map((item) => item.proposalId),
  );
  const activeProjects = projects.filter((item) => item.status === "active");
  const introductionProjects = projects.filter(
    (item) => ["scoping", "active", "internal_review"].includes(item.status || "") && !introductionTaken(item.id),
  );
  const awardScopingProjects = projects.filter(
    (item) => item.status === "scoping" && Boolean(item.awardId) && !scopingTaken(item.id),
  );
  const awardProposalIds = new Set(
    awardScopingProjects.map((item) => item.proposalId).filter((id): id is string => Boolean(id)),
  );
  const scopingProposals = proposals.filter((item) => {
    if (!matchedProposalIds.has(item.id) || awardProposalIds.has(item.id) || scopingTaken(item.id)) return false;
    const project = projects.find((row) => row.proposalId === item.id);
    if (!project) return true;
    return project.status === "scoping" && !scopingTaken(project.id);
  });
  const isAwardScoping =
    kind === "scoping" && projects.some((item) => item.id === recordId && item.status === "scoping" && Boolean(item.awardId));
  const options =
    kind === "scoping" ? [...scopingProposals, ...awardScopingProjects] : kind === "introduction" ? introductionProjects : activeProjects;

  function introductionTaken(id: string) {
    return meetings.some(
      (meeting) => meeting.kind === "introduction" && meeting.status !== "cancelled" && meeting.projectId === id,
    );
  }

  function scopingTaken(id: string) {
    return meetings.some(
      (meeting) =>
        meeting.kind === "scoping" &&
        meeting.status !== "cancelled" &&
        (meeting.proposalId === id || meeting.projectId === id),
    );
  }

  const candidates = useMemo((): MeetingCandidate[] => {
    if (!recordId) return [];
    function peopleOn(project: ProjectOption): MeetingCandidate[] {
      const researchers = (project.researchers ?? [])
        .map((item) => personFrom(directory, item.uid || "", item.name || "Researcher"))
        .filter((item): item is MeetingPerson => Boolean(item))
        .map((person) => ({ ...person, key: person.uid }));
      const seniors = (project.seniorResearchers ?? [])
        .map((item) => personFrom(directory, item.uid || "", item.name || "Senior Researcher"))
        .filter((item): item is MeetingPerson => Boolean(item))
        .map((person) => ({ ...person, key: person.uid }));
      return [...researchers, ...seniors];
    }
    if (kind === "scoping") {
      const awardProject = projects.find(
        (item) => item.id === recordId && item.status === "scoping" && Boolean(item.awardId),
      );
      if (awardProject) return peopleOn(awardProject);
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
      return [...researchers, ...uniqueSeniors].map((person) => ({ ...person, key: person.uid }));
    }
    const project = projects.find((item) => item.id === recordId);
    if (!project) return [];
    if (kind !== "introduction") return peopleOn(project);
    const people = new Map<string, MeetingCandidate>();
    function addAccount(person: MeetingPerson, role: "researcher" | "senior_researcher") {
      if (people.has(person.uid)) return;
      people.set(person.uid, { ...person, key: person.uid, projectRole: role });
    }
    for (const item of project.researchers ?? []) {
      const person = personFrom(directory, item.uid || "", item.name || "Researcher");
      if (person) addAccount(person, "researcher");
    }
    for (const item of project.seniorResearchers ?? []) {
      const person = personFrom(directory, item.uid || "", item.name || "Senior Researcher");
      if (person) addAccount(person, "senior_researcher");
    }
    for (const invite of invites) {
      if (invite.projectId !== project.id || invite.status !== "open") continue;
      if (invite.role !== "researcher" && invite.role !== "senior_researcher") continue;
      const email = String(invite.guestEmail || "").trim().toLowerCase();
      const name = String(invite.guestName || "").trim().replace(/\s+/g, " ");
      if (!name || !GUEST_EMAIL.test(email)) continue;
      const account = directory.find((item) => item.email.toLowerCase() === email && item.role !== "admin");
      if (account) {
        addAccount(
          { uid: account.uid, name: account.name || name, email: account.email || email },
          invite.role,
        );
        continue;
      }
      const key = `guest:${email}`;
      if (people.has(key)) continue;
      people.set(key, { uid: "", name, email, key, projectRole: invite.role, pending: true });
    }
    return [...people.values()];
  }, [directory, invites, kind, matches, projects, proposals, recordId]);

  useEffect(() => {
    setSelected(candidates.map((person) => person.key));
  }, [candidates]);

  useEffect(() => {
    const ids = candidates.map((person) => person.uid);
    if (ids.length === 0) return;
    void loadTimezones(ids).then((next) => setZones((current) => ({ ...current, ...next }))).catch(() => undefined);
  }, [candidates]);

  function titleFor(id: string) {
    if (kind === "scoping") {
      return (
        awardScopingProjects.find((item) => item.id === id)?.title ||
        proposals.find((item) => item.id === id)?.title ||
        "Scoping meeting"
      );
    }
    return projects.find((item) => item.id === id)?.title || (kind === "introduction" ? "Introductory meeting" : "Project meeting");
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
    let researchers = candidates.filter(
      (person) => selected.includes(person.key) && directory.find((item) => item.uid === person.uid)?.role !== "senior_researcher",
    );
    let seniorResearchers = candidates.filter(
      (person) => selected.includes(person.key) && directory.find((item) => item.uid === person.uid)?.role === "senior_researcher",
    );
    let invitedResearchers: MeetingGuest[] = [];
    let invitedSeniors: MeetingGuest[] = [];
    if (kind === "introduction") {
      const chosen = candidates.filter((person) => selected.includes(person.key));
      researchers = chosen.filter((person) => person.projectRole === "researcher" && person.uid);
      seniorResearchers = chosen.filter((person) => person.projectRole === "senior_researcher" && person.uid);
      invitedResearchers = chosen
        .filter((person) => person.pending && person.projectRole === "researcher")
        .map((person) => ({ name: person.name, email: person.email }));
      invitedSeniors = chosen
        .filter((person) => person.pending && person.projectRole === "senior_researcher")
        .map((person) => ({ name: person.name, email: person.email }));
    }
    const accountResearchers = researchers.map((person) => ({ uid: person.uid, name: person.name, email: person.email }));
    const accountSeniors = seniorResearchers.map((person) => ({ uid: person.uid, name: person.name, email: person.email }));
    const programmeAdmins = meetingIncludesAdmins(kind)
      ? directory
          .filter((person) => person.role === "admin" && person.uid && person.name)
          .filter(
            (person) =>
              !researchers.some((item) => item.uid === person.uid) &&
              !seniorResearchers.some((item) => item.uid === person.uid),
          )
          .map((person) => ({ uid: person.uid, name: person.name || "TRI AI Admin", email: person.email }))
      : [];
    if (kind === "scoping" && !isAwardScoping && !matchedProposalIds.has(recordId)) {
      setError(scopingNeedsMatch);
      return;
    }
    if (accountResearchers.length + invitedResearchers.length === 0 || accountSeniors.length + invitedSeniors.length === 0) {
      setError(
        isAwardScoping
          ? "Invite a Researcher and a Senior Researcher, then wait until both have joined the project."
          : "Choose at least one Researcher and one Senior Researcher.",
      );
      return;
    }
    if (meetingIncludesAdmins(kind) && programmeAdmins.length === 0) {
      setError("Add a TRI AI admin.");
      return;
    }
    if (kind === "scoping" && scopingTaken(recordId)) {
      setError(scopingMeetingTaken);
      return;
    }
    if (kind === "introduction" && introductionTaken(recordId)) {
      setError(introductionMeetingTaken);
      return;
    }
    const subject =
      kind === "scoping"
        ? `Scoping meeting: ${titleFor(recordId)}`
        : kind === "introduction"
          ? `Introductory meeting: ${titleFor(recordId)}`
          : `Project meeting: ${titleFor(recordId)}`;
    const details = note.trim() || "TRI AI Research Programme meeting.";
    const guests = [...accountResearchers, ...accountSeniors, ...invitedResearchers, ...invitedSeniors, ...programmeAdmins];
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
        proposalId: kind === "scoping" && !isAwardScoping ? recordId : "",
        projectId:
          kind === "project" || kind === "introduction" || isAwardScoping
            ? recordId
            : projects.find((item) => item.proposalId === recordId && item.status === "scoping")?.id || "",
        starts: startDate,
        ends: endDate,
        note: details,
        researchers: accountResearchers,
        seniorResearchers: accountSeniors,
        invitedResearchers,
        invitedSeniors,
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
          introductory: kind === "introduction",
          attendees: guests.map((person) => named(person.name, person.email)),
        }),
      );
      setNote("");
      setCreating(false);
      await reload();
    } catch (err) {
      setError(userFacingError(err, "Could not save this meeting."));
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
                setError(userFacingError(err, "Could not save your time zone."));
              });
            }}
          />
        </div>
      ) : null}
      {creating ? null : (
        <div className="button-row">
          <button className="btn btn-primary" type="button" aria-expanded={false} onClick={() => setCreating(true)}>
            Create a meeting
          </button>
        </div>
      )}
      {creating ? (
      <form className="fields has-dismiss" onSubmit={(event) => void onSubmit(event)}>
        <CloseButton label="Close create meeting" className="btn-compact" onClick={() => setCreating(false)} />
        <div className="archive-head">
          <h2><Mark name="meeting">Create a meeting</Mark></h2>
        </div>
        <p className="quiet">
          Set an introductory meeting for a project, a scoping meeting for an introduced proposal or a TRI AI Saturdays Research Award project, or a meeting on an
          active project.
        </p>
        <SearchSelect
          label="Meeting"
          options={[
            { value: "introduction", label: "Introductory meeting" },
            { value: "scoping", label: "New scoping meeting" },
            { value: "project", label: "Active project meeting" },
          ]}
          value={kind}
          onChange={(next) => {
            setKind(next as MeetingKind);
            setRecordId("");
          }}
          placeholder="Meeting type…"
        />
        <SearchSelect
          label={kind === "scoping" ? "Proposal or award project" : kind === "introduction" ? "Project" : "Active project"}
          options={[
            { value: "", label: "Select" },
            ...options.map((item) => {
              const taken = kind === "scoping" && scopingTaken(item.id);
              const award = kind === "scoping" && "awardId" in item && Boolean((item as ProjectOption).awardId);
              const type =
                kind === "project" || kind === "introduction" || award ? projectTypeLabel(item as ProjectOption) : undefined;
              return {
                value: item.id,
                label: item.title || "Untitled",
                detail: taken ? "Scoping meeting already set" : type,
                disabled: taken,
              };
            }),
          ]}
          value={recordId}
          onChange={setRecordId}
          placeholder={kind === "scoping" ? "Search proposals or award projects…" : "Search projects…"}
          required
        />
        {kind === "introduction" && introductionProjects.length === 0 ? (
          <p className="quiet">Every current project already has an introductory meeting.</p>
        ) : null}
        {kind === "scoping" && scopingProposals.length === 0 && awardScopingProjects.length === 0 ? (
          <p className="quiet">
            Introduce a Senior Researcher on a proposal, or create a TRI AI Saturdays Research Award project that still needs
            scoping.
          </p>
        ) : null}
        {kind === "introduction" && recordId && candidates.length > 0 ? (
          <p className="quiet">Everyone invited to this project is included. Remove anyone who should not be on the meeting.</p>
        ) : null}
        {kind !== "introduction" && recordId && (candidates.filter((person) => directory.find((item) => item.uid === person.uid)?.role === "senior_researcher").length === 0 || candidates.filter((person) => directory.find((item) => item.uid === person.uid)?.role !== "senior_researcher").length === 0) ? (
          <p className="quiet">
            {isAwardScoping
              ? "Invite a Researcher and a Senior Researcher, then wait until both have joined before setting the meeting."
              : "Add a Researcher and a Senior Researcher."}
          </p>
        ) : null}
        {candidates.length > 0 ? (
          <fieldset className="fields">
            <legend>Invite</legend>
            {candidates.map((person) => (
              <label className="check" key={person.key}>
                <input
                  type="checkbox"
                  checked={selected.includes(person.key)}
                  onChange={(event) => {
                    setSelected((current) =>
                      event.target.checked ? [...current, person.key] : current.filter((id) => id !== person.key),
                    );
                  }}
                />
                <span>
                  {person.name}
                  {person.email ? ` · ${person.email}` : " · no email on the account"}
                  {person.pending ? " · invited to the project" : ""}
                </span>
              </label>
            ))}
          </fieldset>
        ) : null}
        {meetingIncludesAdmins(kind) ? (
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
              .filter((person) => selected.includes(person.key))
              .map((person) => ({ name: person.name, zone: zones[person.uid] || PROGRAMME_ZONE })),
            ...(meetingIncludesAdmins(kind)
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
      <EmailSupport label="Meeting email" draft={mail} autoOpen />
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
