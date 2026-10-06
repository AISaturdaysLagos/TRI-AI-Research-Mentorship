import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet } from "react-router-dom";
import { AttentionNotices } from "../components/AttentionNotices";
import { Icon, Mark, type IconName } from "../components/Icon";
import { EmailSupport } from "../components/EmailSupport";
import { Loader } from "../components/Loader";
import { StatusChip } from "../components/StatusChip";
import { useAuth } from "../lib/auth";
import { named, seniorWelcomeEmail } from "../lib/email";
import { listDirectory, listProjects, listProposals, listSeniorProfiles, updateMentorPool } from "../lib/records";
import type { MentorAvailability } from "../types/domain";

const links: { to: string; label: string; icon: IconName; end?: boolean; adminOnly?: boolean }[] = [
  { to: "/admin", label: "Overview", icon: "overview", end: true },
  { to: "/admin/tasks", label: "Tasks", icon: "task", adminOnly: true },
  { to: "/admin/proposals", label: "Proposals", icon: "document" },
  { to: "/admin/matching", label: "Matching", icon: "match" },
  { to: "/admin/meetings", label: "Scoping meetings", icon: "meeting", adminOnly: true },
  { to: "/admin/projects", label: "Projects", icon: "projects" },
  { to: "/admin/mentors", label: "Senior Researchers", icon: "senior" },
  { to: "/admin/reports", label: "Reports", icon: "report" },
];

export function AdminLayout() {
  const { profile } = useAuth();
  if (!profile) return null;
  if (profile.role !== "admin" && profile.role !== "reviewer") {
    return <Navigate to="/dashboard" replace />;
  }
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
                end={link.end}
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
          <AttentionNotices />
          <Outlet />
        </div>
      </section>
    </article>
  );
}

const overviewSteps = [
  [
    "01",
    "Review",
    "Read the proposal or the scoping notes.",
  ],
  [
    "02",
    "Ready for matching",
    "Approve the proposal for matching.",
  ],
  [
    "03",
    "Send an opportunity",
    "Send the proposal to a Senior Researcher.",
  ],
  [
    "04",
    "Record the response",
    "Record whether the Senior Researcher accepts, asks for changes, or declines.",
  ],
  [
    "05",
    "Introduce and scope",
    "Record the introduction, then set the scoping meeting.",
  ],
  [
    "06",
    "Active project",
    "Mark the project scoped, record the signed Project Charter, then make it active.",
  ],
];

export function AdminHomePage() {
  return (
    <div className="card-grid">
      {overviewSteps.map(([index, title, copy], step) => (
        <article className="card" key={index}>
          <p className="step-index">{index}</p>
          <h3><Mark name={(["review", "match", "senior", "review", "meeting", "projects"] as IconName[])[step]}>{title}</Mark></h3>
          <p>{copy}</p>
        </article>
      ))}
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
  const [loaded, setLoaded] = useState(false);
  const [route, setRoute] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    Promise.all([listProposals(), listProjects()])
      .then(([items, projects]) => {
        const projectProposalIds = new Set(
          (projects as { proposalId?: string }[])
            .map((project) => project.proposalId)
            .filter((id): id is string => Boolean(id)),
        );
        setRows((items as ProposalRow[]).filter((row) => !projectProposalIds.has(row.id)));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load proposals."))
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
        <select aria-label="Route" value={route} onChange={(event) => setRoute(event.target.value)}>
          <option value="all">All routes</option>
          <option value="direct">Direct proposal</option>
          <option value="saturdays">TRI AI Saturdays Award</option>
        </select>
        <select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item.replaceAll("_", " ")}
            </option>
          ))}
        </select>
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
                  <td>{row.route === "saturdays" ? "TRI AI Saturdays Award" : "Direct proposal"}</td>
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

const mentorAvailability: MentorAvailability[] = [
  "available",
  "limited_capacity",
  "at_capacity",
  "temporarily_unavailable",
  "inactive",
];

type MentorRow = {
  id: string;
  name?: string;
  affiliation?: string;
  researchAreas?: string;
  methods?: string;
  capacity?: string;
  availability?: MentorAvailability;
  poolStatus?: string;
};

export function AdminMentorsPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<MentorRow[]>([]);
  const [directory, setDirectory] = useState<{ id: string; email: string; displayName: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile?.role !== "admin") return;
    Promise.all([listSeniorProfiles(), listDirectory()])
      .then(([items, people]) => {
        setRows(items as MentorRow[]);
        setDirectory(people);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load the Senior Researcher pool."))
      .finally(() => setLoaded(true));
  }, [profile?.role]);

  async function save(row: MentorRow, availability: MentorAvailability, poolStatus: "pending" | "in_pool") {
    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, availability, poolStatus } : item)));
    try {
      await updateMentorPool(row.id, availability, poolStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the Senior Researcher.");
    }
  }

  if (profile?.role !== "admin") {
    return <div className="empty">Senior Researcher pool management is limited to TRI AI admin.</div>;
  }
  if (error) return <p className="error">{error}</p>;
  if (!loaded) return <Loader label="Loading Senior Researchers" />;
  if (rows.length === 0) return <div className="empty">No Senior Researcher profiles in the pool yet.</div>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Senior Researcher</th>
            <th>Expertise</th>
            <th>Capacity</th>
            <th>Availability</th>
            <th>Pool</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                {row.name || "Unnamed"}
                <br />
                <span className="quiet">{row.affiliation || "—"}</span>
              </td>
              <td>
                {row.researchAreas || "—"}
                <br />
                <span className="quiet">{row.methods || ""}</span>
              </td>
              <td>{row.capacity || "—"}</td>
              <td>
                <select
                  aria-label={`Availability for ${row.name || "Senior Researcher"}`}
                  value={row.availability || "available"}
                  onChange={(event) =>
                    void save(row, event.target.value as MentorAvailability, row.poolStatus === "in_pool" ? "in_pool" : "pending")
                  }
                >
                  {mentorAvailability.map((item) => (
                    <option key={item} value={item}>
                      {item.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  aria-label={`Pool status for ${row.name || "Senior Researcher"}`}
                  value={row.poolStatus === "in_pool" ? "in_pool" : "pending"}
                  onChange={(event) =>
                    void save(
                      row,
                      row.availability || "available",
                      event.target.value === "in_pool" ? "in_pool" : "pending",
                    )
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="in_pool">In the pool</option>
                </select>
                {row.poolStatus === "in_pool" ? (
                  <EmailSupport
                    draft={seniorWelcomeEmail({
                      senior: named(
                        row.name || directory.find((person) => person.id === row.id)?.displayName || "Senior Researcher",
                        directory.find((person) => person.id === row.id)?.email || "",
                      ),
                      areas: row.researchAreas || "",
                    })}
                  />
                ) : null}
              </td>
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
