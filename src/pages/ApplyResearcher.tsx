import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import {
  readLocalProposal,
  readLocalProposalId,
  saveProposal,
  writeLocalProposal,
} from "../lib/records";
import { EMPTY_PROPOSAL, PROPOSAL_STEPS, type ProposalDraft } from "../types/domain";

const fields: Record<(typeof PROPOSAL_STEPS)[number], (keyof ProposalDraft)[]> = {
  "Applicant profile": ["name", "affiliation", "location", "applicantStatus", "bio", "github", "scholar"],
  "Proposal overview": ["title", "researchArea", "africaRelevance", "summary"],
  "Research plan": ["problem", "question", "relatedWork", "methodology", "data", "evaluation", "contribution"],
  "Applicant and mentorship fit": ["readiness", "mentorExpertise"],
  "Resources and risks": ["resources", "timeline", "intendedOutput", "risks"],
  "Supporting materials": ["links"],
  "Review and submit": [],
};

const labels: Record<keyof ProposalDraft, string> = {
  name: "Full name",
  affiliation: "Institution or organisation",
  location: "Country or location",
  applicantStatus: "Current status",
  bio: "Field or programme of study",
  github: "GitHub or portfolio",
  scholar: "Google Scholar or publications",
  title: "Project title",
  researchArea: "Primary research area",
  africaRelevance: "Does this address an African problem, population, dataset, language, environment, or context?",
  summary: "Executive summary",
  problem: "Why does this problem matter?",
  question: "Main research question or hypothesis",
  relatedWork: "Relevant prior work",
  methodology: "Proposed methodology",
  data: "Datasets and data access status",
  evaluation: "Evaluation approach",
  contribution: "Expected research contribution",
  readiness: "Relevant skills and previous work",
  mentorExpertise: "What expertise do you need from a Senior Researcher?",
  resources: "Major compute or resource needs",
  timeline: "Expected project duration",
  intendedOutput: "Intended research output",
  risks: "Main risks or dependencies",
  links: "Link to supporting code, preliminary experiments, or materials",
};

export function ApplyResearcherPage() {
  const { user, configured } = useAuth();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ProposalDraft>(() => readLocalProposal() ?? EMPTY_PROPOSAL);
  const [proposalId, setProposalId] = useState<string | null>(() => readLocalProposalId());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const current = PROPOSAL_STEPS[step];
  const keys = fields[current];
  const long = useMemo(
    () =>
      new Set<keyof ProposalDraft>([
        "bio",
        "summary",
        "problem",
        "question",
        "relatedWork",
        "methodology",
        "data",
        "evaluation",
        "contribution",
        "readiness",
        "mentorExpertise",
        "resources",
        "timeline",
        "intendedOutput",
        "risks",
        "links",
      ]),
    [],
  );

  function update(key: keyof ProposalDraft, value: string) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    writeLocalProposal(next, proposalId);
  }

  async function persist(status: "draft" | "received") {
    if (!user) {
      setMessage("Saved on this device. Sign in to store the proposal in the programme record.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const id = await saveProposal(proposalId, user.uid, draft, status);
      setProposalId(id);
      writeLocalProposal(draft, id);
      setMessage(status === "received" ? "Proposal received." : "Draft saved to your record.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await persist("received");
  }

  return (
    <article>
      <header className="page-intro">
        <div className="container">
          <p className="mono">Direct proposal</p>
          <h1>Propose a research project.</h1>
          <p className="lede">
            This form is for the Direct Proposal Route. Students whose projects have already
            received the TRI AI Saturdays Research Mentorship Award do not submit it again. Strong
            direct proposals may be presented to Senior Researchers. Shortlisting does not
            guarantee a mentor match or project activation.
          </p>
        </div>
      </header>
      <section className="container form-layout">
        <ol className="step-list">
          {PROPOSAL_STEPS.map((label, index) => (
            <li key={label}>
              <button
                type="button"
                className={index === step ? "is-current" : ""}
                onClick={() => setStep(index)}
              >
                {index + 1}. {label}
              </button>
            </li>
          ))}
        </ol>
        <form onSubmit={onSubmit}>
          {!user ? (
            <div className="notice">
              You can draft here now. <Link to="/login">Sign in</Link> before you submit so the
              proposal is tied to your account.
              {!configured ? " Firebase still needs to be configured for sign-in." : ""}
            </div>
          ) : null}
          <h2>{current}</h2>
          <div className="fields" style={{ marginTop: 16 }}>
            {keys.map((key) => (
              <label key={key}>
                {labels[key]}
                {long.has(key) ? (
                  <textarea value={draft[key]} onChange={(event) => update(key, event.target.value)} />
                ) : (
                  <input value={draft[key]} onChange={(event) => update(key, event.target.value)} />
                )}
              </label>
            ))}
            {current === "Review and submit" ? (
              <div className="card">
                <h3>{draft.title || "Untitled proposal"}</h3>
                <p>{draft.summary || "Add a summary before you submit."}</p>
                <p className="quiet" style={{ marginTop: 8 }}>
                  {draft.name} · {draft.researchArea || "Research area not set"}
                </p>
              </div>
            ) : null}
          </div>
          {message ? <p className="quiet" style={{ marginTop: 16 }}>{message}</p> : null}
          {error ? <p className="error">{error}</p> : null}
          <div className="form-actions">
            <button className="btn btn-ghost" type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>
              Back
            </button>
            {step < PROPOSAL_STEPS.length - 1 ? (
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  void persist("draft");
                  setStep(step + 1);
                }}
              >
                Continue
              </button>
            ) : (
              <button className="btn btn-primary" type="submit" disabled={busy || !user}>
                Submit proposal
              </button>
            )}
          </div>
        </form>
      </section>
    </article>
  );
}
