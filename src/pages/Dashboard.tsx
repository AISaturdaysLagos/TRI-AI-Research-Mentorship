import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatusChip } from "../components/StatusChip";
import { useAuth } from "../lib/auth";
import { getSeniorProfile, listMentorMatches, listOwnedProposals } from "../lib/records";

type Row = {
  id: string;
  title?: string;
  status?: string;
  researchArea?: string;
  response?: string;
};

export function DashboardPage() {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [mentor, setMentor] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!user || !profile) return;
    if (profile.role === "researcher") {
      listOwnedProposals(user.uid)
        .then((items) => setRows(items as Row[]))
        .catch(() => setRows([]));
    }
    if (profile.role === "senior_researcher") {
      getSeniorProfile(user.uid)
        .then((item) => setMentor(item))
        .catch(() => setMentor(null));
      listMentorMatches(user.uid)
        .then((items) => setRows(items as Row[]))
        .catch(() => setRows([]));
    }
  }, [profile, user]);

  if (!profile || !user) return null;

  return (
    <article>
      <header className="page-intro">
        <div className="container">
          <p className="mono">{profile.role.replaceAll("_", " ")}</p>
          <h1>{profile.displayName || "Your dashboard"}</h1>
          <p className="lede">Records for your role. Public pages stay separate from this workspace.</p>
        </div>
      </header>
      <section className="section-tight">
        <div className="container dash-grid">
          <div>
            {profile.role === "researcher" ? (
              <>
                <h2>Your proposals</h2>
                {rows.length === 0 ? (
                  <div className="empty" style={{ marginTop: 16 }}>
                    No proposal in the programme record yet.{" "}
                    <Link to="/apply/researcher">Start a direct proposal</Link>.
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
                            <td>{row.title || "Untitled"}</td>
                            <td>{row.researchArea || "—"}</td>
                            <td>{row.status ? <StatusChip status={row.status} /> : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : null}
            {profile.role === "senior_researcher" ? (
              <>
                <h2>Match requests</h2>
                {rows.length === 0 ? (
                  <div className="empty" style={{ marginTop: 16 }}>
                    No match requests yet. TRI sends one when there is a fit.
                  </div>
                ) : (
                  <div className="table-wrap" style={{ marginTop: 16 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Request</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.id}>
                            <td>{row.title || row.id}</td>
                            <td>
                              <StatusChip status={row.response || row.status || "pending"} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : null}
            {profile.role === "admin" || profile.role === "reviewer" ? (
              <div className="empty">
                Programme operations live in the admin workspace.{" "}
                <Link to="/admin">Open admin</Link>.
              </div>
            ) : null}
          </div>
          <aside className="card">
            <p className="mono">Account</p>
            <h3 style={{ margin: "8px 0" }}>{profile.email}</h3>
            {profile.role === "researcher" ? (
              <p className="quiet">Award invites open from the link in your email, not from a second form.</p>
            ) : null}
            {profile.role === "senior_researcher" ? (
              <p className="quiet">
                {mentor
                  ? `Availability: ${String(mentor.availability ?? "available").replaceAll("_", " ")}.`
                  : "Your mentor profile is not saved yet."}{" "}
                <Link to="/apply/senior-researcher">Edit profile</Link>.
              </p>
            ) : null}
          </aside>
        </div>
      </section>
    </article>
  );
}
