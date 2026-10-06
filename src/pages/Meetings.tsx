import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmailSupport } from "../components/EmailSupport";
import { Loader } from "../components/Loader";
import { MeetingClocks, MeetingTimePicker, TimezoneField, type TimeChoice } from "../components/MeetingTimePicker";
import { meetingEmail, meetingReplyEmail, named, type EmailDraft } from "../lib/email";
import { MeetingSchedule } from "../components/MeetingSchedule";
import { Mark } from "../components/Icon";
import { WorkspaceTabs } from "../components/WorkspaceTabs";
import { useAuth } from "../lib/auth";
import { calendarTemplateLink, createGoogleCalendarEvent, nextSaturdayAtFourWat, watDateAndTime } from "../lib/calendar";
import { PROGRAMME_ZONE, formatNoteClocks, formatZonedSpan, loadTimezones, saveTimezone, zonedWallTime } from "../lib/timezones";
import {
  cancelMeeting,
  formatMeetingWhen,
  listMeetingReplies,
  meetingAttendees,
  meetingDate,
  meetingReplyPhrase,
  listParticipantMeetings,
  meetingIsArchived,
  saveMeeting,
  scopingMeetingTaken,
  scopingNeedsMatch,
  saveMeetingReply,
  updateMeeting,
  type MeetingKind,
  type MeetingPerson,
  type MeetingReply,
  type MeetingResponseValue,
  type MeetingRow,
} from "../lib/meetings";
import { listAdmins, listMatches, listMentorMatches, listParticipantProjects, listProgrammeIntroductions } from "../lib/records";

function MeetingCard({
  meeting,
  uid,
  replies,
  archived = false,
  canManage = false,
  zones,
  onReply,
  onChanged,
}: {
  meeting: MeetingRow;
  uid: string;
  replies: MeetingReply[];
  archived?: boolean;
  canManage?: boolean;
  zones: Record<string, string>;
  onReply: (response: MeetingResponseValue, note: string) => Promise<void>;
  onChanged: () => Promise<void>;
}) {
  const mine = replies.find((reply) => reply.id === uid);
  const attending = mine?.response === "attending";
  const suggested = mine?.response === "needs_another_time";
  const [note, setNote] = useState(mine?.note ?? "");
  const [mail, setMail] = useState<EmailDraft | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const suggestedOpening = nextSaturdayAtFourWat();
  const [suggestion, setSuggestion] = useState<TimeChoice>({
    date: suggestedOpening.date,
    start: suggestedOpening.start,
    end: suggestedOpening.end,
    zone: PROGRAMME_ZONE,
  });
  const start = meetingDate(meeting.startsAt);
  const opening = start ? watDateAndTime(start) : { date: nextSaturdayAtFourWat().date, time: "16:00" };
  const ending = meetingDate(meeting.endsAt);
  const [editWhen, setEditWhen] = useState<TimeChoice>({
    date: opening.date,
    start: opening.time,
    end: ending ? watDateAndTime(ending).time : "17:00",
    zone: PROGRAMME_ZONE,
  });
  const [editNote, setEditNote] = useState(meeting.note || "");
  const people = meetingAttendees(meeting);
  const attendees = people.map((person) => ({
    name: person.name,
    zone: zones[person.uid] || PROGRAMME_ZONE,
  }));
  const manageable = canManage && meeting.status !== "cancelled";

  async function reply(response: MeetingResponseValue) {
    setError("");
    try {
      await onReply(response, note);
      setSuggesting(false);
      const people = meetingAttendees(meeting);
      const self = people.find((person) => person.uid === uid);
      setMail(
        meetingReplyEmail({
          title: meeting.title || "A meeting",
          person: named(self?.name || "Participant", self?.email || ""),
          attending: response === "attending",
          response,
          note,
          attendees: people.filter((person) => person.uid !== uid).map((person) => named(person.name, person.email)),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your reply.");
    }
  }

  async function suggestTime(event: FormEvent) {
    event.preventDefault();
    setError("");
    const starts = zonedWallTime(suggestion.date, suggestion.start, suggestion.zone);
    const ends = zonedWallTime(suggestion.date, suggestion.end, suggestion.zone);
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()) || ends <= starts) {
      setError("Choose a start time that is earlier than the end time.");
      return;
    }
    const programme = `${formatMeetingWhen({ toDate: () => starts })} – ${formatMeetingWhen({ toDate: () => ends })}`;
    const suggestedNote =
      suggestion.zone === PROGRAMME_ZONE
        ? `Suggested time: ${programme}`
        : `Suggested time: ${formatZonedSpan(starts, ends, suggestion.zone)}. Programme time: ${programme}`.slice(0, 490);
    try {
      await onReply("needs_another_time", suggestedNote);
      setNote(suggestedNote);
      setSuggesting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your suggested time.");
    }
  }

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
      details: editNote.trim() || "TRI AI Research Programme meeting.",
      emails,
    });
    try {
      await updateMeeting(meeting.id, { starts, ends, note: editNote.trim(), calendarLink });
      setEditing(false);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this meeting.");
    }
  }

  async function cancel() {
    setError("");
    try {
      await cancelMeeting(meeting.id);
      setConfirming(false);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel this meeting.");
    }
  }

  return (
    <article className="opportunity">
      <p className="mono">
        {meeting.status === "cancelled"
          ? "Cancelled"
          : meeting.kind === "scoping"
            ? "New scoping meeting"
            : "Active project meeting"}
      </p>
      <h3>{meeting.title || "Meeting"}</h3>
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
        {(replies ?? [])
          .map((reply) => {
            const person = meetingAttendees(meeting).find(
              (item) => item.uid === reply.id,
            );
            return `${person?.name || "Someone"} ${meetingReplyPhrase(reply.response)}${reply.note ? ` (${formatNoteClocks(reply.note)})` : ""}`;
          })
          .join("; ") || "No replies yet."}
      </p>
      {archived ? null : (
        <>
          <label>
            Note for TRI AI
            <textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <div className="decision-row">
            <button
              className={attending ? "btn btn-primary" : "btn btn-ghost"}
              type="button"
              aria-pressed={attending}
              onClick={() => void reply(attending ? "not_attending" : "attending")}
            >
              {attending ? "I can't attend" : "I can attend"}
            </button>
            <button
              className={suggested || suggesting ? "btn btn-primary" : "btn btn-ghost"}
              type="button"
              aria-pressed={suggested || suggesting}
              onClick={() => setSuggesting((value) => !value)}
            >
              I need another time
            </button>
          </div>
          {suggesting ? (
            <form className="fields" onSubmit={(event) => void suggestTime(event)}>
              <MeetingTimePicker value={suggestion} onChange={setSuggestion} people={attendees} resetOnDate />
              <div className="button-row">
                <button className="btn btn-primary" type="submit">
                  Suggest this time
                </button>
              </div>
            </form>
          ) : null}
        </>
      )}
      {manageable ? (
        <div className="actions">
          <button className="btn btn-ghost btn-compact" type="button" onClick={() => setEditing((value) => !value)}>
            {editing ? "Close editor" : "Edit"}
          </button>
          {confirming ? (
            <button className="btn btn-primary btn-compact" type="button" onClick={() => void cancel()}>
              Confirm cancel
            </button>
          ) : (
            <button className="btn btn-ghost btn-compact" type="button" onClick={() => setConfirming(true)}>
              Cancel meeting
            </button>
          )}
        </div>
      ) : null}
      {editing && manageable ? (
        <form className="fields" onSubmit={(event) => void saveEdit(event)}>
          <MeetingTimePicker value={editWhen} onChange={setEditWhen} people={attendees} preserveInstantOnZone />
          <label>
            Note
            <textarea value={editNote} onChange={(event) => setEditNote(event.target.value)} />
          </label>
          <div className="button-row">
            <button className="btn btn-primary" type="submit">
              Save changes
            </button>
          </div>
        </form>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      <EmailSupport draft={mail} />
    </article>
  );
}

type ProposalChoice = {
  id: string;
  title?: string;
  introduction?: string;
  status?: string;
  ownerId?: string;
  researcherIds?: string[];
  name?: string;
  matchId?: string;
  claimProjectId?: string;
};

type ProjectChoice = {
  id: string;
  title?: string;
  status?: string;
  proposalId?: string;
  researchers?: { uid?: string; name?: string }[];
  seniorResearchers?: { uid?: string; name?: string }[];
};

type MatchChoice = {
  id?: string;
  proposalId?: string;
  mentorId?: string;
  mentorName?: string;
  introduced?: boolean;
  researcherId?: string;
  researcherIds?: string[];
  researcherName?: string;
  title?: string;
};

function withEmail(person: { uid?: string; name?: string }, self: { uid: string; email: string }): MeetingPerson | null {
  if (!person.uid || !person.name) return null;
  return { uid: person.uid, name: person.name, email: person.uid === self.uid ? self.email : "" };
}

function ResearcherMeetingForm({
  uid,
  email,
  displayName,
  takenScoping,
  onSaved,
}: {
  uid: string;
  email: string;
  displayName: string;
  takenScoping: Set<string>;
  onSaved: () => Promise<void>;
}) {
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
  const [personZones, setPersonZones] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [proposals, setProposals] = useState<ProposalChoice[]>([]);
  const [projects, setProjects] = useState<ProjectChoice[]>([]);
  const [matches, setMatches] = useState<MatchChoice[]>([]);
  const [admins, setAdmins] = useState<MeetingPerson[]>([]);
  const [message, setMessage] = useState("");
  const [mail, setMail] = useState<EmailDraft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void listAdmins()
      .then((rows) => setAdmins(rows))
      .catch(() => setAdmins([]));
  }, []);

  useEffect(() => {
    void Promise.all([listMentorMatches(uid), listParticipantProjects(uid), listProgrammeIntroductions()])
      .then(([matchRows, projectRows, introducedRows]) => {
        const mentorMatches = matchRows as MatchChoice[];
        const participantProjects = projectRows as ProjectChoice[];
        const introducedIds = new Set(
          (introducedRows as MatchChoice[])
            .filter((match) => match.introduced && match.mentorId && match.proposalId)
            .map((match) => match.proposalId as string),
        );
        const byProposal = new Map<string, ProposalChoice>();
        const researcherIdsFor = (match: MatchChoice) =>
          (match.researcherIds?.length ? match.researcherIds : match.researcherId ? [match.researcherId] : []).filter(
            (id) => id && id !== uid,
          );
        for (const match of mentorMatches) {
          if (!match.introduced || !match.proposalId) continue;
          byProposal.set(match.proposalId, {
            id: match.proposalId,
            title: match.title,
            introduction: "introduced",
            researcherIds: researcherIdsFor(match),
            name: match.researcherName,
            matchId: match.id,
          });
        }
        for (const project of participantProjects) {
          if (!project.proposalId || !introducedIds.has(project.proposalId)) continue;
          const current = byProposal.get(project.proposalId);
          if (!current && project.status === "active") continue;
          const fromMatches = mentorMatches
            .filter((match) => match.proposalId === project.proposalId)
            .flatMap(researcherIdsFor);
          const fromProject = (project.researchers ?? []).map((person) => person.uid || "").filter((id) => id && id !== uid);
          byProposal.set(project.proposalId, {
            id: project.proposalId,
            title: current?.title || project.title,
            introduction: current?.introduction || "introduced",
            researcherIds: [...new Set([...(current?.researcherIds ?? []), ...fromMatches, ...fromProject])],
            name: current?.name || mentorMatches.find((match) => match.proposalId === project.proposalId)?.researcherName,
            matchId: current?.matchId,
            claimProjectId: project.id,
          });
        }
        setProposals([...byProposal.values()].filter((item) => item.claimProjectId));
        setProjects(participantProjects);
        setMatches(mentorMatches);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load meetings you can set.");
      });
  }, [uid]);

  const scopingProposals = proposals.filter((item) => item.introduction === "introduced");
  const activeProjects = projects.filter((item) => item.status === "active");
  const options = kind === "scoping" ? scopingProposals : activeProjects;

  const candidates = useMemo(() => {
    const self = { uid, email };
    if (!recordId) return [];
    if (kind === "scoping") {
      const proposal = proposals.find((item) => item.id === recordId);
      if (!proposal) return [];
      const project = projects.find((item) => item.proposalId === proposal.id);
      const researchers = new Map<string, MeetingPerson>();
      for (const person of project?.researchers ?? []) {
        const row = withEmail(person, self);
        if (row) researchers.set(row.uid, row);
      }
      const researcherIds = proposal.researcherIds?.length ? proposal.researcherIds : proposal.ownerId ? [proposal.ownerId] : [];
      for (const [index, researcherId] of researcherIds.entries()) {
        if (!researcherId || researcherId === uid || researchers.has(researcherId)) continue;
        researchers.set(researcherId, {
          uid: researcherId,
          name: index === 0 ? proposal.name || "Researcher" : "Researcher",
          email: "",
        });
      }
      researchers.delete(uid);
      const seniors = new Map<string, MeetingPerson>();
      for (const person of project?.seniorResearchers ?? []) {
        const row = withEmail(person, self);
        if (row && row.uid !== uid) seniors.set(row.uid, row);
      }
      for (const match of matches) {
        if (match.proposalId !== proposal.id || !match.mentorId || match.mentorId === uid || seniors.has(match.mentorId)) continue;
        seniors.set(match.mentorId, {
          uid: match.mentorId,
          name: match.mentorName || "Senior Researcher",
          email: "",
        });
      }
      seniors.set(uid, { uid, name: displayName || "Senior Researcher", email });
      return [...researchers.values(), ...seniors.values()];
    }
    const project = projects.find((item) => item.id === recordId);
    if (!project) return [];
    const researchers = (project.researchers ?? [])
      .map((person) => withEmail(person, self))
      .filter((person): person is MeetingPerson => Boolean(person && person.uid !== uid));
    const seniors = (project.seniorResearchers ?? [])
      .map((person) => withEmail(person, self))
      .filter((person): person is MeetingPerson => Boolean(person && person.uid !== uid));
    return [...researchers, ...seniors, { uid, name: displayName || "Senior Researcher", email }];
  }, [displayName, email, kind, matches, projects, proposals, recordId, uid]);

  useEffect(() => {
    const ids = [...candidates.map((person) => person.uid), ...admins.map((person) => person.uid)];
    if (ids.length === 0) return;
    void loadTimezones(ids).then(setPersonZones).catch(() => undefined);
  }, [admins, candidates]);

  useEffect(() => {
    setSelected(candidates.map((person) => person.uid));
  }, [candidates]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    const startDate = zonedWallTime(when.date, when.start, when.zone);
    const endDate = zonedWallTime(when.date, when.end, when.zone);
    if (!recordId || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      setError("Choose the record and a start time that is earlier than the end time.");
      return;
    }
    if (kind === "scoping" && !scopingProposals.some((item) => item.id === recordId)) {
      setError(scopingNeedsMatch);
      return;
    }
    const invited = candidates.filter((person) => selected.includes(person.uid) || person.uid === uid);
    const seniorIds = new Set(
      kind === "project"
        ? (projects.find((item) => item.id === recordId)?.seniorResearchers ?? []).map((person) => person.uid)
        : [
            ...(projects.find((item) => item.proposalId === recordId)?.seniorResearchers ?? []).map((person) => person.uid),
            ...matches.filter((item) => item.proposalId === recordId).map((item) => item.mentorId),
          ],
    );
    seniorIds.add(uid);
    const researchers = invited.filter((person) => person.uid !== uid && !seniorIds.has(person.uid));
    const seniorResearchers = invited.filter((person) => person.uid === uid || seniorIds.has(person.uid));
    if (!seniorResearchers.some((person) => person.uid === uid)) {
      setError("Include yourself in the meeting.");
      return;
    }
    if (researchers.length === 0) {
      setError("Choose at least one Researcher.");
      return;
    }
    if (seniorResearchers.length === 0) {
      setError("Choose at least one Senior Researcher.");
      return;
    }
    const orderedSeniors = [
      ...seniorResearchers.filter((person) => person.uid === uid),
      ...seniorResearchers.filter((person) => person.uid !== uid),
    ];
    const programmeAdmins =
      kind === "scoping"
        ? admins.filter(
            (person) =>
              !researchers.some((item) => item.uid === person.uid) &&
              !orderedSeniors.some((item) => item.uid === person.uid),
          )
        : [];
    if (kind === "scoping" && programmeAdmins.length === 0) {
      setError("Add a TRI AI admin.");
      return;
    }
    if (kind === "scoping" && takenScoping.has(recordId)) {
      setError(scopingMeetingTaken);
      return;
    }
    const guests = [...invited, ...programmeAdmins];
    const title =
      kind === "scoping"
        ? proposals.find((item) => item.id === recordId)?.title || "Scoping meeting"
        : projects.find((item) => item.id === recordId)?.title || "Project meeting";
    const subject = kind === "scoping" ? `Scoping meeting: ${title}` : `Project meeting: ${title}`;
    const details = note.trim() || "TRI AI Research Programme meeting.";
    const template = calendarTemplateLink({
      title: subject,
      starts: startDate,
      ends: endDate,
      details,
      emails: guests.map((person) => person.email),
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
        emails: guests.map((person) => person.email),
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
        seniorResearchers: orderedSeniors,
        admins: programmeAdmins,
        claim:
          kind === "scoping"
            ? {
                matchId: proposals.find((item) => item.id === recordId)?.matchId,
                projectId:
                  proposals.find((item) => item.id === recordId)?.claimProjectId ||
                  projects.find((item) => item.proposalId === recordId)?.id,
              }
            : undefined,
        calendarEventId,
        calendarLink,
        createdBy: uid,
      });
      setMessage(
        created
          ? "Meeting saved. Invites sent."
          : opened
            ? "Finish the meeting in Google Calendar."
            : "Meeting saved.",
      );
      setNote("");
      setOpen(false);
      setMail(
        meetingEmail({
          title: subject,
          when: formatMeetingWhen({ toDate: () => startDate }),
          scoping: kind === "scoping",
          attendees: guests.map((person) => named(person.name, person.email)),
          from: named(displayName || "Senior Researcher", email),
        }),
      );
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this meeting.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <>
        {message ? <p className="notice">{message}</p> : null}
        <EmailSupport draft={mail} />
        <div className="button-row">
          <button className="btn btn-primary" type="button" aria-expanded={false} onClick={() => setOpen(true)}>
            Create Meetings
          </button>
        </div>
      </>
    );
  }

  return (
    <form className="fields" onSubmit={(event) => void onSubmit(event)}>
      <div className="archive-head">
        <h2><Mark name="meeting">Create Meetings</Mark></h2>
        <button
          className="btn btn-ghost btn-compact"
          type="button"
          aria-expanded
          onClick={() => {
            setMessage("");
            setOpen(false);
          }}
        >
          Close
        </button>
      </div>
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
            const taken = kind === "scoping" && takenScoping.has(item.id);
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
      {recordId && candidates.length > 0 && !candidates.some((person) => person.uid === uid) ? (
        <p className="quiet">Add yourself and one Researcher.</p>
      ) : null}
      {recordId && candidates.length > 0 && candidates.every((person) => person.uid === uid) ? (
        <p className="quiet">Add a Researcher.</p>
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
                {person.email ? ` · ${person.email}` : ""}
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {kind === "scoping" ? (
        <p className="quiet">
          {admins.length > 0
            ? `TRI AI is invited: ${admins.map((person) => person.name).join(", ")}`
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
            .map((person) => ({ name: person.name, zone: personZones[person.uid] || PROGRAMME_ZONE })),
          ...(kind === "scoping"
            ? admins.map((person) => ({ name: person.name, zone: personZones[person.uid] || PROGRAMME_ZONE }))
            : []),
        ]}
      />
      <label>
        Note
        <textarea value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="notice">{message}</p> : null}
      <div className="button-row">
        <button className="btn btn-primary" type="submit" disabled={busy || options.length === 0}>
          {busy ? "Saving…" : "Save and add to Google Calendar"}
        </button>
      </div>
    </form>
  );
}

export function MeetingsPage() {
  const { user, profile } = useAuth();
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [replies, setReplies] = useState<Record<string, MeetingReply[]>>({});
  const [waiting, setWaiting] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const [zones, setZones] = useState<Record<string, string>>({});

  async function reload(uid: string, role: string) {
    const rows = await listParticipantMeetings(uid);
    setMeetings(rows);
    const people = rows.flatMap((meeting) => meetingAttendees(meeting).map((person) => person.uid));
    setZones(await loadTimezones([uid, ...people]));
    const replyEntries = await Promise.all(rows.map(async (meeting) => [meeting.id, await listMeetingReplies(meeting.id)] as const));
    setReplies(Object.fromEntries(replyEntries));
    const scheduledScoping = new Set(
      rows.filter((item) => item.kind === "scoping" && item.status !== "cancelled").map((item) => item.proposalId),
    );
    const scheduledProjects = new Set(
      rows.filter((item) => item.kind === "project" && item.status !== "cancelled").map((item) => item.projectId),
    );
    const pending: string[] = [];
    if (role === "senior_researcher") {
      const matches = await listMatches();
      for (const match of matches as { proposalId?: string; mentorId?: string; introduced?: boolean; title?: string }[]) {
        if (match.mentorId === uid && match.introduced && match.proposalId && !scheduledScoping.has(match.proposalId)) {
          pending.push(`${match.title || "A proposal"} is ready for a scoping meeting. Set the time below.`);
        }
      }
    }
    const projects = await listParticipantProjects(uid);
    for (const project of projects as { id: string; title?: string; status?: string }[]) {
      if (project.status === "active" && !scheduledProjects.has(project.id) && role === "senior_researcher") {
        pending.push(`${project.title || "An active project"} has no meeting scheduled. Set one below.`);
      }
    }
    setWaiting(pending);
    setLoaded(true);
  }

  useEffect(() => {
    if (!user || !profile) return;
    if (profile.role !== "researcher" && profile.role !== "senior_researcher") return;
    void reload(user.uid, profile.role).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not load meetings.");
      setLoaded(true);
    });
  }, [profile, user]);

  if (!profile || !user) return null;
  if (profile.role !== "researcher" && profile.role !== "senior_researcher") {
    return <p>Scoping meetings are for Researchers and Senior Researchers. <Link to="/admin/meetings">Admin scheduling</Link></p>;
  }

  const scoping = meetings.filter((meeting) => meeting.kind === "scoping" && !meetingIsArchived(meeting));
  const active = meetings.filter((meeting) => meeting.kind === "project" && !meetingIsArchived(meeting));
  const archived = meetings.filter((meeting) => meetingIsArchived(meeting));
  const scheduled = [...scoping, ...active].sort(
    (a, b) => (meetingDate(a.startsAt)?.getTime() ?? 0) - (meetingDate(b.startsAt)?.getTime() ?? 0),
  );

  const uid = user.uid;
  const role = profile.role;
  function meetingCard(meeting: MeetingRow, archivedCard = false) {
    return (
      <MeetingCard
        meeting={meeting}
        uid={uid}
        replies={replies[meeting.id] ?? []}
        archived={archivedCard}
        canManage={role === "senior_researcher" && (meeting.seniorResearchers ?? []).some((person) => person.uid === uid)}
        zones={zones}
        onChanged={() => reload(uid, role)}
        onReply={async (response, note) => {
          if (archivedCard) return;
          await saveMeetingReply(meeting.id, uid, response, note);
          await reload(uid, role);
        }}
      />
    );
  }

  return (
    <article>
      <header className="page-intro work">
        <div className="container">
          <p className="mono">{profile.role.replaceAll("_", " ")}</p>
          <h1>Scoping meetings</h1>
          <p className="lede">
            {profile.role === "senior_researcher"
              ? "Set a scoping meeting, or a meeting on an active project."
              : "Confirm a meeting."}
          </p>
        </div>
      </header>
      <section className="section-tight">
        <div className="container">
          {!loaded ? <Loader label="Loading meetings" /> : (
          <>
          <WorkspaceTabs current="meetings" />
          <div className="zone-self">
            <TimezoneField
              label="Your time zone"
              value={zones[uid] || PROGRAMME_ZONE}
              onChange={(zone) => {
                setZones((current) => ({ ...current, [uid]: zone }));
                void saveTimezone(uid, zone).catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : "Could not save your time zone.");
                });
              }}
            />
            <p className="quiet">Shown to other people on the meeting.</p>
          </div>
          {profile.role === "senior_researcher" ? (
            <ResearcherMeetingForm
              uid={user.uid}
              email={user.email || ""}
              displayName={profile.displayName || user.displayName || ""}
              takenScoping={
                new Set(
                  meetings
                    .filter((meeting) => meeting.kind === "scoping" && meeting.status !== "cancelled" && meeting.proposalId)
                    .map((meeting) => meeting.proposalId || ""),
                )
              }
              onSaved={() => reload(user.uid, profile.role)}
            />
          ) : null}
          {error ? <p className="error">{error}</p> : null}
          {waiting.length > 0 ? (
            <div className="notices">
              {waiting.map((item) => (
                <article key={item} className="notice">
                  <p>{item}</p>
                </article>
              ))}
            </div>
          ) : null}
          <h2><Mark name="meeting">Scheduled</Mark></h2>
          <MeetingSchedule
            meetings={scheduled}
            renderMeeting={(meeting) => meetingCard(meeting)}
            list={
              <>
                <h3><Mark name="meeting">New scoping meetings</Mark></h3>
                {scoping.length === 0 ? <div className="empty">No scoping meeting is scheduled for you yet.</div> : null}
                {scoping.map((meeting) => (
                  <div key={meeting.id}>{meetingCard(meeting)}</div>
                ))}
                <h3 style={{ marginTop: 28 }}><Mark name="projects">Active project meetings</Mark></h3>
                {active.length === 0 ? <div className="empty">No meeting is scheduled on your active projects.</div> : null}
                {active.map((meeting) => (
                  <div key={meeting.id}>{meetingCard(meeting)}</div>
                ))}
              </>
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
                <div key={meeting.id}>{meetingCard(meeting, true)}</div>
              ))}
            </>
          ) : null}
          </>
          )}
        </div>
      </section>
    </article>
  );
}
