import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader } from "../components/Loader";
import { useAuth } from "../lib/auth";
import { firebaseConfigured } from "../lib/firebase";
import { scopingNotesBlocks, updateFiledDocument } from "../lib/driveDocs";
import { getAward, listResearcherProposals, projectMembership, saveAwardScope } from "../lib/records";
import type { ProposalDraft } from "../types/domain";

type AwardPerson = { uid?: string; name?: string };

type AwardRecord = {
  id: string;
  recipientName?: string;
  recipients?: AwardPerson[];
  researchers?: AwardPerson[];
  seniorResearchers?: AwardPerson[];
  projectId?: string;
  title?: string;
  note?: string;
  status?: string;
  summary?: string;
  question?: string;
  timeline?: string;
};

function uniqueNames(...groups: (AwardPerson[] | undefined)[]) {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const person of groups.flatMap((group) => group ?? [])) {
    const name = person.name?.trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

function People({ title, names }: { title: string; names: string[] }) {
  return (
    <div className="people-block">
      <strong>{title}</strong>
      {names.length === 0 ? <p className="quiet">None added yet.</p> : (
        <ul>
          {names.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AwardPage() {
  const { token } = useParams();
  const { user, profile, configured } = useAuth();
  const [award, setAward] = useState<AwardRecord | null | undefined>(undefined);
  const [scope, setScope] = useState<Pick<ProposalDraft, "title" | "summary" | "question" | "timeline">>(
    {
      title: "",
      summary: "",
      question: "",
      timeline: "",
    },
  );
  const [member, setMember] = useState(false);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !firebaseConfigured) {
      setAward(null);
      return;
    }
    getAward(token)
      .then((row) => setAward((row as AwardRecord | null) ?? null))
      .catch(() => setAward(null));
  }, [token]);

  useEffect(() => {
    if (!award) return;
    setScope((current) => ({
      title: current.title || award.title || "",
      summary: award.summary || current.summary,
      question: award.question || current.question,
      timeline: award.timeline || current.timeline,
    }));
    const status = award.status || "";
    setLocked(status !== "" && status !== "scoping" && status !== "research_scoping" && status !== "draft");
  }, [award]);

  useEffect(() => {
    if (!user || !award?.projectId) {
      setMember(false);
      return;
    }
    void projectMembership(award.projectId, user.uid).then(setMember);
  }, [award?.projectId, user]);

  useEffect(() => {
    if (!user || !token || !award) return;
    let cancelled = false;
    listResearcherProposals(user.uid)
      .then((items) => {
        if (cancelled) return;
        const rows = items as Array<Record<string, unknown> & { id: string }>;
        const match = rows.find((item) => String(item.links ?? "").includes(`award:${token}`))
          || rows.find((item) => item.route === "saturdays" && item.title === award.title);
        if (!match) return;
        setScope((current) => ({
          title: String(match.title || award.title || current.title),
          summary: current.summary || String(match.summary || ""),
          question: current.question || String(match.question || ""),
          timeline: current.timeline || String(match.timeline || ""),
        }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [award, token, user]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !token) {
      setError("Sign in to save.");
      return;
    }
    if (profile?.role !== "admin" && !member) {
      setError("Join this project to save.");
      return;
    }
    setError("");
    try {
      await saveAwardScope(token, scope);
      let driveNote = "";
      if (award?.projectId) {
        try {
          const filed = await updateFiledDocument(
            award.projectId,
            "Scoping notes",
            scopingNotesBlocks({
              title: award.title || "Project",
              summary: scope.summary,
              question: scope.question,
              timeline: scope.timeline,
            }),
          );
          if (filed !== "updated") driveNote = " The document did not update.";
        } catch {
          driveNote = " The document did not update.";
        }
      }
      setMessage(`Saved.${driveNote}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  }

  const researchers = uniqueNames(award?.researchers, award?.recipients);
  const seniors = uniqueNames(award?.seniorResearchers);
  const canSave = Boolean(user) && (profile?.role === "admin" || member);

  return (
    <article>
      <header className="page-intro">
        <div className="container">
          <p className="mono">TRI AI Saturdays Award</p>
          <h1>TRI AI Saturdays Award</h1>
          <p className="lede">Write the scoping notes for this project.</p>
        </div>
      </header>
      <section className="section-tight">
        <div className="container" style={{ maxWidth: 760 }}>
          {award === undefined ? <Loader label="Checking this invite" /> : null}
          {award === null ? (
            <div className="empty">
              {configured
                ? "This invite link is not active."
                : "This invite cannot be opened."}{" "}
              <Link className="btn btn-ghost btn-compact" to="/how-it-works">See how invites work</Link>.
            </div>
          ) : null}
          {award ? (
            <form className="fields" onSubmit={onSubmit}>
              <div className="notice">
                <strong>{award.title || "TRI AI Saturdays Award"}</strong>
                {award.note ? <p>{award.note}</p> : null}
                <People title="Researchers" names={researchers} />
                <People title="Senior Researchers" names={seniors} />
              </div>
              <label>
                Name
                <input value={award.title || scope.title} readOnly />
              </label>
              <label>
                What you want to study
                <span className="hint">A short description of the work.</span>
                <textarea
                  rows={4}
                  value={scope.summary}
                  onChange={(event) => setScope({ ...scope, summary: event.target.value })}
                />
              </label>
              <label>
                Research question
                <span className="hint">The question you want to answer first.</span>
                <textarea
                  rows={4}
                  value={scope.question}
                  onChange={(event) => setScope({ ...scope, question: event.target.value })}
                />
              </label>
              <label>
                First timeline
                <span className="hint">What the first months will cover.</span>
                <textarea
                  rows={3}
                  value={scope.timeline}
                  onChange={(event) => setScope({ ...scope, timeline: event.target.value })}
                />
              </label>
              {!user ? (
                <p>
                  <Link className="btn btn-ghost btn-compact" to={`/login?next=/award/${token || ""}`}>Sign in</Link> to save these notes.
                </p>
              ) : null}
              {user && !canSave && !locked ? (
                <p className="quiet">Join the project to save these notes.</p>
              ) : null}
              {locked ? <p className="quiet">These notes are closed.</p> : null}
              {message ? <p className="quiet">{message}</p> : null}
              {error ? <p className="error">{error}</p> : null}
              <button className="btn btn-primary" type="submit" disabled={!canSave || locked}>
                Save scoping notes
              </button>
            </form>
          ) : null}
        </div>
      </section>
    </article>
  );
}
