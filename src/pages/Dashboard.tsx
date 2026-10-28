import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { EmailSupport } from "../components/EmailSupport";
import { Loader } from "../components/Loader";
import { matchResponseEmail, named, returnedDocumentEmail, revisedProposalEmail } from "../lib/email";
import { returnFoldersFor } from "../lib/returns";
import { ProposalRead } from "../components/ProposalRead";
import { StatusChip } from "../components/StatusChip";
import { Icon, Mark } from "../components/Icon";
import { WorkspaceTabs } from "../components/WorkspaceTabs";
import { useAuth } from "../lib/auth";
import {
  expressMatchInterest,
  joinScopingProjectIfInterested,
  listMatches,
  listParticipantProjects,
  listPendingInvitesForEmail,
  listResearcherProposals,
  listResearchProjects,
  projectProposalIds,
  respondToMatch,
  settledMatchProposalIds,
} from "../lib/records";
import { MATCH_RESPONSES, projectTypeLabel, type MatchResponse } from "../types/domain";
import { userFacingError } from "../lib/errors";
import { prefetchParticipantWorkspace } from "../lib/prefetchWorkspace";
import { peekRead, reads } from "../lib/readCache";
import { SearchSelect } from "../components/SearchSelect";

type Person = { uid?: string; name?: string };

type PendingInvite = {
  id: string;
  projectId?: string;
  projectTitle?: string;
  role?: string;
  awardId?: string;
  guestName?: string;
};

type ProjectRow = {
  id: string;
  title?: string;
  status?: string;
  researchArea?: string;
  scoped?: boolean;
  charterSigned?: boolean;
  proposalId?: string;
  awardId?: string;
  researchers?: Person[];
  seniorResearchers?: Person[];
};

function personNames(people?: Person[]) {
  const names = (people ?? []).map((person) => person.name).filter(Boolean);
  return names.length > 0 ? names.join(", ") : "—";
}

type Row = {
  id: string;
  title?: string;
  status?: string;
  route?: string;
  researchArea?: string;
  response?: string;
  introduction?: string;
  summary?: string;
  question?: string;
  africaRelevance?: string;
  contribution?: string;
  researcherName?: string;
  readiness?: string;
  methodology?: string;
  data?: string;
  evaluation?: string;
  timeline?: string;
  mentorNeed?: string;
  note?: string;
  responseNote?: string;
  mentorId?: string;
  mentorName?: string;
  proposalId?: string;
  fitScore?: number;
  invited?: boolean;
};

type MatchCard = Row & {
  sentToYou: boolean;
  ownMatchId?: string;
};

function proposalMatchRequests(rows: Row[], projectIds: Set<string>, uid: string) {
  const byProposal = new Map<string, Row[]>();
  for (const row of rows) {
    if (!row.proposalId || projectIds.has(row.proposalId)) continue;
    const group = byProposal.get(row.proposalId) ?? [];
    group.push(row);
    byProposal.set(row.proposalId, group);
  }
  const cards: MatchCard[] = [];
  for (const [proposalId, group] of byProposal) {
    const sent = group.find((row) => row.mentorId === uid && row.invited !== false);
    const own = group.find((row) => row.mentorId === uid);
    const source = sent ?? group.find((row) => row.invited !== false) ?? group[0];
    cards.push({
      ...source,
      proposalId,
      sentToYou: Boolean(sent),
      fitScore: sent?.fitScore ?? 0,
      note: sent?.note ?? "",
      ownMatchId: own?.id,
      response: own?.response,
      responseNote: own?.responseNote ?? "",
    });
  }
  cards.sort((left, right) => {
    if (left.sentToYou !== right.sentToYou) return left.sentToYou ? -1 : 1;
    if (left.sentToYou && right.sentToYou) return (right.fitScore ?? 0) - (left.fitScore ?? 0);
    return (left.title || "").localeCompare(right.title || "");
  });
  return cards;
}

function warmParticipant(role: string, uid: string, email: string) {
  const projects = peekRead<ProjectRow[]>(reads.participantProjects(uid));
  const programme = peekRead<{ id?: string; proposalId?: string; status?: string; participantIds?: string[] }[]>(
    reads.researchProjects,
  );
  const invites = peekRead<PendingInvite[]>(reads.pendingInvites(email, uid));
  if (!projects || !programme || !invites) return undefined;
  if (role === "researcher") {
    const items = peekRead<MatchCard[]>(reads.researcherProposals(uid));
    if (!items) return undefined;
    const matched = projectProposalIds([...projects, ...programme]);
    return {
      rows: items.filter((row) => !matched.has(row.id)),
      projects,
      invites: invites.filter((invite) => (invite.role || "researcher") === "researcher"),
    };
  }
  if (role !== "senior_researcher") return undefined;
  const items = peekRead<Row[]>(reads.matches);
  if (!items) return undefined;
  return {
    rows: proposalMatchRequests(items, settledMatchProposalIds([...projects, ...programme], uid), uid),
    projects,
    invites: invites.filter((invite) => invite.role === "senior_researcher"),
  };
}

function ProjectList({
  projects,
  stacked = false,
  personName,
  email,
  uid,
}: {
  projects: ProjectRow[];
  stacked?: boolean;
  personName: string;
  email: string;
  uid: string;
}) {
  return (
    <>
      <h2 style={{ marginTop: stacked ? 28 : 0 }}><Mark name="projects">Projects</Mark></h2>
      {projects.length === 0 ? (
        <div className="empty empty-with-action">
          <p>No projects are linked to this account yet.</p>
          <Link className="btn btn-primary btn-compact" to="/apply/researcher">
            <Icon name="apply" />
            Submit a proposal
          </Link>
        </div>
      ) : (
        <div className="record-grid">
          {projects.map((project) => (
            <article key={project.id} className="card">
              <p className="mono">{projectTypeLabel(project)}</p>
              <h3>{project.title || "Untitled project"}</h3>
              {project.researchArea ? <p className="quiet">{project.researchArea}</p> : null}
              <p>{project.status ? <StatusChip status={project.status} /> : "—"}</p>
              {project.researchers?.length ? <p className="quiet">Researchers: {personNames(project.researchers)}</p> : null}
              {project.seniorResearchers?.length ? (
                <p className="quiet">Senior Researchers: {personNames(project.seniorResearchers)}</p>
              ) : null}
              {project.scoped ? <p className="quiet">Scoping meeting recorded.</p> : null}
              {project.charterSigned ? <p className="quiet">Project Charter signed.</p> : null}
              <p>
                <Link className="btn btn-primary btn-compact" to={`/dashboard/projects/${project.id}`}>
                  <Icon name="projects" />
                  Open project
                </Link>
              </p>
              {[...(project.researchers ?? []), ...(project.seniorResearchers ?? [])].some((person) => person.uid === uid)
              || returnFoldersFor(project.proposalId || project.id).some((folder) => folder.uid === uid) ? (
                <EmailSupport
                  label="Email TRI AI"
                  draft={returnedDocumentEmail({
                    title: project.title || "Untitled project",
                    person: named(personName, email),
                    recordId: project.proposalId || project.id,
                    documentName: project.charterSigned ? "progress update" : "Project Charter",
                  })}
                />
              ) : null}
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function MatchRequestList({
  rows,
  fitFilter,
  onFitFilter,
  notes,
  onNote,
  onRespond,
  error,
  mailFor,
  responseMail,
}: {
  rows: MatchCard[];
  fitFilter: string;
  onFitFilter: (value: string) => void;
  notes: Record<string, string>;
  onNote: (proposalId: string, note: string) => void;
  onRespond: (card: MatchCard, response: Exclude<MatchResponse, "pending">) => void;
  error: string;
  mailFor: string;
  responseMail: ReturnType<typeof matchResponseEmail> | null;
}) {
  const sent = rows.filter(
    (row) => row.sentToYou && (fitFilter === "all" || (row.fitScore ?? 0) >= Number(fitFilter)),
  );
  const open = rows.filter((row) => !row.sentToYou);
  return (
    <>
      <h2><Mark name="match">Match requests</Mark></h2>
      <p className="quiet">Requests sent to you are listed first.</p>
      <div className="filters">
        <SearchSelect
          label="Show"
          options={[
            { value: "all", label: "All match requests" },
            { value: "15", label: "Sent to you, fit 15 / 25 or higher" },
            { value: "20", label: "Sent to you, fit 20 / 25 or higher" },
          ]}
          value={fitFilter}
          onChange={onFitFilter}
          placeholder="Filter matches…"
        />
      </div>
      {error ? <p className="error">{error}</p> : null}
      {rows.length === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>
          No proposals are open for matching.
        </div>
      ) : (
        <>
          <h3 className="match-group">Sent to you</h3>
          {sent.length === 0 ? (
            <div className="empty">No requests sent to you{fitFilter === "all" ? "" : " at this fit"}.</div>
          ) : (
            sent.map((row) => (
              <MatchRequestCard
                key={row.proposalId || row.id}
                row={row}
                note={notes[row.proposalId || ""] ?? row.responseNote ?? ""}
                onNote={onNote}
                onRespond={onRespond}
                mail={mailFor === row.proposalId ? responseMail : null}
              />
            ))
          )}
          <h3 className="match-group">Others</h3>
          {open.length === 0 ? (
            <div className="empty">No other proposals are open for matching.</div>
          ) : (
            open.map((row) => (
              <MatchRequestCard
                key={row.proposalId || row.id}
                row={row}
                note={notes[row.proposalId || ""] ?? row.responseNote ?? ""}
                onNote={onNote}
                onRespond={onRespond}
                mail={mailFor === row.proposalId ? responseMail : null}
              />
            ))
          )}
        </>
      )}
    </>
  );
}

function MatchRequestCard({
  row,
  note,
  onNote,
  onRespond,
  mail,
}: {
  row: MatchCard;
  note: string;
  onNote: (proposalId: string, note: string) => void;
  onRespond: (card: MatchCard, response: Exclude<MatchResponse, "pending">) => void;
  mail: ReturnType<typeof matchResponseEmail> | null;
}) {
  return (
    <article className={row.sentToYou ? "opportunity is-sent" : "opportunity"}>
      <p className="mono">
        {row.sentToYou ? `Sent to you · Fit ${row.fitScore ?? 0} / 25` : "Others"}
      </p>
      <h3>{row.title || "Untitled proposal"}</h3>
      <ProposalRead
        sections={[
          {
            fields: [
              { label: "Executive summary", value: row.summary || "" },
              { label: "Research question", value: row.question || "" },
              {
                label: "Area and African context",
                value: [row.researchArea, row.africaRelevance].filter(Boolean).join("\n\n"),
              },
              { label: "Expected contribution", value: row.contribution || "" },
              {
                label: "Researcher",
                value: [row.researcherName, row.readiness].filter(Boolean).join("\n\n"),
              },
              {
                label: "Method, data, evaluation, duration",
                value: [
                  row.methodology,
                  row.data ? `Data: ${row.data}` : "",
                  row.evaluation ? `Evaluation: ${row.evaluation}` : "",
                  row.timeline,
                ]
                  .filter(Boolean)
                  .join("\n\n"),
              },
              { label: "Senior Researcher expertise needed", value: row.mentorNeed || "" },
            ],
          },
        ]}
      />
      {row.sentToYou && row.note ? <p className="quiet">Note from TRI AI: {row.note}</p> : null}
      <p>
        Your response: <StatusChip status={row.response || "pending"} />
      </p>
      <form className="fields" onSubmit={(event) => event.preventDefault()}>
        <label>
          Note with your response
          <textarea value={note} onChange={(event) => onNote(row.proposalId || "", event.target.value)} />
        </label>
        <div className="decision-row">
          {MATCH_RESPONSES.map((item) => (
            <button key={item.value} className="btn btn-primary" type="button" onClick={() => onRespond(row, item.value)}>
              {item.label}
            </button>
          ))}
        </div>
      </form>
      {mail ? <EmailSupport label="Response email" draft={mail} autoOpen /> : null}
    </article>
  );
}

export function DashboardPage() {
  const { user, profile } = useAuth();
  const role = profile?.role === "researcher" || profile?.role === "senior_researcher" ? profile.role : null;
  if (user && role) prefetchParticipantWorkspace(role, user.uid, user.email || "");
  const warm = user && role ? warmParticipant(role, user.uid, user.email || "") : undefined;
  const [rows, setRows] = useState<MatchCard[]>(() => warm?.rows ?? []);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(() => warm?.invites ?? []);
  const [projects, setProjects] = useState<ProjectRow[]>(() => warm?.projects ?? []);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [responseMail, setResponseMail] = useState<ReturnType<typeof matchResponseEmail> | null>(null);
  const [mailFor, setMailFor] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(() => warm !== undefined);
  const [params] = useSearchParams();
  const tab = params.get("tab") === "records" ? "records" : "projects";
  const [fitFilter, setFitFilter] = useState("all");

  useEffect(() => {
    if (!user || !profile) return;
    if (profile.role !== "researcher" && profile.role !== "senior_researcher") return;
    const invites = listPendingInvitesForEmail(user.email || "", user.uid).catch(() => []);
    if (profile.role === "researcher") {
      Promise.all([
        listResearcherProposals(user.uid),
        listParticipantProjects(user.uid),
        listResearchProjects(),
        invites,
      ])
        .then(([items, projectRows, programmeProjects, inviteRows]) => {
          const matched = projectProposalIds([
            ...(projectRows as { id?: string; proposalId?: string }[]),
            ...(programmeProjects as { id?: string; proposalId?: string }[]),
          ]);
          setRows((items as MatchCard[]).filter((row) => !matched.has(row.id)));
          setProjects(projectRows as ProjectRow[]);
          setPendingInvites(
            (inviteRows as PendingInvite[]).filter((invite) => (invite.role || "researcher") === "researcher"),
          );
        })
        .catch(() => {
          setRows([]);
          setProjects([]);
          setPendingInvites([]);
        })
        .finally(() => setLoaded(true));
    }
    if (profile.role === "senior_researcher") {
      Promise.all([
        listMatches(),
        listParticipantProjects(user.uid),
        listResearchProjects(),
        invites,
      ])
        .then(async ([items, projectRows, programmeProjects, inviteRows]) => {
          setProjects(projectRows as ProjectRow[]);
          setPendingInvites(
            (inviteRows as PendingInvite[]).filter((invite) => invite.role === "senior_researcher"),
          );
          setRows(
            proposalMatchRequests(
              items as Row[],
              settledMatchProposalIds(
                [
                  ...(projectRows as { id?: string; proposalId?: string; status?: string; participantIds?: string[] }[]),
                  ...(programmeProjects as { id?: string; proposalId?: string; status?: string; participantIds?: string[] }[]),
                ],
                user.uid,
              ),
              user.uid,
            ),
          );
        })
        .catch((err: unknown) => {
          setRows([]);
          setProjects([]);
          setPendingInvites([]);
          setError(userFacingError(err, "Could not load match requests."));
        })
        .finally(() => setLoaded(true));
    }
  }, [profile, user]);

  async function respond(card: MatchCard, response: Exclude<MatchResponse, "pending">) {
    if (!user || !card.proposalId) return;
    setError("");
    const note = notes[card.proposalId] ?? card.responseNote ?? "";
    const mentorName = profile?.displayName || user.email || "Senior Researcher";
    try {
      const ownMatchId = card.ownMatchId
        ? card.ownMatchId
        : await expressMatchInterest({
            proposalId: card.proposalId,
            mentorId: user.uid,
            mentorName,
            response,
            responseNote: note,
            proposal: card,
          });
      if (card.ownMatchId) await respondToMatch(card.ownMatchId, response, note);
      const joined = await joinScopingProjectIfInterested({
        matchId: ownMatchId,
        proposalId: card.proposalId,
        mentorId: user.uid,
        mentorName,
        response,
        title: card.title,
      });
      setMailFor(card.proposalId);
      setResponseMail(
        matchResponseEmail({
          title: card.title || "Untitled proposal",
          senior: named(mentorName, user.email || ""),
          response,
          note,
        }),
      );
      if (joined) {
        setRows((current) => current.filter((item) => item.proposalId !== card.proposalId));
        const projectRows = await listParticipantProjects(user.uid);
        setProjects(projectRows as ProjectRow[]);
      } else {
        setRows((current) =>
          current.map((item) =>
            item.proposalId === card.proposalId ? { ...item, ownMatchId, response, responseNote: note } : item,
          ),
        );
      }
    } catch (err) {
      setError(userFacingError(err, "Could not save your response."));
    }
  }

  if (!profile || !user) return null;
  if (profile.role === "admin" || profile.role === "reviewer") return <Navigate to="/admin" replace />;

  return (
    <article>
      <header className="page-intro work">
        <div className="container">
          <p className="mono">{profile.role.replaceAll("_", " ")}</p>
          <h1>{profile.displayName || "Your dashboard"}</h1>
          <p className="lede">Projects, proposals, and meetings.</p>
        </div>
      </header>
      <section className="section-tight">
        <div className="container">
          <div>
            <WorkspaceTabs current={tab} />
            {!loaded ? <Loader label="Loading your records" /> : null}
            {loaded && profile.role === "researcher" && tab === "projects" && pendingInvites.length > 0 ? (
              <>
                <h2><Mark name="award">Open invites</Mark></h2>
                <div className="record-grid">
                  {pendingInvites.map((invite) => (
                    <article key={invite.id} className="card">
                      <p className="mono">{projectTypeLabel(invite)}</p>
                      <h3>{invite.projectTitle || "Untitled project"}</h3>
                      <p className="quiet">You are invited as a Researcher{invite.guestName ? ` (${invite.guestName})` : ""}.</p>
                      <p>
                        <Link className="btn btn-primary btn-compact" to={`/join/${invite.id}`}>
                          Open this invite
                        </Link>
                      </p>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
            {loaded && profile.role === "researcher" && tab === "records" ? (
              <>
                <h2><Mark name="document">Your proposals</Mark></h2>
                {rows.length === 0 ? (
                  <div className="empty" style={{ marginTop: 16 }}>
                    No proposals yet.{" "}
                    <Link className="btn btn-primary btn-compact" to="/apply/researcher">Start a proposal</Link>.
                  </div>
                ) : (
                  <div className="table-wrap" style={{ marginTop: 16 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Area</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.id}>
                            <td>
                              {row.route === "saturdays" ? (
                                row.title || "Untitled"
                              ) : (
                                <Link className="btn btn-ghost btn-compact" to={`/dashboard/application?proposal=${row.id}`}>
                                  {row.title || "Untitled"}
                                </Link>
                              )}
                            </td>
                            <td>{row.researchArea || "—"}</td>
                            <td>{row.status ? <StatusChip status={row.status} /> : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {rows
                      .filter((row) => row.status === "revise")
                      .map((row) => (
                        <EmailSupport
                          key={row.id}
                          label="Revision email"
                          draft={revisedProposalEmail({
                            title: row.title || "Untitled proposal",
                            researcher: named(profile.displayName || "", user.email || ""),
                            recordId: row.id,
                          })}
                        />
                      ))}
                  </div>
                )}
              </>
            ) : null}
            {loaded && profile.role === "researcher" && tab === "projects" ? (
              <ProjectList
                projects={projects}
                stacked={pendingInvites.length > 0}
                personName={profile.displayName || ""}
                email={user.email || ""}
                uid={user.uid}
              />
            ) : null}
            {loaded && profile.role === "senior_researcher" && tab === "projects" && pendingInvites.length > 0 ? (
              <>
                <h2><Mark name="award">Open invites</Mark></h2>
                <div className="record-grid">
                  {pendingInvites.map((invite) => (
                    <article key={invite.id} className="card">
                      <p className="mono">{projectTypeLabel(invite)}</p>
                      <h3>{invite.projectTitle || "Untitled project"}</h3>
                      <p className="quiet">You are invited as a Senior Researcher{invite.guestName ? ` (${invite.guestName})` : ""}.</p>
                      <p>
                        <Link className="btn btn-primary btn-compact" to={`/join/${invite.id}`}>
                          Open this invite
                        </Link>
                      </p>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
            {loaded && profile.role === "senior_researcher" && tab === "projects" ? (
              <ProjectList
                projects={projects}
                stacked={pendingInvites.length > 0}
                personName={profile.displayName || ""}
                email={user.email || ""}
                uid={user.uid}
              />
            ) : null}
            {loaded && profile.role === "senior_researcher" && tab === "records" ? (
              <MatchRequestList
                rows={rows}
                fitFilter={fitFilter}
                onFitFilter={setFitFilter}
                notes={notes}
                onNote={(proposalId, note) => setNotes((current) => ({ ...current, [proposalId]: note }))}
                onRespond={(card, response) => void respond(card, response)}
                error={error}
                mailFor={mailFor}
                responseMail={responseMail}
              />
            ) : null}
          </div>
        </div>
      </section>
    </article>
  );
}
