import { useEffect, useMemo, useState } from "react";
import { EmailSupport } from "../components/EmailSupport";
import { Loader } from "../components/Loader";
import { Mark } from "../components/Icon";
import { StatusChip } from "../components/StatusChip";
import { useAuth } from "../lib/auth";
import { introductionEmail, matchRequestEmail, named, type EmailDraft } from "../lib/email";
import { introduceMatch, listDirectory, listMatches, listProjects, listProposals, listSeniorProfiles, sendMatchOpportunity } from "../lib/records";
import { EMPTY_FIT, FIT_DIMENSIONS, type FitScores } from "../types/domain";

type ProposalRow = Record<string, unknown> & { id: string };
type MentorRow = {
  id: string;
  name?: string;
  researchAreas?: string;
  methods?: string;
  availability?: string;
  capacity?: string;
  poolStatus?: string;
};
type MatchRow = {
  id: string;
  proposalId?: string;
  mentorId?: string;
  mentorName?: string;
  fitScore?: number;
  response?: string;
  responseNote?: string;
  introduced?: boolean;
  invited?: boolean;
};

const readyStatuses = new Set(["approved_for_matching", "ready_for_matching", "matching"]);

function tokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3),
  );
}

function overlap(left: Set<string>, right: Set<string>) {
  let count = 0;
  for (const word of left) if (right.has(word)) count += 1;
  return count;
}

export function AdminMatchingPage() {
  const { profile } = useAuth();
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [mentors, setMentors] = useState<MentorRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [mentorId, setMentorId] = useState("");
  const [fit, setFit] = useState<FitScores>(EMPTY_FIT);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [directory, setDirectory] = useState<{ id: string; email: string; displayName: string }[]>([]);
  const [introductionDraft, setIntroductionDraft] = useState<EmailDraft | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile?.role !== "admin") return;
    Promise.all([listProposals(), listProjects(), listSeniorProfiles(), listMatches(), listDirectory()])
      .then(([proposalRows, projectRows, mentorRows, matchRows, directoryRows]) => {
        const projectProposalIds = new Set(
          (projectRows as { proposalId?: string }[])
            .map((project) => project.proposalId)
            .filter((id): id is string => Boolean(id)),
        );
        const ready = (proposalRows as ProposalRow[]).filter(
          (item) => readyStatuses.has(String(item.status ?? "")) && !projectProposalIds.has(item.id),
        );
        setProposals(ready);
        setMentors(mentorRows as MentorRow[]);
        setDirectory(directoryRows);
        setMatches(matchRows as MatchRow[]);
        setSelectedId((current) => current || ready[0]?.id || "");
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load matching."))
      .finally(() => setLoaded(true));
  }, [profile?.role]);

  const selected = proposals.find((item) => item.id === selectedId) ?? null;
  const opportunityDraft = useMemo(() => {
    if (!selected || !mentorId) return null;
    const mentor = mentors.find((item) => item.id === mentorId);
    if (!mentor) return null;
    const senior = directory.find((item) => item.id === mentorId);
    const owner = directory.find((item) => item.id === String(selected.ownerId ?? ""));
    return matchRequestEmail({
      title: String(selected.title || "Untitled proposal"),
      senior: named(mentor.name || senior?.displayName || "Senior Researcher", senior?.email || ""),
      researcherName: String(selected.name || owner?.displayName || "Researcher"),
      area: String(selected.researchArea || mentor.researchAreas || ""),
      question: String(selected.question || selected.summary || ""),
      timeline: String(selected.timeline || ""),
      need: String(selected.mentorExpertise || ""),
      note,
    });
  }, [directory, mentorId, mentors, note, selected]);

  useEffect(() => {
    if (!selected) return;
    setNote(String(selected.mentorExpertise ?? ""));
    setFit(EMPTY_FIT);
    setMentorId("");
    // Prefill only when the admin switches proposal. Later list updates should keep what they typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);
  const proposalMatches = matches.filter((item) => item.proposalId === selectedId);
  const suggestions = useMemo(() => {
    if (!selected) return [];
    const sentMentorIds = new Set(matches.filter((item) => item.proposalId === selected.id).map((item) => item.mentorId));
    const proposalWords = tokens(
      [selected.researchArea, selected.methodology, selected.mentorExpertise].map((item) => String(item ?? "")).join(" "),
    );
    return mentors
      .filter(
        (mentor) =>
          mentor.poolStatus === "in_pool" &&
          (mentor.availability === "available" || mentor.availability === "limited_capacity") &&
          !sentMentorIds.has(mentor.id),
      )
      .map((mentor) => ({
        mentor,
        shared: overlap(proposalWords, tokens(`${mentor.researchAreas ?? ""} ${mentor.methods ?? ""}`)),
      }))
      .sort((left, right) => right.shared - left.shared);
  }, [matches, mentors, selected]);
  const fitScore = FIT_DIMENSIONS.reduce((sum, item) => sum + Number(fit[item.key] || 0), 0);

  async function send() {
    if (!selected || !mentorId) return;
    const mentor = mentors.find((item) => item.id === mentorId);
    if (!mentor) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const id = await sendMatchOpportunity({
        proposal: selected,
        mentorId,
        mentorName: mentor.name || "Senior Researcher",
        fit,
        note,
      });
      setMatches((current) => [
        {
          id,
          proposalId: selected.id,
          mentorId,
          mentorName: mentor.name,
          fitScore,
          response: "pending",
          introduced: false,
        },
        ...current,
      ]);
      setProposals((current) =>
        current.map((item) => (item.id === selected.id ? { ...item, status: "matching" } : item)),
      );
      setNote("");
      setFit(EMPTY_FIT);
      setMessage("Sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the opportunity.");
    } finally {
      setBusy(false);
    }
  }

  async function introduce(match: MatchRow) {
    if (!match.proposalId || !match.mentorId || !match.mentorName) return;
    setBusy(true);
    setError("");
    try {
      await introduceMatch({
        id: match.id,
        proposalId: match.proposalId,
        mentorId: match.mentorId,
        mentorName: match.mentorName,
      });
      setMatches((current) => current.map((item) => (item.id === match.id ? { ...item, introduced: true } : item)));
      const remaining = proposals.filter((item) => item.id !== match.proposalId);
      setProposals(remaining);
      if (selectedId === match.proposalId) setSelectedId(remaining[0]?.id || "");
      const proposal = proposals.find((item) => item.id === match.proposalId);
      const senior = directory.find((item) => item.id === match.mentorId);
      const owner = directory.find((item) => item.id === String(proposal?.ownerId ?? ""));
      const title = String(proposal?.title || "Untitled proposal");
      setIntroductionDraft(
        introductionEmail({
          title,
          projectId: match.proposalId,
          scoping: "",
          parties: [
            named(String(proposal?.name || owner?.displayName || "Researcher"), owner?.email || ""),
            named(match.mentorName || senior?.displayName || "Senior Researcher", senior?.email || ""),
          ],
        }),
      );
      setMessage(`Introduced ${match.mentorName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record the introduction.");
    } finally {
      setBusy(false);
    }
  }

  if (profile?.role !== "admin") {
    return <div className="empty">Senior Researcher matching is limited to TRI AI admin.</div>;
  }
  if (!loaded && !error) return <Loader label="Loading matching" />;
  if (error && proposals.length === 0) return <p className="error">{error}</p>;
  if (proposals.length === 0) {
    return (
      <div>
        <div className="empty">
          No proposals are waiting for matching.
        </div>
        <EmailSupport draft={introductionDraft} />
      </div>
    );
  }

  return (
    <div>
      <h2><Mark name="match">Matching</Mark></h2>
      <div className="filters">
        <select aria-label="Proposal" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
          {proposals.map((item) => (
            <option key={item.id} value={item.id}>
              {String(item.title || "Untitled")}
            </option>
          ))}
        </select>
      </div>
      {selected ? (
        <p>
          {String(selected.name || "Researcher")} · {String(selected.researchArea || "Area not set")}{" "}
          {selected.status ? <StatusChip status={String(selected.status)} /> : null}
        </p>
      ) : null}
      {proposalMatches.length > 0 ? (
        <div className="table-wrap" style={{ margin: "16px 0" }}>
          <table>
            <thead>
              <tr>
                <th>Senior Researcher</th>
                <th>Request</th>
                <th>Fit</th>
                <th>Response</th>
                <th>Introduction</th>
              </tr>
            </thead>
            <tbody>
              {proposalMatches.map((match) => (
                <tr key={match.id}>
                  <td>{match.mentorName || "Senior Researcher"}</td>
                  <td>{match.invited === false ? "Expressed interest" : "Sent"}</td>
                  <td>{match.fitScore ?? 0} / 25</td>
                  <td>
                    <StatusChip status={match.response || "pending"} />
                    {match.responseNote ? <div className="quiet">{match.responseNote}</div> : null}
                  </td>
                  <td>
                    {match.introduced ? (
                      "Introduced"
                    ) : match.response === "interested" || match.response === "interested_with_questions" ? (
                      <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void introduce(match)}>
                        Introduce
                      </button>
                    ) : (
                      "Waiting for a response"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="review-grid">
        <div>
          <h3>Suggested Senior Researchers</h3>
          {suggestions.length === 0 ? (
            <div className="empty">No one else in the pool is available for this proposal.</div>
          ) : (
            <div className="fields" style={{ marginTop: 12 }}>
              {suggestions.map(({ mentor, shared }) => (
                <button
                  key={mentor.id}
                  type="button"
                  className={mentorId === mentor.id ? "choice is-selected" : "choice"}
                  onClick={() => setMentorId(mentor.id)}
                >
                  <strong>{mentor.name || "Unnamed"}</strong>
                  <span className="quiet">
                    {mentor.researchAreas || "Research areas not set"} · {mentor.availability?.replaceAll("_", " ")} ·
                    capacity {mentor.capacity || "—"}
                    {shared > 0 ? ` · ${shared} shared terms` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <form
          className="fields"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <h3>Fit score</h3>
          <p className="quiet">Total {fitScore} / 25</p>
          {FIT_DIMENSIONS.map((item) => (
            <label key={item.key}>
              {item.label}
              <span className="quiet">Up to {item.max}</span>
              <input
                type="number"
                min={0}
                max={item.max}
                value={fit[item.key]}
                onChange={(event) =>
                  setFit((current) => ({
                    ...current,
                    [item.key]: Math.min(item.max, Math.max(0, Number(event.target.value) || 0)),
                  }))
                }
              />
            </label>
          ))}
          <label>
            Note for the Senior Researcher
            <textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          {message ? <p className="quiet">{message}</p> : null}
          {error ? <p className="error">{error}</p> : null}
          <EmailSupport draft={opportunityDraft} />
          <EmailSupport draft={introductionDraft} />
          <button className="btn btn-primary" type="submit" disabled={busy || !mentorId}>
            Send opportunity
          </button>
        </form>
      </div>
    </div>
  );
}
