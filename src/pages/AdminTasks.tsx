import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Mark } from "../components/Icon";
import { Loader } from "../components/Loader";
import { useAuth } from "../lib/auth";
import { listMeetings } from "../lib/meetings";
import { buildProgrammeTasks, type ProgrammeWork } from "../lib/programmeTasks";
import {
  listMatches,
  listProjectInvites,
  listProjects,
  listProposals,
  listSeniorProfiles,
} from "../lib/records";
import {
  addTask,
  completeTask,
  finishProgrammeTask,
  taskActorName,
  watchTasks,
  type ProgrammeTask,
} from "../lib/tasks";
import { formatZonedWhen, PROGRAMME_ZONE } from "../lib/timezones";
import { listProjectActivities, type ProjectActivity } from "../lib/workspace";

function when(value: Date | null) {
  return value ? formatZonedWhen(value, PROGRAMME_ZONE) : "the time is still being recorded";
}

const areas = ["Proposal", "Researcher", "Senior Researcher", "Project", "Added by an admin"] as const;
const poolSubject = "Senior Researcher pool";
const addedSubject = "Added by an admin";

type NamedRecord = { id: string; title?: string };

function subjectFromTitle(title: string, names: string[]) {
  const haystack = title.toLocaleLowerCase();
  return names.find((name) => haystack.includes(name.toLocaleLowerCase())) || "";
}

function storedSubject(task: ProgrammeTask, proposals: NamedRecord[], projects: NamedRecord[]) {
  if (task.sourceKey.startsWith("email:senior-welcome:")) return poolSubject;
  const recordId = task.sourceKey.split(":").slice(2).join(":");
  const titled = [...proposals, ...projects].find((item) => item.id === recordId && item.title?.trim());
  if (titled?.title) return titled.title.trim();
  const names = [...proposals, ...projects]
    .map((item) => item.title?.trim() || "")
    .filter((name) => name.length > 3)
    .sort((left, right) => right.length - left.length);
  return subjectFromTitle(task.title, names) || addedSubject;
}

type GroupRow =
  | { id: string; kind: "programme"; task: ProgrammeWork }
  | { id: string; kind: "open"; task: ProgrammeTask }
  | { id: string; kind: "done"; task: ProgrammeTask };

function stepLabel(title: string, subject: string) {
  if (!subject || subject === addedSubject || subject === poolSubject) return title;
  if (!title.toLocaleLowerCase().includes(subject.toLocaleLowerCase())) return title;
  const pattern = new RegExp(subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const stripped = title
    .replace(pattern, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+(for|on|that)$/i, "")
    .replace(/^(for|on|that)\s+/i, "")
    .trim();
  return stripped || title;
}

function countLabel(rows: GroupRow[]) {
  const openCount = rows.filter((row) => row.kind !== "done").length;
  const doneCount = rows.length - openCount;
  if (openCount && doneCount) return `${openCount} open · ${doneCount} done`;
  if (doneCount) return doneCount === 1 ? "1 done" : `${doneCount} done`;
  return openCount === 1 ? "1 open" : `${openCount} open`;
}

function TaskGroups({
  groups,
  busy,
  onProgrammeDone,
  onDone,
}: {
  groups: { name: string; rows: GroupRow[] }[];
  busy: string;
  onProgrammeDone: (task: ProgrammeWork) => void;
  onDone: (task: ProgrammeTask) => void;
}) {
  if (groups.length === 0) return null;
  return (
    <div className="task-groups">
      {groups.map((group) => (
        <section className="task-group" key={group.name} aria-label={group.name}>
          <header className="task-group-head">
            <h3>{group.name}</h3>
            <p className="task-count">{countLabel(group.rows)}</p>
          </header>
          <ol className="task-steps">
            {group.rows.map((row) =>
              row.kind === "programme" ? (
                <li className="task-step" key={row.id}>
                  <span className="task-mark" aria-hidden="true" />
                  <div className="task-step-main">
                    <div className="task-step-copy">
                      <p className="mono">{row.task.area}</p>
                      <h4>{row.task.step}</h4>
                      <p>{row.task.detail}</p>
                    </div>
                    <div className="button-row">
                      <Link className="btn btn-ghost btn-compact" to={row.task.href}>
                        {row.task.action}
                      </Link>
                      {row.task.emailKey ? (
                        <button
                          className="btn btn-primary btn-compact"
                          type="button"
                          disabled={busy === row.task.id}
                          onClick={() => onProgrammeDone(row.task)}
                        >
                          Mark done
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ) : row.kind === "open" ? (
                <li className="task-step" key={row.id}>
                  <span className="task-mark" aria-hidden="true" />
                  <div className="task-step-main">
                    <div className="task-step-copy">
                      <p className="mono">Added by an admin</p>
                      <h4>{stepLabel(row.task.title, group.name)}</h4>
                      {row.task.detail ? <p>{row.task.detail}</p> : null}
                      <p>
                        Added by {row.task.createdByName || "TRI AI"} · {when(row.task.createdAt)}
                      </p>
                    </div>
                    <div className="button-row">
                      <button
                        className="btn btn-primary btn-compact"
                        type="button"
                        disabled={busy === row.task.id}
                        onClick={() => onDone(row.task)}
                      >
                        Mark done
                      </button>
                    </div>
                  </div>
                </li>
              ) : (
                <li className="task-step is-done" key={row.id}>
                  <span className="task-mark" aria-hidden="true" />
                  <div className="task-step-copy">
                    <p className="mono">Done</p>
                    <h4>{stepLabel(row.task.title, group.name)}</h4>
                    {row.task.detail ? <p>{row.task.detail}</p> : null}
                    <p>
                      Done by {row.task.doneByName || "TRI AI"} · {when(row.task.doneAt)}
                    </p>
                  </div>
                </li>
              ),
            )}
          </ol>
        </section>
      ))}
    </div>
  );
}

function doneArea(task: ProgrammeTask) {
  if (task.sourceKey.startsWith("email:senior-welcome:")) return "Senior Researcher";
  if (task.sourceKey.startsWith("email:activation:") || task.sourceKey.startsWith("progress:") || task.sourceKey.startsWith("output:")) {
    return "Project";
  }
  if (task.sourceKey.startsWith("email:")) return "Researcher";
  return "Added by an admin";
}

export function AdminTasksPage() {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<ProgrammeTask[]>([]);
  const [records, setRecords] = useState<{
    proposals: { id: string; title?: string; status?: string; name?: string }[];
    projects: { id: string; title?: string; status?: string; proposalId?: string; awardId?: string; scoped?: boolean; charterSigned?: boolean; researchers?: { name?: string }[]; seniorResearchers?: { name?: string }[] }[];
    matches: { id: string; proposalId?: string; title?: string; mentorName?: string; response?: string; introduced?: boolean }[];
    seniors: { id: string; name?: string; poolStatus?: string }[];
    meetings: { kind?: string; status?: string; proposalId?: string; projectId?: string }[];
    invites: { projectId?: string; role?: string; status?: string }[];
    activities: ProjectActivity[];
  } | null>(null);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [areaFilter, setAreaFilter] = useState("all");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (profile?.role !== "admin") return;
    return watchTasks(setTasks, setError);
  }, [profile?.role]);

  useEffect(() => {
    if (profile?.role !== "admin") return;
    let cancel = false;
    Promise.all([
      listProposals(),
      listProjects(),
      listMatches(),
      listSeniorProfiles(),
      listMeetings(),
      listProjectInvites(),
    ])
      .then(async ([proposals, projects, matches, seniors, meetings, invites]) => {
        const live = (projects as { id: string; status?: string }[]).filter((project) =>
          ["scoping", "active", "internal_review"].includes(project.status || ""),
        );
        const activities = await listProjectActivities(live.map((project) => project.id));
        if (cancel) return;
        setRecords({
          proposals: proposals as { id: string; title?: string; status?: string; name?: string }[],
          projects: projects as { id: string; title?: string; status?: string; proposalId?: string; awardId?: string; scoped?: boolean; charterSigned?: boolean; researchers?: { name?: string }[]; seniorResearchers?: { name?: string }[] }[],
          matches: matches as { id: string; proposalId?: string; title?: string; mentorName?: string; response?: string; introduced?: boolean }[],
          seniors: seniors as { id: string; name?: string; poolStatus?: string }[],
          meetings: meetings as { kind?: string; status?: string; proposalId?: string; projectId?: string }[],
          invites: invites as { projectId?: string; role?: string; status?: string }[],
          activities,
        });
      })
      .catch((err: unknown) => {
        if (!cancel) setError(err instanceof Error ? err.message : "Could not load programme tasks.");
      });
    return () => {
      cancel = true;
    };
  }, [profile?.role]);

  const programme = useMemo(() => {
    if (!records) return [];
    const finished = new Set(tasks.filter((task) => task.sourceKey).map((task) => task.sourceKey));
    return buildProgrammeTasks({ ...records, finishedEmailKeys: finished });
  }, [records, tasks]);

  if (profile && profile.role !== "admin") return <Navigate to="/admin" replace />;
  if (!records && !error) return <Loader label="Loading tasks" />;
  if (!records) {
    return (
      <div>
        <h2><Mark name="task">Tasks</Mark></h2>
        <p className="error">{error}</p>
      </div>
    );
  }

  const actorName = taskActorName(profile?.displayName ?? "", profile?.email || user?.email || "");
  const showOpen = statusFilter !== "done";
  const showDone = statusFilter !== "open";
  const showProgramme = areaFilter === "all" || areaFilter !== "Added by an admin";
  const showAdmin = areaFilter === "all" || areaFilter === "Added by an admin";
  const visibleProgramme = programme.filter((task) => areaFilter === "all" || task.area === areaFilter);
  const open = tasks.filter((task) => task.status === "open" && !task.sourceKey);
  const done = tasks
    .filter((task) => task.status === "done" && (areaFilter === "all" || doneArea(task) === areaFilter))
    .sort((a, b) => (b.doneAt?.getTime() ?? 0) - (a.doneAt?.getTime() ?? 0));
  const buckets = new Map<string, GroupRow[]>();
  const place = (name: string, row: GroupRow) => {
    const current = buckets.get(name) ?? [];
    current.push(row);
    buckets.set(name, current);
  };
  if (showOpen && showProgramme) {
    for (const task of visibleProgramme) place(task.subject || "Untitled", { id: task.id, kind: "programme", task });
  }
  if (showOpen && showAdmin) {
    for (const task of open) {
      const name = areaFilter === addedSubject ? addedSubject : storedSubject(task, records.proposals, records.projects);
      place(name, { id: task.id, kind: "open", task });
    }
  }
  if (showDone) {
    for (const task of done) {
      const name = areaFilter === addedSubject ? addedSubject : storedSubject(task, records.proposals, records.projects);
      place(name, { id: `done:${task.id}`, kind: "done", task });
    }
  }
  const groups = [...buckets.entries()]
    .map(([name, rows]) => ({ name, rows }))
    .sort((left, right) => {
      const rank = (name: string) => (name === addedSubject ? 2 : name === poolSubject ? 1 : 0);
      return rank(left.name) - rank(right.name) || left.name.localeCompare(right.name);
    });
  const namedGroups = groups.filter((group) => group.name !== addedSubject);
  const addedGroup = groups.find((group) => group.name === addedSubject);

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setError("");
    setBusy("add");
    try {
      await addTask({ title, detail, actorId: user.uid, actorName });
      setTitle("");
      setDetail("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not add the task.");
    } finally {
      setBusy("");
    }
  }

  async function onDone(task: ProgrammeTask) {
    if (!user) return;
    setError("");
    setBusy(task.id);
    try {
      await completeTask(task.id, user.uid, actorName);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not mark the task done.");
    } finally {
      setBusy("");
    }
  }

  async function onProgrammeDone(task: ProgrammeWork) {
    if (!user || !task.emailKey) return;
    setError("");
    setBusy(task.id);
    try {
      await finishProgrammeTask({
        sourceKey: task.emailKey,
        title: task.title,
        detail: task.detail,
        actorId: user.uid,
        actorName,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not mark the task done.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <h2><Mark name="task">Tasks</Mark></h2>
      {error ? <p className="error">{error}</p> : null}
      <div className="filters">
        <select aria-label="Task status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="open">Open tasks</option>
          <option value="done">Done tasks</option>
          <option value="all">All tasks</option>
        </select>
        <select aria-label="Task area" value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}>
          <option value="all">All areas</option>
          {areas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </div>
      {namedGroups.length > 0 ? (
        <TaskGroups groups={namedGroups} busy={busy} onProgrammeDone={(task) => void onProgrammeDone(task)} onDone={(task) => void onDone(task)} />
      ) : null}
      {namedGroups.length === 0 && (addedGroup?.rows.length ?? 0) === 0 ? (
        <div className="empty">{statusFilter === "done" ? "No done tasks in this filter." : "No open tasks in this filter."}</div>
      ) : null}
      {showOpen && showAdmin ? (
        <>
          <h2><Mark name="account">Added by an admin</Mark></h2>
          <form className="fields" onSubmit={(event) => void onAdd(event)}>
            <label>
              Task
              <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={159} required />
            </label>
            <label>
              Note
              <textarea value={detail} onChange={(event) => setDetail(event.target.value)} maxLength={499} />
            </label>
            <div className="button-row">
              <button className="btn btn-primary" type="submit" disabled={busy === "add"}>
                Add task
              </button>
            </div>
          </form>
          {open.length === 0 && (namedGroups.length > 0 || (addedGroup?.rows.length ?? 0) > 0) ? (
            <div className="empty">No tasks added by an admin are open.</div>
          ) : null}
        </>
      ) : null}
      {addedGroup ? (
        <TaskGroups groups={[addedGroup]} busy={busy} onProgrammeDone={(task) => void onProgrammeDone(task)} onDone={(task) => void onDone(task)} />
      ) : null}
    </div>
  );
}
