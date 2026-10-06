import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmailSupport } from "../components/EmailSupport";
import { ProposalRead } from "../components/ProposalRead";
import { named, proposalSubmittedEmail, type EmailDraft } from "../lib/email";
import { useAuth } from "../lib/auth";
import {
  listParticipantProjects,
  listResearcherProposals,
  listResearchProjects,
  projectProposalIds,
  proposalDraftFromRecord,
  readLocalProposal,
  readLocalProposalId,
  saveProposal,
  writeLocalProposal,
} from "../lib/records";
import { EMPTY_PROPOSAL, PROPOSAL_LABELS, PROPOSAL_STEPS, type ProposalDraft } from "../types/domain";

type SavedProposal = ProposalDraft & { id: string; status?: string; route?: string };

const hints: Partial<Record<keyof ProposalDraft, string>> = {
  africaRelevance: "Name the place, language, dataset, or community this work is for.",
  summary: "A few sentences a Senior Researcher can read first.",
  problem: "Why this is worth a project.",
  question: "One clear question or hypothesis.",
  relatedWork: "The work this proposal builds on.",
  methodology: "How you will carry out the study.",
  data: "What data you will use, and whether you already have access.",
  evaluation: "How you will know the result is sound.",
  contribution: "What will exist at the end that does not exist now.",
  readiness: "Skills and previous work that prepare you for this.",
  mentorExpertise: "The support you want from a Senior Researcher.",
  resources: "Compute, data, or other support you expect to need.",
  timeline: "For example, 4 months.",
  intendedOutput: "A paper, dataset, model, or tool.",
  risks: "What could slow the project down.",
  links: "A URL is enough.",
};

const fields: Record<(typeof PROPOSAL_STEPS)[number], (keyof ProposalDraft)[]> = {
  "Applicant profile": ["name", "affiliation", "location", "applicantStatus", "bio", "github", "scholar"],
  "Proposal overview": ["title", "researchArea", "africaRelevance", "summary"],
  "Research plan": ["problem", "question", "relatedWork", "methodology", "data", "evaluation", "contribution"],
  "Applicant and Senior Researcher fit": ["readiness", "mentorExpertise"],
  "Resources and risks": ["resources", "timeline", "intendedOutput", "risks"],
  "Supporting materials": ["links"],
  "Review and submit": [],
};

function pickProposal(items: SavedProposal[], requestedId: string | null, localId: string | null) {
  const direct = items.filter((item) => item.route !== "saturdays");
  return (
    direct.find((item) => item.id === requestedId) ||
    direct.find((item) => item.id === localId) ||
    direct.find((item) => item.status === "revise") ||
    direct.find((item) => item.status === "draft") ||
    direct[0] ||
    null
  );
}

export function ApplyResearcherPage() {
  const { user, profile } = useAuth();
  const [params] = useSearchParams();
  const requestedId = params.get("proposal");
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ProposalDraft>(() => readLocalProposal() ?? EMPTY_PROPOSAL);
  const [proposalId, setProposalId] = useState<string | null>(() => readLocalProposalId());
  const [proposalStatus, setProposalStatus] = useState("");
  const [saved, setSaved] = useState<SavedProposal[]>([]);
  const [message, setMessage] = useState("");
  const [mail, setMail] = useState<EmailDraft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const editable = !proposalStatus || proposalStatus === "draft" || proposalStatus === "revise";
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

  function loadProposal(item: SavedProposal) {
    const next = proposalDraftFromRecord(item);
    setDraft(next);
    setProposalId(item.id);
    setProposalStatus(String(item.status ?? ""));
    writeLocalProposal(next, item.id);
    setMessage("");
    setError("");
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([listResearcherProposals(user.uid), listParticipantProjects(user.uid), listResearchProjects()])
      .then(([items, projectRows, programmeProjects]) => {
        if (cancelled) return;
        const matched = projectProposalIds([
          ...(projectRows as { id?: string; proposalId?: string }[]),
          ...(programmeProjects as { id?: string; proposalId?: string }[]),
        ]);
        const records = (items as SavedProposal[]).filter((item) => !matched.has(item.id));
        const direct = records.filter((item) => item.route !== "saturdays");
        setSaved(direct);
        const localId = readLocalProposalId();
        const chosen = pickProposal(records, requestedId, localId);
        if (chosen) {
          const next = proposalDraftFromRecord(chosen);
          setDraft(next);
          setProposalId(chosen.id);
          setProposalStatus(String(chosen.status ?? ""));
          writeLocalProposal(next, chosen.id);
          return;
        }
        if (profile?.displayName) {
          setDraft((current) => (current.name ? current : { ...current, name: profile.displayName }));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [profile?.displayName, requestedId, user]);

  function update(key: keyof ProposalDraft, value: string) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    writeLocalProposal(next, proposalId);
  }

  async function persist(status: "draft" | "received") {
    if (!user) {
      setMessage("Saved on this device. Sign in to submit.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const id = await saveProposal(proposalId, user.uid, draft, status);
      setProposalId(id);
      writeLocalProposal(draft, id);
      setMessage(status === "received" ? "Proposal received." : "Draft saved.");
      if (status === "received") {
        setMail(
          proposalSubmittedEmail({
            title: draft.title || "Untitled proposal",
            researcher: named(draft.name || profile?.displayName || "", user.email || ""),
          }),
        );
      }
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
          <p className="lede">Submit a research proposal.</p>
        </div>
      </header>
      <section className="container form-layout">
        <ol className="step-list">
          {PROPOSAL_STEPS.map((label, index) => (
            <li key={label}>
              <button
                type="button"
                className={index === step ? "is-current" : index < step ? "is-done" : ""}
                onClick={() => setStep(index)}
              >
                <span className="step-num">{index + 1}</span>
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ol>
        <form onSubmit={onSubmit}>
          {!user ? (
            <div className="notice">
              <Link className="btn btn-ghost btn-compact" to="/login">Sign in</Link> to submit.
            </div>
          ) : null}
          {saved.length > 1 ? (
            <div className="actions" style={{ marginTop: 0, marginBottom: 16 }}>
              {saved.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === proposalId ? "btn btn-primary btn-compact" : "btn btn-ghost btn-compact"}
                  onClick={() => loadProposal(item)}
                >
                  {item.title || "Untitled proposal"}
                </button>
              ))}
            </div>
          ) : null}
          {proposalStatus && !editable ? (
            <div className="notice">Submitted.</div>
          ) : null}
          <p className="quiet form-progress">Step {step + 1} of {PROPOSAL_STEPS.length}</p>
          <h2>{current}</h2>
          <div className={current === "Review and submit" ? "fields" : "fields proposal-form"}>
            {current === "Review and submit" ? (
              <ProposalRead
                sections={PROPOSAL_STEPS.slice(0, -1).map((title) => ({
                  title,
                  fields: fields[title].map((key) => ({
                    label: PROPOSAL_LABELS[key],
                    value: draft[key],
                  })),
                }))}
              />
            ) : (
              keys.map((key) => (
                <label key={key}>
                  <span>{PROPOSAL_LABELS[key]}</span>
                  {hints[key] ? <span className="hint">{hints[key]}</span> : null}
                  {long.has(key) ? (
                    <textarea
                      value={draft[key]}
                      rows={key === "summary" || key === "methodology" ? 6 : 4}
                      onChange={(event) => update(key, event.target.value)}
                    />
                  ) : (
                    <input
                      value={draft[key]}
                      autoComplete={key === "name" ? "name" : key === "github" ? "url" : undefined}
                      inputMode={key === "github" || key === "scholar" ? "url" : undefined}
                      placeholder={key === "github" || key === "scholar" ? "https://" : undefined}
                      onChange={(event) => update(key, event.target.value)}
                    />
                  )}
                </label>
              ))
            )}
          </div>
          {message ? <p className="quiet" style={{ marginTop: 16 }}>{message}</p> : null}
          <EmailSupport draft={mail} />
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
                  if (editable) void persist("draft");
                  setStep(step + 1);
                }}
              >
                Continue
              </button>
            ) : (
              <button className="btn btn-primary" type="submit" disabled={busy || !user || !editable}>
                Submit proposal
              </button>
            )}
          </div>
        </form>
      </section>
    </article>
  );
}
