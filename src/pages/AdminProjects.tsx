import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmailSupport } from "../components/EmailSupport";
import { HealthMark, StatusChip } from "../components/StatusChip";
import { Mark } from "../components/Icon";
import { Loader } from "../components/Loader";
import { useAuth } from "../lib/auth";
import { blocksToMarkdown, charterBlocks, ensureProjectDrive, overviewBlocks, scopingNotesBlocks } from "../lib/driveDocs";
import { activationEmail, awardWelcomeEmail, charterRequestEmail, named, projectJoinEmail, type EmailAddress, type EmailDraft } from "../lib/email";
import { returnFoldersFor } from "../lib/returns";
import {
  formatMeetingWhen,
  listMeetings,
  meetingForProject,
  meetingHasHappened,
  type MeetingRow,
} from "../lib/meetings";
import {
  activateProject,
  createAwardProject,
  createProjectInvite,
  inviteGuests,
  listProjectInvites,
  ensureProjectsForIntroducedMatches,
  listDirectory,
  listMatches,
  listProjects,
  markProjectCharterSigned,
  markProjectScoped,
  revokeProjectInvite,
} from "../lib/records";

type Person = { uid?: string; name?: string };

type ProjectRow = {
  id: string;
  title?: string;
  status?: string;
  proposalId?: string;
  awardId?: string;
  scoped?: boolean;
  scopedMeetingId?: string;
  charterSigned?: boolean;
  researchers?: Person[];
  seniorResearchers?: Person[];
  health?: string;
  researchArea?: string;
};

type InviteRow = {
  id: string;
  projectId?: string;
  projectTitle?: string;
  role?: string;
  status?: string;
  awardId?: string;
  guestName?: string;
  guestEmail?: string;
};

type Guest = { name: string; email: string };

function GuestList({
  legend,
  people,
  onChange,
}: {
  legend: string;
  people: Guest[];
  onChange: (people: Guest[]) => void;
}) {
  return (
    <fieldset className="guest-list">
      <legend>{legend}</legend>
      {people.map((person, index) => (
        <div className="guest-row" key={index}>
          <label>
            Name
            <input
              value={person.name}
              onChange={(event) =>
                onChange(people.map((item, itemIndex) => (itemIndex === index ? { ...item, name: event.target.value } : item)))
              }
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={person.email}
              onChange={(event) =>
                onChange(people.map((item, itemIndex) => (itemIndex === index ? { ...item, email: event.target.value } : item)))
              }
            />
          </label>
          <button
            className="btn btn-ghost btn-compact"
            type="button"
            onClick={() => onChange(people.filter((_, itemIndex) => itemIndex !== index))}
          >
            Remove
          </button>
        </div>
      ))}
      <button className="btn btn-ghost btn-compact" type="button" onClick={() => onChange([...people, { name: "", email: "" }])}>
        Add another
      </button>
    </fieldset>
  );
}

function InviteForm({
  legend,
  busy,
  onSubmit,
}: {
  legend: string;
  busy: boolean;
  onSubmit: (people: Guest[]) => Promise<void>;
}) {
  const [people, setPeople] = useState<Guest[]>([{ name: "", email: "" }]);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const guests = inviteGuests(people);
      if (guests.length === 0) {
        setError("Add a name and an email address.");
        return;
      }
      await onSubmit(guests);
      setPeople([{ name: "", email: "" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare the invite.");
    }
  }

  return (
    <form className="fields" onSubmit={(event) => void submit(event)}>
      <GuestList legend={legend} people={people} onChange={setPeople} />
      <p className="quiet">Name and email. They join from the invite.</p>
      {error ? <p className="error">{error}</p> : null}
      <button className="btn btn-primary btn-compact" type="submit" disabled={busy}>
        Prepare invite
      </button>
    </form>
  );
}

function projectMail(
  project: ProjectRow,
  directory: { id: string; email: string; displayName: string }[],
) {
  const address = (person: Person): EmailAddress => {
    const account = directory.find((item) => item.id === person.uid);
    return named(person.name || account?.displayName || "", account?.email || "");
  };
  const parties = [...(project.researchers ?? []), ...(project.seniorResearchers ?? [])]
    .map(address)
    .filter((person) => person.name || person.email);
  const folders = returnFoldersFor(project.proposalId || project.id);
  const known = parties.length > 0 ? parties : folders.map((folder) => named(folder.name, folder.email));
  const title = project.title || "Untitled project";
  const recordId = project.proposalId || project.id;
  if (project.awardId && known.length === 0) {
    return awardWelcomeEmail({
      title,
      researchers: [],
      link: `${window.location.origin}${window.location.pathname}#/award/${project.awardId}`,
    });
  }
  if (!project.charterSigned) return charterRequestEmail({ title, parties: known, projectId: project.id });
  return activationEmail({ title, parties: known, recordId });
}

function roleLabel(role: string | undefined) {
  return role === "senior_researcher" ? "Senior Researcher" : "Researcher";
}

function hashHref(path: string) {
  const url = new URL(window.location.href);
  url.hash = path;
  return url.toString();
}

function inviteHref(token: string) {
  return hashHref(`/join/${token}`);
}

function joinDraft(invite: InviteRow): EmailDraft | null {
  if (!invite.guestEmail) return null;
  const role = invite.role === "senior_researcher" ? "senior_researcher" : "researcher";
  return projectJoinEmail({
    title: invite.projectTitle || "Project",
    person: named(invite.guestName || "", invite.guestEmail),
    role,
    link: inviteHref(invite.id),
    award: Boolean(invite.awardId),
    page: invite.awardId ? awardHref(invite.awardId) : "",
  });
}

function awardHref(awardId: string) {
  return hashHref(`/award/${awardId}`);
}

function linkedMeetings(project: ProjectRow, meetings: MeetingRow[]) {
  return meetings.filter((meeting) => meetingForProject(meeting, project) && meeting.status !== "cancelled");
}

function latestHappened(project: ProjectRow, meetings: MeetingRow[]) {
  return linkedMeetings(project, meetings)
    .filter((meeting) => meetingHasHappened(meeting))
    .sort((left, right) => {
      const leftTime = left.endsAt?.toDate?.()?.getTime() ?? 0;
      const rightTime = right.endsAt?.toDate?.()?.getTime() ?? 0;
      return rightTime - leftTime;
    })[0];
}

function roster(joined: Person[] | undefined, invites: InviteRow[], role: string) {
  const listed = (joined ?? []).map((person) => person.name?.trim()).filter((name): name is string => Boolean(name));
  const seen = new Set(listed.map((name) => name.toLocaleLowerCase()));
  const waiting: string[] = [];
  for (const invite of invites) {
    if ((invite.role || "researcher") !== role) continue;
    const name = invite.guestName?.trim();
    if (!name || seen.has(name.toLocaleLowerCase())) continue;
    seen.add(name.toLocaleLowerCase());
    waiting.push(name);
  }
  const names = [...listed, ...waiting.map((name) => `${name} (invited)`)];
  return names.length > 0 ? names.join(", ") : "None yet";
}

function needsStep(project: ProjectRow) {
  return project.status === "scoping" && (!project.scoped || !project.charterSigned);
}

function nextStep(project: ProjectRow, meetings: MeetingRow[]) {
  if (project.status !== "scoping") {
    return {
      title: project.status === "active" ? "This project is active." : "Open the project workspace.",
      detail: project.charterSigned ? "The Project Charter is signed." : "",
    };
  }
  const happened = latestHappened(project, meetings);
  const upcoming = nextMeeting(project, meetings);
  if (!project.scoped) {
    return {
      title: "Mark the project scoped.",
      detail: happened
        ? `The meeting on ${formatMeetingWhen(happened.endsAt)} has happened.`
        : upcoming
          ? `The meeting is ${formatMeetingWhen(upcoming.startsAt)}. Mark it scoped if that meeting already happened outside the platform.`
          : "No meeting is on the platform yet. Mark it scoped if the meeting happened outside the platform.",
    };
  }
  if (!project.charterSigned) {
    return {
      title: "Record the signed Project Charter.",
      detail: happened
        ? `Scoped after the meeting on ${formatMeetingWhen(happened.endsAt)}.`
        : "The scoping meeting is recorded.",
    };
  }
  return {
    title: "Make this project active.",
    detail: "It is scoped and the Project Charter is signed.",
  };
}

function nextMeeting(project: ProjectRow, meetings: MeetingRow[]) {
  return linkedMeetings(project, meetings)
    .filter((meeting) => !meetingHasHappened(meeting))
    .sort((left, right) => {
      const leftTime = left.startsAt?.toDate?.()?.getTime() ?? 0;
      const rightTime = right.startsAt?.toDate?.()?.getTime() ?? 0;
      return leftTime - rightTime;
    })[0];
}

export function AdminProjectsPage() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [awardLink, setAwardLink] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    summary: "",
    researchArea: "",
    note: "",
    researchers: [{ name: "", email: "" }] as Guest[],
    seniors: [{ name: "", email: "" }] as Guest[],
  });
  const [prepared, setPrepared] = useState<EmailDraft[]>([]);
  const [view, setView] = useState("attention");
  const [directory, setDirectory] = useState<{ id: string; email: string; displayName: string }[]>([]);

  async function reload() {
    const [inviteRows, meetingRows, matchRows, directoryRows] = await Promise.all([
      listProjectInvites(),
      listMeetings(),
      listMatches(),
      listDirectory(),
    ]);
    await ensureProjectsForIntroducedMatches(matchRows as Parameters<typeof ensureProjectsForIntroducedMatches>[0]);
    const projectRows = await listProjects();
    setProjects(projectRows as ProjectRow[]);
    setInvites(inviteRows as InviteRow[]);
    setMeetings(meetingRows);
    setDirectory(directoryRows);
    setLoaded(true);
  }

  useEffect(() => {
    if (profile?.role !== "admin") return;
    void reload().catch(() => {
      setError("Projects could not be loaded.");
      setLoaded(true);
    });
  }, [profile?.role]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setAwardLink("");
    setBusy("create");
    try {
      const researchers = inviteGuests(draft.researchers);
      const seniors = inviteGuests(draft.seniors);
      inviteGuests([...researchers, ...seniors]);
      const created = await createAwardProject({ ...draft, researchers, seniors });
      const link = awardHref(created.awardId);
      setDraft({
        title: "",
        summary: "",
        researchArea: "",
        note: "",
        researchers: [{ name: "", email: "" }],
        seniors: [{ name: "", email: "" }],
      });
      setAdding(false);
      setAwardLink(link);
      setPrepared(
        created.invites.map((invite) =>
          projectJoinEmail({
            title: draft.title.trim(),
            person: named(invite.name, invite.email),
            role: invite.role,
            link: inviteHref(invite.token),
            award: true,
          }),
        ),
      );
      setNotice(
        created.invites.length > 0
          ? "TRI AI Saturdays Award project added. Send the invite email. Each person creates an account, then joins the project."
          : "TRI AI Saturdays Award project added. Add a researcher or a Senior Researcher to send an invite.",
      );
      const title = draft.title.trim();
      void ensureProjectDrive({
        projectId: created.projectId,
        title,
        people: [
          ...researchers.map((person) => ({ name: person.name, role: "Researcher" as const })),
          ...seniors.map((person) => ({ name: person.name, role: "Senior Researcher" as const })),
        ],
        documents: [
          { name: "Project overview", markdown: blocksToMarkdown(overviewBlocks({ title, status: "scoping", health: "green" })) },
          { name: "Project Charter", markdown: blocksToMarkdown(charterBlocks(title, { scope: "", roles: "", cadence: "", resources: "", integrity: "", authorship: "", release: "" }, false)) },
          { name: "Scoping notes", markdown: blocksToMarkdown(scopingNotesBlocks({ title })) },
        ],
      }).catch(() => undefined);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add this TRI AI Saturdays Award project.");
    } finally {
      setBusy("");
    }
  }

  async function copyAwardLink(awardId: string) {
    const link = awardHref(awardId);
    await navigator.clipboard.writeText(link).catch(() => undefined);
    setError("");
    setAwardLink(link);
    setNotice("TRI AI Saturdays Award invite link copied.");
  }

  async function onInvite(project: ProjectRow, role: "researcher" | "senior_researcher", people: Guest[]) {
    setError("");
    setNotice("");
    setBusy(`${project.id}:${role}`);
    try {
      const created = [];
      for (const person of people) created.push(await createProjectInvite(project, role, person));
      await reload();
      setPrepared(
        created.map((invite) =>
          projectJoinEmail({
            title: project.title || "Project",
            person: named(invite.name, invite.email),
            role: invite.role,
            link: inviteHref(invite.token),
            award: Boolean(project.awardId),
          }),
        ),
      );
      setNotice(`${roleLabel(role)} invite ready. Send the email. They create an account, then join the project.`);
      void ensureProjectDrive({
        projectId: project.id,
        title: project.title || "Project",
        people: people.map((person) => ({
          name: person.name,
          role: role === "senior_researcher" ? "Senior Researcher" as const : "Researcher" as const,
        })),
        documents: [],
      }).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the invite.");
    } finally {
      setBusy("");
    }
  }

  async function onScoped(project: ProjectRow, meetingId: string) {
    setError("");
    setNotice("");
    setBusy(`${project.id}:scoped`);
    try {
      await markProjectScoped(project.id, meetingId);
      await reload();
      setNotice(`${project.title || "Project"} is scoped.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark this project scoped.");
    } finally {
      setBusy("");
    }
  }

  async function onCharter(project: ProjectRow) {
    setError("");
    setNotice("");
    setBusy(`${project.id}:charter`);
    try {
      await markProjectCharterSigned(project.id);
      await reload();
      setNotice(`Project Charter recorded for ${project.title || "this project"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record the Project Charter.");
    } finally {
      setBusy("");
    }
  }

  async function onActivate(project: ProjectRow) {
    if (!project.scoped || !project.charterSigned) {
      setError("Scope the project and record the Project Charter first.");
      return;
    }
    setError("");
    setNotice("");
    setBusy(`${project.id}:active`);
    try {
      await activateProject(project.id);
      await reload();
      setNotice(`${project.title || "Project"} is now active.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not make this project active.");
    } finally {
      setBusy("");
    }
  }

  async function onRevoke(token: string) {
    setError("");
    setNotice("");
    setBusy(token);
    try {
      await revokeProjectInvite(token);
      await reload();
      setNotice("Invite link closed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not close the invite.");
    } finally {
      setBusy("");
    }
  }

  if (profile?.role !== "admin") {
    return <div className="empty">Only a TRI AI admin can send project invite links.</div>;
  }

  const views = [
    ["attention", "Needs a step", projects.filter(needsStep).length],
    ["scoping", "Scoping", projects.filter((project) => project.status === "scoping").length],
    ["active", "Active", projects.filter((project) => project.status === "active").length],
    ["all", "All", projects.length],
  ] as const;
  const visible = projects.filter((project) => {
    if (view === "attention") return needsStep(project);
    if (view === "scoping") return project.status === "scoping";
    if (view === "active") return project.status === "active";
    return true;
  });

  return (
    <div>
      <div className="project-overview-head">
        <div>
          <h2><Mark name="projects">Projects</Mark></h2>
        </div>
        {adding ? null : (
          <button className="btn btn-primary" type="button" onClick={() => setAdding(true)}>
            Add a TRI AI Saturdays Award project
          </button>
        )}
      </div>
      {adding ? (
        <form className="fields" onSubmit={(event) => void onCreate(event)}>
          <div className="archive-head">
            <h2><Mark name="award">Add a TRI AI Saturdays Award project</Mark></h2>
            <button className="btn btn-ghost btn-compact" type="button" onClick={() => setAdding(false)}>
              Close
            </button>
          </div>
          <p className="quiet">Add the researchers and a Senior Researcher by name and email.</p>
          <label>
            Title
            <input
              value={draft.title}
              required
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </label>
          <label>
            Summary
            <textarea
              value={draft.summary}
              onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
            />
          </label>
          <label>
            Research area
            <input
              value={draft.researchArea}
              onChange={(event) => setDraft({ ...draft, researchArea: event.target.value })}
            />
          </label>
          <label>
            Note for the researchers
            <textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} />
          </label>
          <GuestList
            legend="Researchers"
            people={draft.researchers}
            onChange={(researchers) => setDraft({ ...draft, researchers })}
          />
          <GuestList
            legend="Senior Researchers"
            people={draft.seniors}
            onChange={(seniors) => setDraft({ ...draft, seniors })}
          />
          <div className="button-row">
            <button className="btn btn-primary" type="submit" disabled={busy !== ""}>
              {busy === "create" ? "Adding…" : "Add project"}
            </button>
          </div>
        </form>
      ) : null}
      {notice ? (
        <div className="notice" style={{ marginTop: 16 }}>
          <p>{notice}</p>
          {awardLink && notice.includes("TRI AI Saturdays Award") ? (
            <p>
              Award page: <a href={awardLink}>{awardLink}</a>
            </p>
          ) : null}
          {prepared.map((draftMail) => (
            <EmailSupport key={`${draftMail.subject}:${draftMail.to.map((person) => person.email).join(",")}`} draft={draftMail} />
          ))}
        </div>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      {!loaded ? <Loader label="Loading projects" /> : null}
      {loaded && projects.length === 0 ? <div className="empty">No projects yet.</div> : null}
      {loaded && projects.length > 0 ? (
        <div className="view-switch" role="tablist" aria-label="Which projects to show">
          {views.map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
            >
              {label}
              <span className="count">{count}</span>
            </button>
          ))}
        </div>
      ) : null}
      {loaded && projects.length > 0 && visible.length === 0 ? (
        <div className="empty">No projects in this view.</div>
      ) : null}
      <div className="project-board">
        {visible.map((project) => {
          const openInvites = invites.filter(
            (invite) => invite.projectId === project.id && invite.status === "open",
          );
          const happened = latestHappened(project, meetings);
          const step = nextStep(project, meetings);
          const scoping = project.status === "scoping";
          return (
            <article className="card project-card" key={project.id}>
              <div className="project-card-head">
                <h3>
                  <Link to={`/dashboard/projects/${project.id}`}>{project.title || "Untitled project"}</Link>
                </h3>
                <div className="project-meta">
                  {project.researchArea ? <span className="quiet">{project.researchArea}</span> : null}
                  {project.awardId ? <span className="quiet">TRI AI Saturdays Award</span> : null}
                  {project.status ? <StatusChip status={project.status} /> : null}
                  <HealthMark health={project.health} />
                  {project.awardId ? (
                    <Link className="btn btn-ghost btn-compact" to={`/award/${project.awardId}`}>Award page</Link>
                  ) : null}
                </div>
              </div>
              <p className="quiet">Researchers: {roster(project.researchers, openInvites, "researcher")}</p>
              <p className="quiet">Senior Researchers: {roster(project.seniorResearchers, openInvites, "senior_researcher")}</p>
              <div className="next-step">
                <p><strong>{step.title}</strong></p>
                {step.detail ? <p className="quiet">{step.detail}</p> : null}
                <div className="actions">
                  {scoping && !project.scoped ? (
                    <button
                      className="btn btn-primary btn-compact"
                      type="button"
                      disabled={busy !== ""}
                      onClick={() => void onScoped(project, happened?.id || "")}
                    >
                      Mark as scoped
                    </button>
                  ) : null}
                  {scoping && project.scoped && !project.charterSigned ? (
                    <button
                      className="btn btn-primary btn-compact"
                      type="button"
                      disabled={busy !== ""}
                      onClick={() => void onCharter(project)}
                    >
                      Charter signed
                    </button>
                  ) : null}
                  {scoping && project.scoped && project.charterSigned ? (
                    <button
                      className="btn btn-primary btn-compact"
                      type="button"
                      disabled={busy !== ""}
                      onClick={() => void onActivate(project)}
                    >
                      Make active
                    </button>
                  ) : null}
                  <Link className="btn btn-ghost btn-compact" to={`/dashboard/projects/${project.id}`}>
                    Open project
                  </Link>
                </div>
              </div>
              <details className="fold">
                <summary>
                  Invites and email
                  {openInvites.length > 0 ? ` (${openInvites.length} open)` : ""}
                </summary>
                <div className="fold-body">
                  {project.awardId ? (
                    <p>
                      <button
                        className="btn btn-ghost btn-compact"
                        type="button"
                        disabled={busy !== ""}
                        onClick={() => void copyAwardLink(project.awardId || "")}
                      >
                        Copy award invite
                      </button>
                    </p>
                  ) : null}
                  <details className="fold">
                    <summary>Project email</summary>
                    <div className="fold-body">
                      <EmailSupport draft={projectMail(project, directory)} />
                    </div>
                  </details>
                  <InviteForm
                    legend="Invite a Researcher"
                    busy={busy !== ""}
                    onSubmit={(people) => onInvite(project, "researcher", people)}
                  />
                  <InviteForm
                    legend="Invite a Senior Researcher"
                    busy={busy !== ""}
                    onSubmit={(people) => onInvite(project, "senior_researcher", people)}
                  />
                  {openInvites.length > 0 ? (
                    <ul className="invite-list">
                      {openInvites.map((invite) => (
                        <li key={invite.id}>
                          <span>
                            {roleLabel(invite.role)}
                            {invite.guestName ? `: ${invite.guestName}` : ""}
                            {invite.guestEmail ? ` <${invite.guestEmail}>` : ""}
                          </span>
                          <span className="actions">
                            <a className="btn btn-ghost btn-compact" href={inviteHref(invite.id)}>
                              Open invite
                            </a>
                            <button
                              className="btn btn-ghost btn-compact"
                              type="button"
                              disabled={busy !== ""}
                              onClick={() => void onRevoke(invite.id)}
                            >
                              Close link
                            </button>
                          </span>
                          {joinDraft(invite) ? (
                            <details className="fold">
                              <summary>Email</summary>
                              <div className="fold-body">
                                <EmailSupport draft={joinDraft(invite)} />
                              </div>
                            </details>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="quiet">No open invite.</p>
                  )}
                  {scoping && !project.charterSigned && !project.scoped ? (
                    <p>
                      <button
                        className="btn btn-ghost btn-compact"
                        type="button"
                        disabled={busy !== ""}
                        onClick={() => void onCharter(project)}
                      >
                        Charter signed
                      </button>
                    </p>
                  ) : null}
                </div>
              </details>
            </article>
          );
        })}
      </div>
    </div>
  );
}
