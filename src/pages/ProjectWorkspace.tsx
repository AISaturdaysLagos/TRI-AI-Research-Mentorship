import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Icon, Mark, type IconName } from "../components/Icon";
import { ProjectBoard } from "../components/ProjectBoard";
import { Loader } from "../components/Loader";
import { HealthChoices, HealthMark, StatusChip } from "../components/StatusChip";
import {
  blocksToMarkdown,
  charterBlocks,
  ensureProjectDrive,
  milestoneBlocks,
  outputBlocks,
  overviewBlocks,
  progressBlocks,
  resourceBlocks,
  scopingNotesBlocks,
  updateFiledDocument,
} from "../lib/driveDocs";
import { projectDrive, rememberProjectFolder } from "../lib/projectDrive";
import { useAuth } from "../lib/auth";
import { activateProject, markProjectCharterSigned } from "../lib/records";
import {
  EMPTY_CHARTER,
  OUTPUT_STATUSES,
  OUTPUT_TYPES,
  PROJECT_STATUSES,
  RESOURCE_TYPES,
  addMilestone,
  addOutput,
  addProgress,
  addResource,
  decideResource,
  getCharter,
  getWorkspaceProject,
  listMilestones,
  saveProjectDrive,
  listOutputs,
  listProgress,
  listResources,
  saveCharter,
  saveProjectOverview,
  setMilestoneStatus,
  setOutputPublic,
  type CharterRecord,
  type MilestoneRecord,
  type OutputRecord,
  type ProgressRecord,
  type ResourceRecord,
  type WorkspaceProject,
} from "../lib/workspace";

function names(people?: { name?: string }[]) {
  const list = (people ?? []).map((person) => person.name).filter(Boolean);
  return list.length > 0 ? list.join(", ") : "—";
}

function linkOrBlank(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed;
  return null;
}

function Fold({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <details className="fold">
      <summary>{title}</summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}

function DocLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="with-icon" href={href}>
      <Icon name="document" />
      {children}
    </a>
  );
}

const PANELS = [
  ["work", "Work", "task"],
  ["overview", "Overview", "overview"],
  ["charter", "Charter", "charter"],
  ["milestones", "Milestones", "milestone"],
  ["progress", "Progress", "progress"],
  ["resources", "Resources", "resource"],
  ["outputs", "Outputs", "output"],
  ["drive", "Drive", "folder"],
] as const satisfies readonly (readonly [string, string, IconName])[];

type PanelId = (typeof PANELS)[number][0];

function isPanel(value: string | null): value is PanelId {
  return PANELS.some(([id]) => id === value);
}

export function ProjectWorkspacePage() {
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [project, setProject] = useState<WorkspaceProject | null>(null);
  const [charter, setCharter] = useState<CharterRecord>(EMPTY_CHARTER);
  const [milestones, setMilestones] = useState<MilestoneRecord[]>([]);
  const [updates, setUpdates] = useState<ProgressRecord[]>([]);
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [outputs, setOutputs] = useState<OutputRecord[]>([]);
  const [overview, setOverview] = useState({ question: "", contribution: "", year: "", health: "green", status: "scoping", publicShowcase: false });
  const [milestone, setMilestone] = useState({ title: "", ownerName: "", due: "", evidence: "" });
  const [progress, setProgress] = useState({ period: "", changes: "", evidence: "", blockers: "", nextStep: "", triAction: "" });
  const [resource, setResource] = useState({ type: "compute", request: "" });
  const [output, setOutput] = useState({ type: "report", title: "", status: "planned", link: "", venue: "", year: "" });
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState("");

  const admin = profile?.role === "admin";
  const member = Boolean(
    user && (admin || (project?.participantIds ?? []).includes(user.uid)),
  );

  async function reload() {
    const nextProject = await getWorkspaceProject(id);
    if (!nextProject) {
      setMissing(true);
      return;
    }
    setMissing(false);
    if (nextProject.driveFolderId) {
      rememberProjectFolder(
        id,
        {
          id: nextProject.driveFolderId,
          name: nextProject.title || "Project",
          url: nextProject.driveFolderUrl || `https://drive.google.com/drive/folders/${nextProject.driveFolderId}`,
        },
        nextProject.driveFiles ?? [],
      );
    }
    setProject(nextProject);
    setOverview({
      question: nextProject.question || "",
      contribution: nextProject.contribution || "",
      year: nextProject.year || "",
      health: nextProject.health || "green",
      status: nextProject.status || "scoping",
      publicShowcase: Boolean(nextProject.publicShowcase),
    });
    const allowed = profile?.role === "admin" || Boolean(user && (nextProject.participantIds ?? []).includes(user.uid));
    if (!allowed) {
      setCharter(EMPTY_CHARTER);
      setMilestones([]);
      setUpdates([]);
      setResources([]);
      setOutputs([]);
      return;
    }
    const [nextCharter, nextMilestones, nextUpdates, nextResources, nextOutputs] = await Promise.all([
      getCharter(id),
      listMilestones(id),
      listProgress(id),
      listResources(id),
      listOutputs(id),
    ]);
    setCharter(nextCharter);
    setMilestones(nextMilestones);
    setUpdates(nextUpdates);
    setResources(nextResources);
    setOutputs(nextOutputs);
    setLimits(Object.fromEntries(nextResources.map((item) => [item.id, item.limits || ""])));
    setDecisions(Object.fromEntries(nextResources.map((item) => [item.id, item.status || "requested"])));
    const people = [
      ...(nextProject.researchers ?? []).map((person) => ({ name: person.name || "", role: "Researcher" as const })),
      ...(nextProject.seniorResearchers ?? []).map((person) => ({ name: person.name || "", role: "Senior Researcher" as const })),
    ];
    const documents = [
      {
        name: "Project overview",
        markdown: blocksToMarkdown(overviewBlocks({
          title: nextProject.title || "Project",
          question: nextProject.question,
          contribution: nextProject.contribution,
          year: nextProject.year,
          health: nextProject.health,
          status: nextProject.status,
        })),
      },
      {
        name: "Project Charter",
        markdown: blocksToMarkdown(charterBlocks(nextProject.title || "Project", nextCharter, Boolean(nextProject.charterSigned))),
      },
    ];
    if (nextProject.awardId) {
      documents.push({
        name: "Scoping notes",
        markdown: blocksToMarkdown(scopingNotesBlocks({ title: nextProject.title || "Project" })),
      });
    }
    void ensureProjectDrive({
      projectId: id,
      title: nextProject.title || "Project",
      people,
      documents,
    }).then((drive) => {
      if (drive && drive.id && drive.id !== nextProject.driveFolderId) {
        return saveProjectDrive(id, drive);
      }
      return undefined;
    }).catch(() => undefined);
  }

  useEffect(() => {
    if (!id || !user || !profile) return;
    setNotice("");
    void reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load this project."));
  }, [id, user, profile]);

  async function run(key: string, action: () => Promise<void>, done: string, sync?: () => Promise<"updated" | "skipped">) {
    setError("");
    setNotice("");
    setBusy(key);
    try {
      await action();
      let suffix = "";
      if (sync) {
        try {
          const result = await sync();
          if (result !== "updated") suffix = " The document did not update.";
        } catch {
          suffix = " The document did not update.";
        }
      }
      await reload();
      setNotice(done + suffix);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this change.");
    } finally {
      setBusy("");
    }
  }

  if (!profile || !user) return null;
  if (missing) {
    return (
      <article>
        <section className="section-tight">
          <div className="container">
            <div className="empty">This project is not on your account.</div>
          </div>
        </section>
      </article>
    );
  }
  if (!project) {
    return (
      <article>
        <section className="section-tight">
          <div className="container">
            <Loader label="Loading project" />
            {error ? <p className="error">{error}</p> : null}
          </div>
        </section>
      </article>
    );
  }
  if (!member) {
    return (
      <article>
        <section className="section-tight">
          <div className="container">
            <div className="empty">This project workspace is for the people on the project and TRI AI.</div>
          </div>
        </section>
      </article>
    );
  }

  const charterReady = Boolean(charter.scope.trim() && charter.roles.trim() && charter.cadence.trim());
  const drive = projectDrive(project.id);
  const driveDoc = (name: string) => drive?.files.find((file) => file.kind === "document" && file.name === name);
  const charterFields = [
    ["scope", "Scope"],
    ["roles", "Roles"],
    ["cadence", "Cadence"],
    ["resources", "Resources"],
    ["integrity", "Integrity and risk"],
    ["authorship", "Authorship and IP"],
    ["release", "Release expectations"],
  ] as const;
  const requested = searchParams.get("panel");
  const panel: PanelId = isPanel(requested) ? requested : admin ? "overview" : "work";
  function showPanel(next: PanelId) {
    const query = new URLSearchParams(searchParams);
    query.set("panel", next);
    setSearchParams(query, { replace: true });
  }
  const openMilestones = milestones.filter((item) => (item.status || "open") !== "done");

  return (
    <article className="workspace">
      <header className="workspace-head">
        <div className="container">
          <div className="workspace-kicker">
            <p className="mono">{project.researchArea || "Project"}</p>
            <Link className="btn btn-ghost btn-compact" to="/dashboard">
              <Icon name="dashboard" />
              Dashboard
            </Link>
          </div>
          <div className="workspace-title">
            <div>
              <h1>{project.title || "Untitled project"}</h1>
              <p className="lede">{project.summary || "A summary has not been added yet."}</p>
            </div>
            <div className="workspace-status">
              <StatusChip status={project.status || "scoping"} />
              <HealthMark health={project.health} />
            </div>
          </div>
          <div className="workspace-people">
            <p className="with-icon"><Icon name="researcher" />Researchers: {names(project.researchers)}</p>
            <p className="with-icon"><Icon name="senior" />Senior Researchers: {names(project.seniorResearchers)}</p>
          </div>
          <nav className="workspace-nav" aria-label="Project workspace">
            {PANELS.map(([key, label, icon]) => {
              const count = key === "milestones" ? milestones.length
                : key === "progress" ? updates.length
                  : key === "resources" ? resources.length
                    : key === "outputs" ? outputs.length
                      : key === "drive" ? drive?.files.length
                        : null;
              return (
                <button key={key} type="button" aria-current={panel === key ? "page" : undefined} onClick={() => showPanel(key)}>
                  <Icon name={icon} />
                  {label}
                  {count != null ? <span className="count">{count}</span> : null}
                </button>
              );
            })}
          </nav>
        </div>
      </header>
      <section className="workspace-body">
        <div className="container">
          {notice ? <p className="notice">{notice}</p> : null}
          {error ? <p className="error">{error}</p> : null}

          {panel === "work" && user ? (
            member ? (
              <ProjectBoard
                projectId={project.id}
                proposalId={project.proposalId}
                researchers={project.researchers}
                seniorResearchers={project.seniorResearchers}
                uid={user.uid}
                displayName={profile?.displayName || ""}
                admin={admin}
              />
            ) : (
              <p className="quiet">This page is for people on the project.</p>
            )
          ) : null}

          {panel === "drive" ? (
          <div className="workspace-panel">
          <h2><Mark name="folder">Google Drive</Mark></h2>
            {drive ? (
              <>
                <p>
                  <a className="with-icon" href={drive.url}>
                    <Icon name="folder" />
                    Open this project in Google Drive
                  </a>
                </p>
                <ul className="drive-tiles">
                  {drive.files.map((file) => (
                    <li key={file.id}>
                      <a href={file.url}>
                        <Icon name={file.kind === "folder" ? "folder" : "document"} />
                        <span>{file.name}</span>
                        <span className="kind">{file.kind === "folder" ? "Folder" : "Google Doc"}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="quiet">No project folder yet.</p>
            )}
          </div>
          ) : null}

          {panel === "overview" ? (
          <div className="workspace-panel">
          <h2><Mark name="overview">Overview</Mark></h2>
          <div className="workspace-facts">
            <article>
              <p className="quiet">Research question</p>
              <p>{project.question || "A research question has not been recorded yet."}</p>
            </article>
            <article>
              <p className="quiet">Contribution</p>
              <p>{project.contribution || "A contribution has not been recorded yet."}</p>
              {project.year ? <p className="quiet">Year {project.year}</p> : null}
            </article>
          </div>
          <div className="workspace-glance">
            <button type="button" onClick={() => showPanel("charter")}>
              <Mark name="charter">Project Charter</Mark>
              <p>{project.charterSigned ? "Signed" : "Not signed yet"}</p>
              <p className="quiet">{charter.scope || "Scope has not been written yet."}</p>
            </button>
            <button type="button" onClick={() => showPanel("milestones")}>
              <Mark name="milestone">Milestones</Mark>
              <p>{openMilestones.length === 1 ? "1 open" : `${openMilestones.length} open`}</p>
              <p className="quiet">{openMilestones[0]?.title || "No open milestone."}</p>
            </button>
            <button type="button" onClick={() => showPanel("progress")}>
              <Mark name="progress">Progress</Mark>
              <p>{updates.length === 1 ? "1 update" : `${updates.length} updates`}</p>
              <p className="quiet">{updates[0]?.period || "No progress update yet."}</p>
            </button>
            <button type="button" onClick={() => showPanel("resources")}>
              <Mark name="resource">Resources</Mark>
              <p>{resources.length === 1 ? "1 request" : `${resources.length} requests`}</p>
              <p className="quiet">
                {resources.some((item) => item.status === "requested")
                  ? `${resources.filter((item) => item.status === "requested").length} waiting for a decision`
                  : resources[0]?.request || "No request yet."}
              </p>
            </button>
            <button type="button" onClick={() => showPanel("outputs")}>
              <Mark name="output">Outputs</Mark>
              <p>{outputs.length === 1 ? "1 output" : `${outputs.length} outputs`}</p>
              <p className="quiet">
                {outputs.filter((item) => item.public).length > 0
                  ? `${outputs.filter((item) => item.public).length} on the public research page`
                  : outputs[0]?.title || "No output yet."}
              </p>
            </button>
            <button type="button" onClick={() => showPanel("drive")}>
              <Mark name="folder">Google Drive</Mark>
              <p>{drive ? `${drive.files.length} files` : "No folder yet"}</p>
              <p className="quiet">{drive ? "Open the project folder." : "No project folder yet."}</p>
            </button>
          </div>
          {admin ? (
            <Fold title={<Mark name="overview">Edit overview</Mark>}>
              <form
                className="fields"
                onSubmit={(event: FormEvent) => {
                  event.preventDefault();
                  void run(
                    "overview",
                    () => saveProjectOverview(project.id, overview),
                    "Overview saved.",
                    () => updateFiledDocument(
                      project.id,
                      "Project overview",
                      overviewBlocks({ title: project.title || "Project", ...overview }),
                    ),
                  );
                }}
              >
                <label>
                  Research question
                  <textarea value={overview.question} onChange={(event) => setOverview({ ...overview, question: event.target.value })} />
                </label>
                <label>
                  Contribution
                  <textarea value={overview.contribution} onChange={(event) => setOverview({ ...overview, contribution: event.target.value })} />
                </label>
                <label>
                  Year
                  <input value={overview.year} onChange={(event) => setOverview({ ...overview, year: event.target.value })} />
                </label>
                <label>
                  Project health
                  <HealthChoices value={overview.health} onChange={(health) => setOverview({ ...overview, health })} />
                </label>
                <label>
                  Status
                  <select value={overview.status} onChange={(event) => setOverview({ ...overview, status: event.target.value })}>
                    {PROJECT_STATUSES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={overview.publicShowcase}
                    onChange={(event) => setOverview({ ...overview, publicShowcase: event.target.checked })}
                  />
                  <span>Keep this project on the public research page after it is no longer current.</span>
                </label>
                <div className="button-row">
                  <button className="btn btn-primary" type="submit" disabled={busy !== ""}>
                    {busy === "overview" ? "Saving…" : "Save overview"}
                  </button>
                </div>
              </form>
            </Fold>
          ) : null}
          </div>
          ) : null}

          {panel === "charter" ? (
          <div className="workspace-panel">
          <h2><Mark name="charter">Project Charter</Mark></h2>
          <p className="quiet">
            {project.charterSigned ? "Signed." : "Write the agreed scope."}
          </p>
          {driveDoc("Project Charter") ? (
            <p>
              <DocLink href={driveDoc("Project Charter")?.url || ""}>Project Charter in Google Drive</DocLink>
            </p>
          ) : null}
          <dl className="charter-read">
            {charterFields.map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{charter[key] || "—"}</dd>
              </div>
            ))}
          </dl>
          <Fold title={<Mark name="charter">Edit the Project Charter</Mark>}>
          <form
            className="fields"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              void run(
                "charter",
                () => saveCharter(project.id, charter, user.uid),
                "Project Charter saved.",
                () => updateFiledDocument(
                  project.id,
                  "Project Charter",
                  charterBlocks(project.title || "Project", charter, Boolean(project.charterSigned)),
                ),
              );
            }}
          >
            {charterFields.map(([key, label]) => (
              <label key={key}>
                {label}
                <textarea value={charter[key]} onChange={(event) => setCharter({ ...charter, [key]: event.target.value })} />
              </label>
            ))}
            <div className="button-row">
              <button className="btn btn-primary" type="submit" disabled={busy !== ""}>
                {busy === "charter" ? "Saving…" : "Save charter"}
              </button>
            </div>
          </form>
          </Fold>
          {admin && !project.charterSigned ? (
            <div className="button-row">
              <button
                className="btn btn-ghost"
                type="button"
                disabled={busy !== "" || !charterReady}
                onClick={() => void run(
                  "sign",
                  () => markProjectCharterSigned(project.id),
                  "Project Charter recorded as signed.",
                  () => updateFiledDocument(
                    project.id,
                    "Project Charter",
                    charterBlocks(project.title || "Project", charter, true),
                  ),
                )}
              >
                Charter signed
              </button>
              {project.status === "scoping" ? (
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={busy !== "" || !project.scoped || !project.charterSigned}
                  onClick={() => void run("active", () => activateProject(project.id), "This project is now active.")}
                >
                  Make active
                </button>
              ) : null}
            </div>
          ) : admin && project.status === "scoping" ? (
            <div className="button-row">
              <button
                className="btn btn-primary"
                type="button"
                disabled={busy !== "" || !project.scoped || !project.charterSigned}
                onClick={() => void run("active", () => activateProject(project.id), "This project is now active.")}
              >
                Make active
              </button>
            </div>
          ) : null}
          </div>
          ) : null}

          {panel === "milestones" ? (
          <div className="workspace-panel">
          <h2><Mark name="milestone">Milestones</Mark></h2>
          {milestones.length === 0 ? <p className="quiet">No milestones yet.</p> : null}
          <div className="record-grid">
            {milestones.map((item) => (
              <article className="notice" key={item.id}>
                <h3>{item.title}</h3>
                <p className="quiet">
                  {item.ownerName || "Unassigned"}
                  {item.due ? ` · due ${item.due}` : ""}
                </p>
                {driveDoc(`Milestone — ${item.title}`) ? (
                  <p>
                    <DocLink href={driveDoc(`Milestone — ${item.title}`)?.url || ""}>Google Doc</DocLink>
                  </p>
                ) : null}
                <p>
                  <StatusChip status={item.status || "open"} />
                </p>
                {item.evidence ? (
                  <p>
                    <a href={item.evidence}>{item.evidence}</a>
                  </p>
                ) : null}
                <button
                  className="btn btn-ghost btn-compact"
                  type="button"
                  disabled={busy !== ""}
                  onClick={() => {
                    const status = item.status === "done" ? "open" : "done";
                    void run(
                      item.id,
                      () => setMilestoneStatus(project.id, item.id, status),
                      status === "done" ? "Milestone marked done." : "Milestone reopened.",
                      () => updateFiledDocument(
                        project.id,
                        `Milestone — ${item.title}`,
                        milestoneBlocks(project.title || "Project", { ...item, status }),
                      ),
                    );
                  }}
                >
                  {item.status === "done" ? "Reopen" : "Mark done"}
                </button>
              </article>
            ))}
          </div>
          <Fold title={<Mark name="milestone">Add a milestone</Mark>}>
          <form
            className="fields"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              const evidence = linkOrBlank(milestone.evidence);
              if (evidence === null) {
                setError("Use a link that starts with https://.");
                return;
              }
              const next = { ...milestone, evidence, status: "open" };
              void run(
                "milestone",
                async () => {
                  await addMilestone(project.id, { ...milestone, evidence }, user.uid);
                  setMilestone({ title: "", ownerName: profile.displayName || "", due: "", evidence: "" });
                },
                "Milestone added.",
                () => updateFiledDocument(
                  project.id,
                  `Milestone — ${next.title}`,
                  milestoneBlocks(project.title || "Project", next),
                ),
              );
            }}
          >
            <label>
              Milestone
              <input required value={milestone.title} onChange={(event) => setMilestone({ ...milestone, title: event.target.value })} />
            </label>
            <label>
              Owner
              <input
                required
                value={milestone.ownerName}
                onChange={(event) => setMilestone({ ...milestone, ownerName: event.target.value })}
              />
            </label>
            <label>
              Due date
              <input type="date" value={milestone.due} onChange={(event) => setMilestone({ ...milestone, due: event.target.value })} />
            </label>
            <label>
              Evidence link
              <input value={milestone.evidence} onChange={(event) => setMilestone({ ...milestone, evidence: event.target.value })} />
            </label>
            <div className="button-row">
              <button className="btn btn-primary" type="submit" disabled={busy !== ""}>
                Add milestone
              </button>
            </div>
          </form>
          </Fold>
          </div>
          ) : null}

          {panel === "progress" ? (
          <div className="workspace-panel">
          <h2><Mark name="progress">Progress updates</Mark></h2>
          {updates.length === 0 ? <p className="quiet">No progress updates yet.</p> : null}
          <div className="record-grid">
            {updates.map((item) => (
              <article className="notice" key={item.id}>
                <h3>{item.period || "Update"}</h3>
                {driveDoc(`Progress update — ${item.period}`) ? (
                  <p>
                    <DocLink href={driveDoc(`Progress update — ${item.period}`)?.url || ""}>Google Doc</DocLink>
                  </p>
                ) : null}
                {item.changes ? <p>{item.changes}</p> : null}
                {item.evidence ? <p className="quiet">Evidence: {item.evidence}</p> : null}
                {item.blockers ? <p className="quiet">Blockers: {item.blockers}</p> : null}
                {item.nextStep ? <p className="quiet">Next: {item.nextStep}</p> : null}
                {item.triAction ? <p className="quiet">TRI AI: {item.triAction}</p> : null}
              </article>
            ))}
          </div>
          <Fold title={<Mark name="progress">Add a progress update</Mark>}>
          <form
            className="fields"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              const next = { ...progress };
              void run(
                "progress",
                async () => {
                  await addProgress(project.id, progress, user.uid);
                  setProgress({ period: "", changes: "", evidence: "", blockers: "", nextStep: "", triAction: "" });
                },
                "Progress update added.",
                () => updateFiledDocument(
                  project.id,
                  `Progress update — ${next.period}`,
                  progressBlocks(project.title || "Project", next),
                ),
              );
            }}
          >
            <label>
              Period
              <input required value={progress.period} onChange={(event) => setProgress({ ...progress, period: event.target.value })} />
            </label>
            <label>
              What changed
              <textarea value={progress.changes} onChange={(event) => setProgress({ ...progress, changes: event.target.value })} />
            </label>
            <label>
              Evidence
              <textarea value={progress.evidence} onChange={(event) => setProgress({ ...progress, evidence: event.target.value })} />
            </label>
            <label>
              Blockers
              <textarea value={progress.blockers} onChange={(event) => setProgress({ ...progress, blockers: event.target.value })} />
            </label>
            <label>
              Next milestone
              <textarea value={progress.nextStep} onChange={(event) => setProgress({ ...progress, nextStep: event.target.value })} />
            </label>
            <label>
              Action TRI AI needs to take
              <textarea value={progress.triAction} onChange={(event) => setProgress({ ...progress, triAction: event.target.value })} />
            </label>
            <div className="button-row">
              <button className="btn btn-primary" type="submit" disabled={busy !== ""}>
                Add update
              </button>
            </div>
          </form>
          </Fold>
          </div>
          ) : null}

          {panel === "resources" ? (
          <div className="workspace-panel">
          <h2><Mark name="resource">Resources</Mark></h2>
          {resources.length === 0 ? <p className="quiet">No resource requests yet.</p> : null}
          <div className="record-grid">
            {resources.map((item) => (
              <article className="notice" key={item.id}>
                <h3>{RESOURCE_TYPES.find(([value]) => value === item.type)?.[1] || "Resource"}</h3>
                <p>{item.request}</p>
                {driveDoc(`Resource request — ${RESOURCE_TYPES.find(([value]) => value === item.type)?.[1] || "Resource"}`) ? (
                  <p>
                    <DocLink href={driveDoc(`Resource request — ${RESOURCE_TYPES.find(([value]) => value === item.type)?.[1] || "Resource"}`)?.url || ""}>Google Doc</DocLink>
                  </p>
                ) : null}
                <p>
                  <StatusChip status={item.status || "requested"} />
                </p>
                {item.limits ? <p className="quiet">Limits: {item.limits}</p> : null}
                {admin ? (
                  <Fold title={<Mark name="review">Record a decision</Mark>}>
                  <form
                    className="fields"
                    onSubmit={(event: FormEvent) => {
                      event.preventDefault();
                      const status = decisions[item.id] || "requested";
                      const limit = limits[item.id] || "";
                      void run(
                        item.id,
                        () => decideResource(project.id, item.id, status, limit),
                        "Resource decision saved.",
                        () => updateFiledDocument(
                          project.id,
                          `Resource request — ${RESOURCE_TYPES.find(([value]) => value === item.type)?.[1] || "Resource"}`,
                          resourceBlocks(project.title || "Project", { ...item, status, limits: limit }),
                        ),
                      );
                    }}
                  >
                    <label>
                      Decision
                      <select
                        value={decisions[item.id] || "requested"}
                        onChange={(event) => setDecisions({ ...decisions, [item.id]: event.target.value })}
                      >
                        <option value="requested">Requested</option>
                        <option value="approved">Approved</option>
                        <option value="partial">Partially approved</option>
                        <option value="declined">Declined</option>
                      </select>
                    </label>
                    <label>
                      Limits
                      <input value={limits[item.id] || ""} onChange={(event) => setLimits({ ...limits, [item.id]: event.target.value })} />
                    </label>
                    <div className="button-row">
                      <button className="btn btn-ghost btn-compact" type="submit" disabled={busy !== ""}>
                        Save decision
                      </button>
                    </div>
                  </form>
                  </Fold>
                ) : null}
              </article>
            ))}
          </div>
          <Fold title={<Mark name="resource">Request a resource</Mark>}>
          <form
            className="fields"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              const next = { ...resource, status: "requested", limits: "" };
              void run(
                "resource",
                async () => {
                  await addResource(project.id, resource, user.uid);
                  setResource({ type: "compute", request: "" });
                },
                "Resource request added.",
                () => updateFiledDocument(
                  project.id,
                  `Resource request — ${RESOURCE_TYPES.find(([value]) => value === next.type)?.[1] || "Resource"}`,
                  resourceBlocks(project.title || "Project", next),
                ),
              );
            }}
          >
            <label>
              Type
              <select value={resource.type} onChange={(event) => setResource({ ...resource, type: event.target.value })}>
                {RESOURCE_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Request
              <textarea required value={resource.request} onChange={(event) => setResource({ ...resource, request: event.target.value })} />
            </label>
            <div className="button-row">
              <button className="btn btn-primary" type="submit" disabled={busy !== ""}>
                Request resource
              </button>
            </div>
          </form>
          </Fold>
          </div>
          ) : null}

          {panel === "outputs" ? (
          <div className="workspace-panel">
          <h2><Mark name="output">Outputs</Mark></h2>
          {outputs.length === 0 ? <p className="quiet">No outputs yet.</p> : null}
          <div className="record-grid">
            {outputs.map((item) => (
              <article className="notice" key={item.id}>
                <h3>{item.title}</h3>
                {driveDoc(`Output — ${item.title}`) ? (
                  <p>
                    <DocLink href={driveDoc(`Output — ${item.title}`)?.url || ""}>Google Doc</DocLink>
                  </p>
                ) : null}
                <p className="quiet">
                  {OUTPUT_TYPES.find(([value]) => value === item.type)?.[1] || "Output"}
                  {item.venue ? ` · ${item.venue}` : ""}
                  {item.year ? ` · ${item.year}` : ""}
                </p>
                <p>
                  <StatusChip status={item.status || "planned"} />
                  {item.public ? " · On the public research page" : ""}
                </p>
                {item.link ? (
                  <p>
                    <a href={item.link}>{item.link}</a>
                  </p>
                ) : null}
                {admin ? (
                  <button
                    className="btn btn-ghost btn-compact"
                    type="button"
                    disabled={busy !== ""}
                    onClick={() => {
                      const isPublic = !item.public;
                      void run(
                        item.id,
                        () => setOutputPublic(project.id, item.id, isPublic),
                        isPublic ? "Output added to the public page." : "Output removed from the public page.",
                        () => updateFiledDocument(
                          project.id,
                          `Output — ${item.title}`,
                          outputBlocks(project.title || "Project", { ...item, public: isPublic }),
                        ),
                      );
                    }}
                  >
                    {item.public ? "Hide from the public page" : "Show on the public page"}
                  </button>
                ) : null}
              </article>
            ))}
          </div>
          <Fold title={<Mark name="output">Add an output</Mark>}>
          <form
            className="fields"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              const link = linkOrBlank(output.link);
              if (link === null) {
                setError("Use a link that starts with https://.");
                return;
              }
              const next = { ...output, link, public: false };
              void run(
                "output",
                async () => {
                  await addOutput(project.id, { ...output, link }, user.uid);
                  setOutput({ type: "report", title: "", status: "planned", link: "", venue: "", year: overview.year });
                },
                "Output added. TRI AI chooses when it appears on the public page.",
                () => updateFiledDocument(
                  project.id,
                  `Output — ${next.title}`,
                  outputBlocks(project.title || "Project", next),
                ),
              );
            }}
          >
            <label>
              Type
              <select value={output.type} onChange={(event) => setOutput({ ...output, type: event.target.value })}>
                {OUTPUT_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Title
              <input required value={output.title} onChange={(event) => setOutput({ ...output, title: event.target.value })} />
            </label>
            <label>
              Status
              <select value={output.status} onChange={(event) => setOutput({ ...output, status: event.target.value })}>
                {OUTPUT_STATUSES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Link
              <input value={output.link} onChange={(event) => setOutput({ ...output, link: event.target.value })} />
            </label>
            <label>
              Venue
              <input value={output.venue} onChange={(event) => setOutput({ ...output, venue: event.target.value })} />
            </label>
            <label>
              Year
              <input value={output.year} onChange={(event) => setOutput({ ...output, year: event.target.value })} />
            </label>
            <div className="button-row">
              <button className="btn btn-primary" type="submit" disabled={busy !== ""}>
                Add output
              </button>
            </div>
          </form>
          </Fold>
          </div>
          ) : null}
        </div>
      </section>
    </article>
  );
}
