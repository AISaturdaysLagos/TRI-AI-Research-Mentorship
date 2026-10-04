import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet } from "react-router-dom";
import { StatusChip } from "../components/StatusChip";
import { useAuth } from "../lib/auth";
import { listProposals } from "../lib/records";

const links = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/proposals", label: "Proposals" },
  { to: "/admin/matching", label: "Matching" },
  { to: "/admin/projects", label: "Projects" },
  { to: "/admin/mentors", label: "Mentors" },
  { to: "/admin/reports", label: "Reports" },
];

export function AdminLayout() {
  const { profile } = useAuth();
  if (!profile) return null;
  if (profile.role !== "admin" && profile.role !== "reviewer") {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <article>
      <header className="page-intro">
        <div className="container">
          <p className="mono">TRI AI {profile.role}</p>
          <h1>Programme workspace</h1>
          <nav className="actions" aria-label="Admin">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => (isActive ? "btn btn-primary" : "btn btn-ghost")}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <section className="section-tight">
        <div className="container">
          <Outlet />
        </div>
      </section>
    </article>
  );
}

export function AdminHomePage() {
  return (
    <div className="card-grid">
      <article className="card">
        <h3>Review</h3>
        <p>Read incoming proposals and Saturdays scoping notes before matching.</p>
      </article>
      <article className="card">
        <h3>Match</h3>
        <p>Mentor acceptance stays voluntary. Record the response on the match.</p>
      </article>
      <article className="card">
        <h3>Release</h3>
        <p>A project reaches the public research page only when you mark it publishable.</p>
      </article>
    </div>
  );
}

type ProposalRow = {
  id: string;
  title?: string;
  name?: string;
  status?: string;
  route?: string;
};

export function AdminProposalsPage() {
  const [rows, setRows] = useState<ProposalRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    listProposals()
      .then((items) => setRows(items as ProposalRow[]))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load proposals."));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (rows.length === 0) return <div className="empty">No proposals in the record yet.</div>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Proposal</th>
            <th>Researcher</th>
            <th>Route</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.title || "Untitled"}</td>
              <td>{row.name || "—"}</td>
              <td>{row.route || "direct"}</td>
              <td>{row.status ? <StatusChip status={row.status} /> : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminPlaceholder({ title, copy }: { title: string; copy: string }) {
  return (
    <div>
      <h2>{title}</h2>
      <div className="empty" style={{ marginTop: 16 }}>
        {copy}
      </div>
    </div>
  );
}
