import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader } from "../components/Loader";
import { useAuth } from "../lib/auth";
import { firebaseConfigured } from "../lib/firebase";
import { acceptProjectInvite, getProjectInvite, projectMembership } from "../lib/records";
import type { Role } from "../types/domain";

type InviteRecord = {
  id: string;
  projectId?: string;
  projectTitle?: string;
  role?: string;
  status?: string;
  awardId?: string;
  guestName?: string;
  guestEmail?: string;
};

function roleLabel(role: string | undefined) {
  return role === "senior_researcher" ? "Senior Researcher" : "Researcher";
}

function accountLabel(role: Role | undefined) {
  if (role === "senior_researcher") return "Senior Researcher";
  if (role === "researcher") return "Researcher";
  if (role === "admin") return "TRI AI admin";
  if (role === "reviewer") return "TRI AI reviewer";
  return "this account";
}

export function JoinProjectPage() {
  const { token } = useParams();
  const { configured, user, profile } = useAuth();
  const [invite, setInvite] = useState<InviteRecord | null | undefined>(undefined);
  const [member, setMember] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMessage("");
    setError("");
    setMember(false);
    if (!token || !firebaseConfigured) {
      setInvite(null);
      return;
    }
    setInvite(undefined);
    getProjectInvite(token)
      .then((row) => setInvite((row as InviteRecord | null) ?? null))
      .catch(() => setInvite(null));
  }, [token]);

  useEffect(() => {
    if (!invite?.projectId || !user) return;
    void projectMembership(invite.projectId, user.uid).then(setMember);
  }, [invite?.projectId, user]);

  async function onJoin() {
    if (!token || !user || !profile) return;
    if (profile.role !== "researcher" && profile.role !== "senior_researcher") return;
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const result = await acceptProjectInvite(
        token,
        user.uid,
        profile.displayName || user.email || "Participant",
        profile.role,
      );
      setMember(true);
      setMessage(result === "already" ? "You are already on this project." : "You have joined this project.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join this project.");
    } finally {
      setBusy(false);
    }
  }

  const role = invite?.role === "senior_researcher" ? "senior_researcher" : "researcher";
  const accountQuery = new URLSearchParams();
  if (token) accountQuery.set("next", `/join/${token}`);
  accountQuery.set("role", role);
  const signInHref = `/login?${accountQuery.toString()}`;
  accountQuery.set("mode", "create");
  if (invite?.guestName) accountQuery.set("name", invite.guestName);
  if (invite?.guestEmail) accountQuery.set("email", invite.guestEmail);
  const createHref = `/login?${accountQuery.toString()}`;
  const roleMatches = profile?.role === invite?.role;

  return (
    <article>
      <header className="page-intro">
        <div className="container">
          <p className="mono">Project invite</p>
          <h1>Join this project.</h1>
        </div>
      </header>
      <section className="section-tight">
        <div className="container" style={{ maxWidth: 760 }}>
          {invite === undefined ? <Loader label="Checking this invite" /> : null}
          {invite === null ? (
            <div className="empty">
              {configured
                ? "This invite link is not active."
                : "This invite cannot be opened."}{" "}
              <Link className="btn btn-ghost btn-compact" to="/how-it-works">See how the programme works</Link>.
            </div>
          ) : null}
          {invite && invite.status !== "open" ? (
            <div className="empty">This invite link is closed.</div>
          ) : null}
          {invite && invite.status === "open" ? (
            <div className="notice">
              <strong>{invite.projectTitle || "Project"}</strong>
              <p>
                You are invited as a {roleLabel(invite.role)}.
              </p>
              {invite.guestName ? (
                <p>
                  This invite is for {invite.guestName}
                  {invite.guestEmail ? ` (${invite.guestEmail})` : ""}.
                </p>
              ) : null}
              {invite.awardId ? (
                <p>
                  <Link className="btn btn-ghost btn-compact" to={`/award/${invite.awardId}`}>
                    Open the TRI AI Saturdays Award page
                  </Link>
                </p>
              ) : null}
              {!user || !profile ? (
                <div className="actions" style={{ marginTop: 12 }}>
                  <Link className="btn btn-primary btn-compact" to={createHref}>
                    Create an account
                  </Link>
                  <Link className="btn btn-ghost btn-compact" to={signInHref}>
                    I already have an account
                  </Link>
                  <p className="quiet">Then you return here to join.</p>
                </div>
              ) : null}
              {profile && !roleMatches ? (
                <p>
                  This invite needs a {roleLabel(invite.role)} account. You are signed in as{" "}
                  {accountLabel(profile.role)}.
                </p>
              ) : null}
              {profile && roleMatches && member ? (
                <p>
                  You are on this project. <Link className="btn btn-primary btn-compact" to="/dashboard">Open your dashboard</Link>.
                </p>
              ) : null}
              {profile && roleMatches && !member ? (
                <div className="actions" style={{ marginTop: 12 }}>
                  <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void onJoin()}>
                    Join this project
                  </button>
                </div>
              ) : null}
              {message ? <p>{message}</p> : null}
              {error ? <p className="error">{error}</p> : null}
            </div>
          ) : null}
        </div>
      </section>
    </article>
  );
}
