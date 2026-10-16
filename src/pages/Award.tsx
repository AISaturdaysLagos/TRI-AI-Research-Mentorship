import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader } from "../components/Loader";
import { useAuth } from "../lib/auth";
import { firebaseConfigured } from "../lib/firebase";
import { getAward, projectMembership } from "../lib/records";

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
  const { user, configured } = useAuth();
  const [award, setAward] = useState<AwardRecord | null | undefined>(undefined);
  const [member, setMember] = useState(false);

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
    if (!user || !award?.projectId) {
      setMember(false);
      return;
    }
    void projectMembership(award.projectId, user.uid).then(setMember);
  }, [award?.projectId, user]);

  const researchers = uniqueNames(award?.researchers, award?.recipients);
  const seniors = uniqueNames(award?.seniorResearchers);

  return (
    <article>
      <header className="page-intro">
        <div className="container">
          <p className="mono">TRI AI Saturdays Research Award</p>
          <h1>TRI AI Saturdays Research Award</h1>
          <p className="lede">This invite opens the award project for the people named below.</p>
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
              <Link className="btn btn-ghost btn-compact" to="/how-it-works">See how the programme works</Link>.
            </div>
          ) : null}
          {award ? (
            <div className="fields">
              <div className="notice">
                <p className="mono">TRI AI Saturdays Research Award</p>
                <strong>{award.title || "TRI AI Saturdays Research Award"}</strong>
                {award.summary ? <p>{award.summary}</p> : null}
                {award.note ? <p>{award.note}</p> : null}
                <People title="Researchers" names={researchers} />
                <People title="Senior Researchers" names={seniors} />
              </div>
              {!user ? (
                <p>
                  <Link className="btn btn-primary btn-compact" to={`/login?next=/award/${token || ""}`}>
                    Sign in
                  </Link>{" "}
                  to open this award.
                </p>
              ) : null}
              {user && member && award.projectId ? (
                <p>
                  <Link className="btn btn-primary btn-compact" to={`/dashboard/projects/${award.projectId}`}>
                    Open the project
                  </Link>
                </p>
              ) : null}
              {user && !member ? (
                <p className="quiet">Join the project from your invite link to work on it in the workspace.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </article>
  );
}
