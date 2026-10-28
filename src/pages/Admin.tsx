import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet } from "react-router-dom";
import { Icon, type IconName } from "../components/Icon";
import { Loader } from "../components/Loader";
import { StatusChip } from "../components/StatusChip";
import { useAuth } from "../lib/auth";
import { prefetchAdminWorkspace, prefetchReviewerWorkspace } from "../lib/prefetchWorkspace";
import { listProjects, listProposals } from "../lib/records";
import { peekRead, reads } from "../lib/readCache";
import { userFacingError } from "../lib/errors";
import { SearchSelect } from "../components/SearchSelect";

export { AdminMentorsPage, AdminResearchersPage } from "./AdminPeople";

const links: { to: string; label: string; icon: IconName; adminOnly?: boolean }[] = [
  { to: "/admin/tasks", label: "Tasks", icon: "task" },
  { to: "/admin/proposals", label: "Proposals", icon: "document" },
  { to: "/admin/matching", label: "Matching", icon: "match" },
  { to: "/admin/meetings", label: "Scoping meetings", icon: "meeting", adminOnly: true },
  { to: "/admin/projects", label: "Projects", icon: "projects" },
  { to: "/admin/researchers", label: "Researchers", icon: "researcher", adminOnly: true },
  { to: "/admin/mentors", label: "Senior Researchers", icon: "senior", adminOnly: true },
  { to: "/admin/reports", label: "Reports", icon: "report" },
];

export function AdminLayout() {
  const { user, profile } = useAuth();
  if (!profile) return null;
  if (profile.role !== "admin" && profile.role !== "reviewer") {
    return <Navigate to="/dashboard" replace />;
  }
  if (profile.role === "admin" && user) prefetchAdminWorkspace(user.uid);
  if (profile.role === "reviewer") prefetchReviewerWorkspace();
  return (
    <article>
      <header className="page-intro work">
        <div className="container">
          <p className="mono">TRI AI {profile.role}</p>
          <h1>Programme workspace</h1>
          <nav className="section-nav" aria-label="Admin">
            {links.filter((link) => !link.adminOnly || profile.role === "admin").map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => (isActive ? "is-active" : undefined)}
              >
                <Icon name={link.icon} />
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

/** `/admin` lands on Tasks. Reviewers see their own task list on that route. */
export function AdminHomePage() {
  const { profile } = useAuth();
  if (!profile) return null;
  return <Navigate to="/admin/tasks" replace />;
}

type ProposalRow = {
  id: string;
  title?: string;
  name?: string;
  status?: string;
  route?: string;
};

function proposalRows(items: ProposalRow[], projects: { proposalId?: string }[]) {
  const projectProposalIds = new Set(
    projects.map((project) => project.proposalId).filter((id): id is string => Boolean(id)),
  );
  return items.filter((row) => !projectProposalIds.has(row.id));
}

function warmProposals() {
  const items = peekRead<ProposalRow[]>(reads.proposals);
  const projects = peekRead<{ proposalId?: string }[]>(reads.projects);
  if (!items || !projects) return undefined;
  return proposalRows(items, projects);
}

export function AdminProposalsPage() {
  const warm = warmProposals();
  const [rows, setRows] = useState<ProposalRow[]>(() => warm ?? []);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(() => warm !== undefined);
  const [route, setRoute] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    Promise.all([listProposals(), listProjects()])
      .then(([items, projects]) => {
        setRows(proposalRows(items as ProposalRow[], projects as { proposalId?: string }[]));
      })
      .catch((err: unknown) => setError(userFacingError(err, "Could not load proposals.")))
      .finally(() => setLoaded(true));
  }, []);

  const visible = rows.filter((row) => {
    const rowRoute = row.route || "direct";
    const rowStatus = row.status || "";
    return (route === "all" || rowRoute === route) && (status === "all" || rowStatus === status);
  });
  const statuses = [...new Set(rows.map((row) => row.status).filter(Boolean))] as string[];

  if (error) return <p className="error">{error}</p>;
  if (!loaded) return <Loader label="Loading proposals" />;

  return (
    <div>
      <div className="filters">
        <SearchSelect
          label="Route"
          options={[
            { value: "all", label: "All routes" },
            { value: "direct", label: "Direct proposal" },
            { value: "saturdays", label: "TRI AI Saturdays Research Award" },
          ]}
          value={route}
          onChange={setRoute}
          placeholder="Route…"
        />
        <SearchSelect
          label="Status"
          options={[
            { value: "all", label: "All statuses" },
            ...statuses.map((item) => ({ value: item, label: item.replaceAll("_", " ") })),
          ]}
          value={status}
          onChange={setStatus}
          placeholder="Status…"
        />
      </div>
      {visible.length === 0 ? (
        <div className="empty">No proposals are waiting.</div>
      ) : (
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
              {visible.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link className="btn btn-ghost btn-compact" to={`/admin/proposals/${row.id}`}>
                      {row.title || "Untitled"}
                    </Link>
                  </td>
                  <td>{row.name || "—"}</td>
                  <td>{row.route === "saturdays" ? "TRI AI Saturdays Research Award" : "Direct proposal"}</td>
                  <td>{row.status ? <StatusChip status={row.status} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
