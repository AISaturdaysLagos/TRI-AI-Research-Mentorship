import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Mark } from "../components/Icon";
import { Loader } from "../components/Loader";
import { WorkspaceTabs } from "../components/WorkspaceTabs";
import { useAuth } from "../lib/auth";
import { userFacingError } from "../lib/errors";
import { listMeetingReplies, listParticipantMeetings, meetingHasHappened, type MeetingReply, type MeetingRow } from "../lib/meetings";
import { prefetchParticipantWorkspace } from "../lib/prefetchWorkspace";
import {
  listAssignedReviews,
  listMentorMatches,
  listParticipantProjects,
  listPendingInvitesForEmail,
  listProposals,
  listResearcherProposals,
} from "../lib/records";
import { buildParticipantTasks, buildReviewerTasks, type RoleTask } from "../lib/roleTasks";
import { listProjectActivities, listWorkTasks, type WorkspaceProject } from "../lib/workspace";
import { SearchSelect } from "../components/SearchSelect";

const LIVE = new Set(["scoping", "active", "internal_review"]);

function TaskGroups({ tasks }: { tasks: RoleTask[] }) {
  const buckets = new Map<string, RoleTask[]>();
  for (const task of tasks) {
    const name = task.subject || "Untitled";
    const current = buckets.get(name) ?? [];
    current.push(task);
    buckets.set(name, current);
  }
  const groups = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return (
    <div className="task-groups">
      {groups.map(([name, rows]) => (
        <section className="task-group" key={name} aria-label={name}>
          <header className="task-group-head">
            <h3>{name}</h3>
            <p className="task-count">{rows.length === 1 ? "1 open" : `${rows.length} open`}</p>
          </header>
          <ol className="task-steps">
            {rows.map((task) => (
              <li className="task-step" key={task.id}>
                <span className="task-mark" aria-hidden="true" />
                <div className="task-step-main">
                  <div className="task-step-copy">
                    <p className="mono">{task.area}</p>
                    <h4>{task.step}</h4>
                    <p>{task.detail}</p>
                  </div>
                  <div className="button-row">
                    <Link className="btn btn-ghost btn-compact" to={task.href}>
                      {task.action}
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function TaskBoard({ tasks, error }: { tasks: RoleTask[] | null; error: string }) {
  const [area, setArea] = useState("all");
  if (!tasks && !error) return <Loader label="Loading tasks" />;
  if (!tasks) {
    return (
      <div>
        <h2><Mark name="task">Tasks</Mark></h2>
        <p className="error">{error}</p>
      </div>
    );
  }
  const areas = [...new Set(tasks.map((task) => task.area))];
  const visible = tasks.filter((task) => area === "all" || task.area === area);
  return (
    <div>
      <h2><Mark name="task">Tasks</Mark></h2>
      {error ? <p className="error">{error}</p> : null}
      {areas.length > 1 ? (
        <div className="filters">
          <SearchSelect
            hideLabel
            label="Task area"
            options={[{ value: "all", label: "All areas" }, ...areas.map((item) => ({ value: item, label: item }))]}
            value={area}
            onChange={setArea}
            placeholder="Area…"
          />
        </div>
      ) : null}
      {visible.length === 0 ? (
        <div className="empty">No open tasks.</div>
      ) : (
        <TaskGroups tasks={visible} />
      )}
    </div>
  );
}

export function RoleTasksPage({ embedded = false }: { embedded?: boolean }) {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<RoleTask[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !profile) return;
    const role = profile.role;
    if (role !== "researcher" && role !== "senior_researcher" && role !== "reviewer") return;
    if (role === "researcher" || role === "senior_researcher") {
      prefetchParticipantWorkspace(role, user.uid, user.email || "");
    }
    let cancel = false;
    const fail = (err: unknown) => {
      if (!cancel) setError(userFacingError(err, "Could not load tasks."));
    };

    if (role === "reviewer") {
      Promise.all([listAssignedReviews(user.uid), listProposals()])
        .then(([reviews, proposals]) => {
          if (cancel) return;
          setTasks(buildReviewerTasks(
            reviews as { id: string; proposalId?: string; decision?: string }[],
            proposals as { id: string; title?: string }[],
          ));
        })
        .catch(fail);
      return () => {
        cancel = true;
      };
    }

    const name = profile.displayName || "";
    const projectsPromise = listParticipantProjects(user.uid);
    const meetingsPromise = listParticipantMeetings(user.uid);
    const proposalsPromise = role === "researcher" ? listResearcherProposals(user.uid) : Promise.resolve([]);
    const matchesPromise = role === "senior_researcher" ? listMentorMatches(user.uid) : Promise.resolve([]);
    const invitesPromise = listPendingInvitesForEmail(user.email || "", user.uid).catch(() => []);

    Promise.all([projectsPromise, meetingsPromise, proposalsPromise, matchesPromise, invitesPromise])
      .then(async ([projects, meetings, proposals, matches, invites]) => {
        const live = (projects as WorkspaceProject[]).filter((project) => LIVE.has(project.status || ""));
        const upcoming = (meetings as MeetingRow[]).filter((meeting) => meeting.status !== "cancelled" && !meetingHasHappened(meeting));
        const [activities, work, replies] = await Promise.all([
          listProjectActivities(live.map((project) => project.id)).catch(() => []),
          Promise.all(live.map(async (project) => ({
            projectId: project.id,
            items: await listWorkTasks(project.id).catch(() => []),
          }))),
          Promise.all(upcoming.map(async (meeting) => ({
            meetingId: meeting.id,
            replies: await listMeetingReplies(meeting.id).catch(() => [] as MeetingReply[]),
          }))),
        ]);
        if (cancel) return;
        setTasks(buildParticipantTasks({
          role,
          displayName: name,
          uid: user.uid,
          proposals: proposals as { id: string; title?: string; status?: string }[],
          invites: invites as { id: string; projectTitle?: string; role?: string }[],
          matches: matches as { id: string; proposalId?: string; title?: string; response?: string; introduced?: boolean }[],
          meetings: meetings as MeetingRow[],
          replies,
          projects: projects as WorkspaceProject[],
          milestones: activities.map((item) => ({ projectId: item.projectId, items: item.milestones })),
          work,
        }));
      })
      .catch(fail);

    return () => {
      cancel = true;
    };
  }, [profile, user]);

  if (!profile || !user) return null;
  if (!embedded && (profile.role === "admin" || profile.role === "reviewer")) {
    return <Navigate to="/admin/tasks" replace />;
  }
  if (embedded && profile.role !== "reviewer") return <Navigate to="/dashboard" replace />;
  if (!embedded && profile.role !== "researcher" && profile.role !== "senior_researcher") {
    return <Navigate to="/" replace />;
  }

  const board = <TaskBoard tasks={tasks} error={error} />;
  if (embedded) return board;

  return (
    <article>
      <header className="page-intro work">
        <div className="container">
          <p className="mono">{profile.role.replaceAll("_", " ")}</p>
          <h1>Tasks</h1>
          <p className="lede">What is waiting on you.</p>
        </div>
      </header>
      <section className="section-tight">
        <div className="container">
          <WorkspaceTabs current="tasks" />
          {board}
        </div>
      </section>
    </article>
  );
}
