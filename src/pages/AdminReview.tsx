import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmailSupport } from "../components/EmailSupport";
import { Loader } from "../components/Loader";
import { ProposalRead } from "../components/ProposalRead";
import { StatusChip } from "../components/StatusChip";
import { useAuth } from "../lib/auth";
import {
  approvedForMatchingEmail,
  declinedProposalEmail,
  furtherScopingEmail,
  heldForMatchingEmail,
  named,
  proposalReceivedEmail,
  reviewAssignedEmail,
  revisionEmail,
  type EmailAddress,
  type EmailDraft,
} from "../lib/email";
import { getProposal, getReview, listDirectory, listStaff, saveReview, updateProposalStatus } from "../lib/records";
import {
  DIRECT_DECISIONS,
  EMPTY_REVIEW_SCORES,
  PROPOSAL_LABELS,
  PROPOSAL_STEPS,
  REVIEW_CRITERIA,
  REVIEW_FLAGS,
  SCOPING_DECISIONS,
  type ProposalDraft,
  type ReviewFlag,
  type ReviewRecord,
  type ReviewScores,
} from "../types/domain";

const groups: { title: string; keys: (keyof ProposalDraft)[] }[] = [
  {
    title: PROPOSAL_STEPS[0],
    keys: ["name", "affiliation", "location", "applicantStatus", "bio", "github", "scholar"],
  },
  {
    title: PROPOSAL_STEPS[1],
    keys: ["title", "researchArea", "africaRelevance", "summary"],
  },
  {
    title: PROPOSAL_STEPS[2],
    keys: ["problem", "question", "relatedWork", "methodology", "data", "evaluation", "contribution"],
  },
  { title: PROPOSAL_STEPS[3], keys: ["readiness", "mentorExpertise"] },
  { title: PROPOSAL_STEPS[4], keys: ["resources", "timeline", "intendedOutput", "risks"] },
  { title: PROPOSAL_STEPS[5], keys: ["links"] },
];

type Staff = { id: string; displayName?: string; email?: string };
type DirectoryPerson = { id: string; email: string; displayName: string };

export function AdminReviewPage() {
  const { id = "" } = useParams();
  const { user, profile } = useAuth();
  const [proposal, setProposal] = useState<Record<string, unknown> | null>(null);
  const [scores, setScores] = useState<ReviewScores>(EMPTY_REVIEW_SCORES);
  const [strengths, setStrengths] = useState("");
  const [concerns, setConcerns] = useState("");
  const [mentorExpertise, setMentorExpertise] = useState("");
  const [note, setNote] = useState("");
  const [flags, setFlags] = useState<Record<ReviewFlag, boolean>>({
    ethics: false,
    dataRights: false,
    safety: false,
    compute: false,
    ownership: false,
    weakDesign: false,
  });
  const [reviewerId, setReviewerId] = useState("");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [existing, setExisting] = useState(false);
  const [directory, setDirectory] = useState<DirectoryPerson[]>([]);
  const [reviewerDraft, setReviewerDraft] = useState<EmailDraft | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const saturdays = proposal?.route === "saturdays";
  const decisions = saturdays ? SCOPING_DECISIONS : DIRECT_DECISIONS;
  const total = useMemo(
    () => REVIEW_CRITERIA.reduce((sum, item) => sum + Number(scores[item.key] || 0), 0),
    [scores],
  );
  const canCreate = profile?.role === "admin";
  const canEdit = canCreate || (existing && reviewerId === user?.uid);

  useEffect(() => {
    if (!id) return;
    getProposal(id)
      .then((item) => {
        setProposal(item);
        if (!item) setError("This proposal is not available.");
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load the proposal."));
    getReview(id)
      .then((review) => {
        if (!review) return;
        setExisting(true);
        setReviewerId(review.reviewerId);
        setScores({
          problemImportance: Number(review.problemImportance) || 0,
          novelty: Number(review.novelty) || 0,
          methodology: Number(review.methodology) || 0,
          feasibility: Number(review.feasibility) || 0,
          readiness: Number(review.readiness) || 0,
          outputPotential: Number(review.outputPotential) || 0,
        });
        setStrengths(review.strengths ?? "");
        setConcerns(review.concerns ?? "");
        setMentorExpertise(review.mentorExpertise ?? "");
        setNote(review.note ?? "");
        setFlags((current) => ({ ...current, ...(review.flags ?? {}) }));
      })
      .catch(() => {
        setExisting(false);
      });
    if (profile?.role === "admin") {
      listStaff()
        .then((items) => setStaff(items as Staff[]))
        .catch(() => setStaff([]));
      listDirectory()
        .then((items) => setDirectory(items))
        .catch(() => setDirectory([]));
    }
  }, [id, profile?.role]);

  const researcher = useMemo<EmailAddress>(() => {
    const ownerId = String(proposal?.ownerId ?? "");
    const person = directory.find((item) => item.id === ownerId);
    return named(String(proposal?.name || person?.displayName || "Researcher"), person?.email || "");
  }, [directory, proposal]);

  const decisionDraft = useMemo(() => {
    if (!proposal) return null;
    const title = String(proposal.title || "Untitled proposal");
    const status = String(proposal.status ?? "");
    const points = [concerns, note].map((item) => item.trim()).filter(Boolean);
    if (status === "received" || status === "under_review") return proposalReceivedEmail({ title, researcher });
    if (status === "approved_for_matching" || status === "ready_for_matching") {
      return approvedForMatchingEmail({ title, researcher });
    }
    if (status === "revise") return revisionEmail({ title, researcher, points, recordId: id });
    if (status === "held_for_matching" || status === "no_current_match") return heldForMatchingEmail({ title, researcher });
    if (status === "declined") return declinedProposalEmail({ title, researcher, reason: points.join(" ") });
    if (status === "research_scoping") {
      const awardId = String(proposal.awardId ?? "");
      const link = awardId ? `${window.location.origin}${window.location.pathname}#/award/${awardId}` : "";
      return furtherScopingEmail({ title, researcher, link });
    }
    return null;
  }, [concerns, id, note, proposal, researcher]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !canEdit) return;
    setBusy(true);
    setError("");
    setMessage("");
    const review: ReviewRecord = {
      proposalId: id,
      reviewerId: reviewerId || user.uid,
      ...scores,
      strengths,
      concerns,
      mentorExpertise,
      note,
      flags,
      decision: String(proposal?.status ?? ""),
    };
    try {
      await saveReview(id, review);
      setExisting(true);
      setReviewerId(review.reviewerId);
      const reviewer = directory.find((item) => item.id === review.reviewerId);
      if (reviewer && review.reviewerId !== user.uid) {
        setReviewerDraft(
          reviewAssignedEmail({
            title: String(proposal?.title || "Untitled proposal"),
            reviewer: named(reviewer.displayName || reviewer.email, reviewer.email),
            link: `${window.location.origin}${window.location.pathname}#/admin/proposals/${id}`,
          }),
        );
      }
      setMessage("Review saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the review.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(status: string) {
    if (!user || !canEdit) return;
    setBusy(true);
    setError("");
    try {
      await saveReview(id, {
        proposalId: id,
        reviewerId: reviewerId || user.uid,
        ...scores,
        strengths,
        concerns,
        mentorExpertise,
        note,
        flags,
        decision: status,
      });
      await updateProposalStatus(id, status);
      setProposal((current) => (current ? { ...current, status } : current));
      setExisting(true);
      setMessage("Decision recorded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record the decision.");
    } finally {
      setBusy(false);
    }
  }

  if (!proposal && !error) return <Loader label="Loading the proposal" />;
  if (!proposal) return <p className="error">{error}</p>;

  return (
    <div>
      <p>
        <Link className="btn btn-ghost btn-compact" to="/admin/proposals">All proposals</Link>
      </p>
      <div className="review-head">
        <div>
          <h2>{String(proposal.title || "Untitled proposal")}</h2>
          <p className="quiet">
            {String(proposal.name || "Researcher")} · {saturdays ? "TRI AI Saturdays Award" : "Direct proposal"}
          </p>
        </div>
        {proposal.status ? <StatusChip status={String(proposal.status)} /> : null}
      </div>
      {saturdays ? (
        <div className="notice">Score research readiness for this TRI AI Saturdays Award.</div>
      ) : null}
      <div className="review-grid">
        <ProposalRead
          sections={groups.map((group) => ({
            title: group.title,
            fields: group.keys.map((key) => ({
              label: PROPOSAL_LABELS[key],
              value: String(proposal[key] || ""),
            })),
          }))}
        />
        <form className="fields" onSubmit={onSubmit}>
          <h3>Scoring rubric</h3>
          <p className="quiet">Total {total} / 100</p>
          {REVIEW_CRITERIA.map((item) => (
            <label key={item.key}>
              {item.label}
              <span className="quiet">Up to {item.max}</span>
              <input
                type="number"
                min={0}
                max={item.max}
                value={scores[item.key]}
                disabled={!canEdit}
                onChange={(event) =>
                  setScores((current) => ({
                    ...current,
                    [item.key]: Math.min(item.max, Math.max(0, Number(event.target.value) || 0)),
                  }))
                }
              />
            </label>
          ))}
          <label>
            Top strengths
            <textarea value={strengths} disabled={!canEdit} onChange={(event) => setStrengths(event.target.value)} />
          </label>
          <label>
            Concerns
            <textarea value={concerns} disabled={!canEdit} onChange={(event) => setConcerns(event.target.value)} />
          </label>
          <label>
            Suggested Senior Researcher expertise
            <textarea
              value={mentorExpertise}
              disabled={!canEdit}
              onChange={(event) => setMentorExpertise(event.target.value)}
            />
          </label>
          <label>
            Reviewer note
            <textarea value={note} disabled={!canEdit} onChange={(event) => setNote(event.target.value)} />
          </label>
          <fieldset className="flags">
            <legend>Critical flags</legend>
            {REVIEW_FLAGS.map((item) => (
              <label key={item.key} className="check">
                <input
                  type="checkbox"
                  checked={flags[item.key]}
                  disabled={!canEdit}
                  onChange={(event) => setFlags((current) => ({ ...current, [item.key]: event.target.checked }))}
                />
                {item.label}
              </label>
            ))}
          </fieldset>
          {canCreate && staff.length > 0 ? (
            <label>
              Reviewer
              <select value={reviewerId || user?.uid || ""} disabled={!canEdit} onChange={(event) => setReviewerId(event.target.value)}>
                {staff.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.displayName || person.email || person.id}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {!canEdit ? (
            <div className="notice">Waiting for TRI AI to open this review.</div>
          ) : null}
          {message ? <p className="quiet">{message}</p> : null}
          {error ? <p className="error">{error}</p> : null}
          <EmailSupport draft={decisionDraft} />
          <EmailSupport draft={reviewerDraft} />
          <div className="form-actions">
            <button className="btn btn-ghost" type="submit" disabled={busy || !canEdit}>
              Save review
            </button>
          </div>
          <div className="decision-row">
            {decisions.map((item) => (
              <button
                key={item.status}
                className="btn btn-primary"
                type="button"
                disabled={busy || !canEdit}
                onClick={() => void decide(item.status)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}
