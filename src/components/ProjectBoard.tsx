import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  formatMeetingWhen,
  listMeetings,
  listMeetingReplies,
  listParticipantMeetings,
  meetingAttendees,
  meetingForProject,
  meetingIsArchived,
  meetingReplyPhrase,
  saveMeetingReply,
  type MeetingResponseValue,
  type MeetingRow,
} from "../lib/meetings";
import {
  addWorkTask,
  listWorkTasks,
  removeWorkTask,
  saveWorkTask,
  type WorkTask,
} from "../lib/workspace";
import { Icon } from "./Icon";
import { Loader } from "./Loader";

const STATUSES = [
  ["todo", "To do"],
  ["doing", "Doing"],
  ["done", "Done"],
] as const;

type Status = (typeof STATUSES)[number][0];

type Person = { name?: string };

function statusOf(value?: string): Status {
  if (value === "doing" || value === "done") return value;
  return "todo";
}

function uniqueNames(groups: Person[][]) {
  const names: string[] = [];
  for (const group of groups) {
    for (const person of group) {
      const name = person.name?.trim();
      if (name && !names.includes(name)) names.push(name);
    }
  }
  return names;
}

function TaskStatus({
  value,
  onChange,
}: {
  value: Status;
  onChange: (status: Status) => void;
}) {
  return (
    <select
      className={`notion-status is-${value}`}
      aria-label="Status"
      value={value}
      onChange={(event) => onChange(statusOf(event.target.value))}
    >
      {STATUSES.map(([status, label]) => (
        <option key={status} value={status}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function ProjectBoard({
  projectId,
  proposalId,
  researchers,
  seniorResearchers,
  uid,
  displayName,
  admin,
}: {
  projectId: string;
  proposalId?: string;
  researchers?: Person[];
  seniorResearchers?: Person[];
  uid: string;
  displayName: string;
  admin: boolean;
}) {
  const [tasks, setTasks] = useState<WorkTask[] | null>(null);
  const [meetings, setMeetings] = useState<MeetingRow[] | null>(null);
  const [taskView, setTaskView] = useState<"table" | "board">("table");
  const [draft, setDraft] = useState("");
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [openMeeting, setOpenMeeting] = useState<string | null>(null);
  const [replyNote, setReplyNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const people = uniqueNames([researchers ?? [], seniorResearchers ?? []]);
  const mine = people.find((name) => name === displayName) || "";

  async function reloadTasks() {
    setTasks(await listWorkTasks(projectId));
  }

  useEffect(() => {
    let cancel = false;
    setTasks(null);
    setMeetings(null);
    setError("");
    Promise.all([
      listWorkTasks(projectId),
      admin ? listMeetings() : listParticipantMeetings(uid),
    ])
      .then(([nextTasks, nextMeetings]) => {
        if (cancel) return;
        setTasks(nextTasks);
        setMeetings(
          nextMeetings
            .filter((meeting) => meetingForProject(meeting, { id: projectId, proposalId }))
            .sort((a, b) => (a.startsAt?.toDate?.()?.getTime() ?? 0) - (b.startsAt?.toDate?.()?.getTime() ?? 0)),
        );
      })
      .catch((err: unknown) => {
        if (!cancel) setError(err instanceof Error ? err.message : "Could not load this page.");
      });
    return () => {
      cancel = true;
    };
  }, [admin, projectId, proposalId, uid]);

  useEffect(() => {
    if (!openTask && !openMeeting) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpenTask(null);
      setOpenMeeting(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openTask, openMeeting]);

  const selected = tasks?.find((task) => task.id === openTask) || null;
  const meeting = meetings?.find((item) => item.id === openMeeting) || null;
  const upcoming = useMemo(() => (meetings ?? []).filter((item) => !meetingIsArchived(item)), [meetings]);
  const earlier = useMemo(() => (meetings ?? []).filter((item) => meetingIsArchived(item)), [meetings]);

  async function change(task: WorkTask, patch: Partial<Pick<WorkTask, "title" | "status" | "ownerName" | "due" | "notes">>) {
    const next = {
      title: patch.title ?? task.title ?? "",
      status: statusOf(patch.status ?? task.status),
      ownerName: patch.ownerName ?? task.ownerName ?? "",
      due: patch.due ?? task.due ?? "",
      notes: patch.notes ?? task.notes ?? "",
    };
    if (!next.title.trim()) return;
    setTasks((current) =>
      (current ?? []).map((item) => (item.id === task.id ? { ...item, ...next } : item)),
    );
    setBusy(task.id);
    setError("");
    try {
      await saveWorkTask(projectId, task.id, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this task.");
      await reloadTasks();
    } finally {
      setBusy("");
    }
  }

  async function addTask(event: FormEvent) {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setBusy("add");
    setError("");
    try {
      await addWorkTask(projectId, { title, ownerName: mine }, uid);
      setDraft("");
      await reloadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add this task.");
    } finally {
      setBusy("");
    }
  }

  async function remove(task: WorkTask) {
    setBusy(task.id);
    setError("");
    try {
      await removeWorkTask(projectId, task.id);
      setOpenTask(null);
      await reloadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this task.");
    } finally {
      setBusy("");
    }
  }

  async function reply(response: MeetingResponseValue) {
    if (!meeting) return;
    setBusy(meeting.id);
    setError("");
    try {
      await saveMeetingReply(meeting.id, uid, response, replyNote.trim());
      setOpenMeeting(null);
      setReplyNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your reply.");
    } finally {
      setBusy("");
    }
  }

  if (tasks === null || meetings === null) {
    if (error) return <p className="error">{error}</p>;
    return <Loader label="Loading tasks and meetings" />;
  }

  return (
    <div className="notion">
      {error ? <p className="error">{error}</p> : null}
      <header className="notion-page">
        <span className="notion-emoji" aria-hidden="true">
          <Icon name="task" />
        </span>
        <div>
          <h2>Tasks and meetings</h2>
          <p>Shared with everyone on this project.</p>
        </div>
      </header>

      <section className="notion-db" aria-label="Tasks">
        <div className="notion-db-head">
          <h3>
            <Icon name="task" />
            Tasks
            <span>{tasks.length}</span>
          </h3>
          <div className="notion-views" role="tablist" aria-label="Task view">
            <button type="button" role="tab" aria-selected={taskView === "table"} onClick={() => setTaskView("table")}>
              Table
            </button>
            <button type="button" role="tab" aria-selected={taskView === "board"} onClick={() => setTaskView("board")}>
              Board
            </button>
          </div>
        </div>

        {taskView === "table" ? (
          <div className="notion-table-wrap">
            <div className="notion-table" role="table">
              <div className="notion-row notion-head" role="row">
                <span role="columnheader" />
                <span role="columnheader">Task</span>
                <span role="columnheader">Status</span>
                <span role="columnheader">Owner</span>
                <span role="columnheader">Due</span>
              </div>
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  people={people}
                  busy={busy === task.id}
                  onChange={(patch) => void change(task, patch)}
                  onOpen={() => setOpenTask(task.id)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="notion-board">
            {STATUSES.map(([status, label]) => (
              <div
                key={status}
                className="notion-column"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const id = event.dataTransfer.getData("text/plain");
                  const task = tasks.find((item) => item.id === id);
                  if (task && statusOf(task.status) !== status) void change(task, { status });
                }}
              >
                <h4>
                  <i className={`notion-dot is-${status}`} />
                  {label}
                  <span>{tasks.filter((task) => statusOf(task.status) === status).length}</span>
                </h4>
                {tasks
                  .filter((task) => statusOf(task.status) === status)
                  .map((task) => (
                    <button
                      key={task.id}
                      className="notion-card"
                      type="button"
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData("text/plain", task.id)}
                      onClick={() => setOpenTask(task.id)}
                    >
                      <strong>{task.title}</strong>
                      <span>{[task.ownerName, task.due].filter(Boolean).join(" · ") || "Open"}</span>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        )}

        <form className="notion-new" onSubmit={(event) => void addTask(event)}>
          <button className="notion-check" type="submit" disabled={busy === "add" || !draft.trim()} aria-label="Add task">
            +
          </button>
          <input
            value={draft}
            placeholder="New task"
            aria-label="New task"
            onChange={(event) => setDraft(event.target.value)}
          />
        </form>
      </section>

      <section className="notion-db" aria-label="Meetings">
        <div className="notion-db-head">
          <h3>
            <Icon name="meeting" />
            Meetings
            <span>{meetings.length}</span>
          </h3>
          <Link className="btn btn-ghost btn-compact" to={admin ? "/admin/meetings" : "/dashboard/meetings"}>
            Set a meeting
          </Link>
        </div>
        <MeetingTable meetings={upcoming} empty="No upcoming meetings." onOpen={(id) => { setReplyNote(""); setOpenMeeting(id); }} />
        {earlier.length > 0 ? (
          <details className="notion-earlier">
            <summary>Earlier · {earlier.length}</summary>
            <MeetingTable meetings={earlier} empty="" onOpen={(id) => { setReplyNote(""); setOpenMeeting(id); }} />
          </details>
        ) : null}
      </section>

      {selected || meeting ? (
        <button className="notion-peek-backdrop" type="button" aria-label="Close" onClick={() => { setOpenTask(null); setOpenMeeting(null); }} />
      ) : null}

      {selected ? (
        <aside className="notion-peek" aria-label={selected.title || "Task"}>
          <header>
            <button className="btn btn-ghost btn-compact" type="button" onClick={() => setOpenTask(null)}>
              Close
            </button>
            {selected.createdBy === uid || admin ? (
              <button className="btn btn-ghost btn-compact" type="button" disabled={busy === selected.id} onClick={() => void remove(selected)}>
                Delete
              </button>
            ) : null}
          </header>
          <input
            className="notion-peek-title"
            aria-label="Task"
            value={selected.title || ""}
            onChange={(event) =>
              setTasks((current) =>
                (current ?? []).map((item) => (item.id === selected.id ? { ...item, title: event.target.value } : item)),
              )
            }
            onBlur={() => void change(selected, { title: selected.title || "" })}
          />
          <label>
            Status
            <TaskStatus value={statusOf(selected.status)} onChange={(status) => void change(selected, { status })} />
          </label>
          <label>
            Owner
            <select
              value={selected.ownerName || ""}
              onChange={(event) => void change(selected, { ownerName: event.target.value })}
            >
              <option value="">Unassigned</option>
              {people.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due
            <input type="date" value={selected.due || ""} onChange={(event) => void change(selected, { due: event.target.value })} />
          </label>
          <label>
            Notes
            <textarea
              value={selected.notes || ""}
              onChange={(event) =>
                setTasks((current) =>
                  (current ?? []).map((item) => (item.id === selected.id ? { ...item, notes: event.target.value } : item)),
                )
              }
              onBlur={() => void change(selected, { notes: selected.notes || "" })}
            />
          </label>
        </aside>
      ) : null}

      {meeting ? (
        <MeetingPeek
          meeting={meeting}
          uid={uid}
          note={replyNote}
          busy={busy === meeting.id}
          onNote={setReplyNote}
          onClose={() => setOpenMeeting(null)}
          onReply={(response) => void reply(response)}
        />
      ) : null}
    </div>
  );
}

function TaskRow({
  task,
  people,
  busy,
  onChange,
  onOpen,
}: {
  task: WorkTask;
  people: string[];
  busy: boolean;
  onChange: (patch: Partial<Pick<WorkTask, "title" | "status" | "ownerName" | "due">>) => void;
  onOpen: () => void;
}) {
  const status = statusOf(task.status);
  const [title, setTitle] = useState(task.title || "");
  const owners = task.ownerName && !people.includes(task.ownerName) ? [task.ownerName, ...people] : people;
  useEffect(() => setTitle(task.title || ""), [task.title]);
  return (
    <div className={status === "done" ? "notion-row is-done" : "notion-row"} role="row">
      <button
        className={status === "done" ? "notion-check is-on" : "notion-check"}
        type="button"
        aria-label={status === "done" ? "Mark not done" : "Mark done"}
        disabled={busy}
        onClick={() => onChange({ status: status === "done" ? "todo" : "done" })}
      >
        {status === "done" ? "✓" : ""}
      </button>
      <input
        aria-label="Task"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => {
          if (title.trim() && title.trim() !== (task.title || "")) onChange({ title: title.trim() });
        }}
      />
      <TaskStatus value={status} onChange={(next) => onChange({ status: next })} />
      <select aria-label="Owner" value={task.ownerName || ""} onChange={(event) => onChange({ ownerName: event.target.value })}>
        <option value="">Unassigned</option>
        {owners.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <input aria-label="Due" type="date" value={task.due || ""} onChange={(event) => onChange({ due: event.target.value })} />
      <button className="notion-open" type="button" onClick={onOpen} aria-label={`Open ${task.title || "task"}`}>
        Open
      </button>
    </div>
  );
}

function MeetingTable({
  meetings,
  empty,
  onOpen,
}: {
  meetings: MeetingRow[];
  empty: string;
  onOpen: (id: string) => void;
}) {
  if (meetings.length === 0) return empty ? <p className="notion-empty">{empty}</p> : null;
  return (
    <div className="notion-table-wrap">
      <div className="notion-table is-meetings" role="table">
        <div className="notion-row notion-head" role="row">
          <span role="columnheader">Meeting</span>
          <span role="columnheader">When</span>
          <span role="columnheader">People</span>
        </div>
        {meetings.map((meeting) => {
          const people = meetingAttendees(meeting).map((person) => person.name).filter(Boolean);
          return (
            <button key={meeting.id} className="notion-row notion-meeting" type="button" onClick={() => onOpen(meeting.id)}>
              <strong>{meeting.title || "Meeting"}</strong>
              <span>{formatMeetingWhen(meeting.startsAt)}</span>
              <span>{people.join(", ") || "—"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MeetingPeek({
  meeting,
  uid,
  note,
  busy,
  onNote,
  onClose,
  onReply,
}: {
  meeting: MeetingRow;
  uid: string;
  note: string;
  busy: boolean;
  onNote: (value: string) => void;
  onClose: () => void;
  onReply: (response: MeetingResponseValue) => void;
}) {
  const [replies, setReplies] = useState<string>("");
  const people = meetingAttendees(meeting);
  const onMeeting = people.some((person) => person.uid === uid);
  useEffect(() => {
    let cancel = false;
    const attendees = meetingAttendees(meeting);
    listMeetingReplies(meeting.id)
      .then((rows) => {
        if (cancel) return;
        const line = rows
          .map((reply) => {
            const person = attendees.find((item) => item.uid === reply.id);
            return `${person?.name || "Someone"} ${meetingReplyPhrase(reply.response)}`;
          })
          .join(" · ");
        setReplies(line);
      })
      .catch(() => {
        if (!cancel) setReplies("");
      });
    return () => {
      cancel = true;
    };
  }, [meeting]);

  return (
    <aside className="notion-peek" aria-label={meeting.title || "Meeting"}>
      <header>
        <button className="btn btn-ghost btn-compact" type="button" onClick={onClose}>
          Close
        </button>
        {meeting.calendarLink ? (
          <a className="btn btn-ghost btn-compact" href={meeting.calendarLink} target="_blank" rel="noreferrer">
            Calendar
          </a>
        ) : null}
      </header>
      <h3>{meeting.title || "Meeting"}</h3>
      <p>{formatMeetingWhen(meeting.startsAt)}</p>
      <p className="quiet">{people.map((person) => person.name).filter(Boolean).join(", ")}</p>
      {meeting.note ? <p>{meeting.note}</p> : null}
      {replies ? <p className="quiet">{replies}</p> : null}
      {onMeeting && meeting.status !== "cancelled" ? (
        <form
          className="notion-reply"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
          }}
        >
          <label>
            Note
            <textarea value={note} onChange={(event) => onNote(event.target.value)} />
          </label>
          <div className="button-row">
            <button className="btn btn-primary btn-compact" type="button" disabled={busy} onClick={() => onReply("attending")}>
              I can attend
            </button>
            <button className="btn btn-ghost btn-compact" type="button" disabled={busy} onClick={() => onReply("needs_another_time")}>
              I need another time
            </button>
            <button className="btn btn-ghost btn-compact" type="button" disabled={busy} onClick={() => onReply("not_attending")}>
              I can’t attend
            </button>
          </div>
        </form>
      ) : null}
    </aside>
  );
}
