import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { firebaseConfigured } from "../lib/firebase";
import { getAward, saveProposal } from "../lib/records";
import { EMPTY_PROPOSAL, type ProposalDraft } from "../types/domain";

type AwardRecord = {
  id: string;
  recipientName?: string;
  title?: string;
  note?: string;
  status?: string;
};

export function AwardPage() {
  const { token } = useParams();
  const { user, configured } = useAuth();
  const [award, setAward] = useState<AwardRecord | null | undefined>(undefined);
  const [scope, setScope] = useState<Pick<ProposalDraft, "title" | "summary" | "question" | "timeline">>(
    {
      title: "",
      summary: "",
      question: "",
      timeline: "",
    },
  );
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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !token) {
      setError("Sign in before you save this scope.");
      return;
    }
    setError("");
    try {
      await saveProposal(
        null,
        user.uid,
        {
          ...EMPTY_PROPOSAL,
          ...scope,
          name: award?.recipientName ?? "",
          links: `award:${token}`,
        },
        "research_scoping",
      );
      setMessage("Scoping notes saved. TRI will use them before matching.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  }

  return (
    <article>
      <header className="page-intro">
        <div className="container">
          <p className="mono">TRI AI Saturdays Research Mentorship Award</p>
          <h1>You have already earned entry to the research mentorship route.</h1>
          <p className="lede">
            This step prepares your project for research mentor matching. You do not need to submit
            a new Researcher application. The award guarantees access to the mentorship route, not
            a specific mentor, immediate project activation, or a fixed level of compute or funding.
          </p>
        </div>
      </header>
      <section className="section-tight">
        <div className="container" style={{ maxWidth: 760 }}>
          {award === undefined ? <p className="quiet">Checking this invite…</p> : null}
          {award === null ? (
            <div className="empty">
              {configured
                ? "This invite link does not match an award record."
                : "Award invites need Firebase before they can be opened."}{" "}
              <Link to="/how-it-works">See how invites work</Link>.
            </div>
          ) : null}
          {award ? (
            <form className="fields" onSubmit={onSubmit}>
              <div className="notice">
                <strong>{award.recipientName || "Award recipient"}</strong>
                <p>{award.note || "Use this page to sketch the question, scope, and timeline."}</p>
              </div>
              <label>
                Working title
                <input
                  value={scope.title}
                  onChange={(event) => setScope({ ...scope, title: event.target.value })}
                  required
                />
              </label>
              <label>
                What you want to study
                <textarea
                  value={scope.summary}
                  onChange={(event) => setScope({ ...scope, summary: event.target.value })}
                />
              </label>
              <label>
                Research question
                <textarea
                  value={scope.question}
                  onChange={(event) => setScope({ ...scope, question: event.target.value })}
                />
              </label>
              <label>
                First timeline
                <textarea
                  value={scope.timeline}
                  onChange={(event) => setScope({ ...scope, timeline: event.target.value })}
                />
              </label>
              {!user ? (
                <p className="quiet">
                  <Link to="/login">Sign in</Link> to save this scope to your record.
                </p>
              ) : null}
              {message ? <p className="quiet">{message}</p> : null}
              {error ? <p className="error">{error}</p> : null}
              <button className="btn btn-primary" type="submit" disabled={!user}>
                Save scoping notes
              </button>
            </form>
          ) : null}
        </div>
      </section>
    </article>
  );
}
