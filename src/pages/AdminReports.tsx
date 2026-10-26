import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Mark } from "../components/Icon";
import { HealthMark } from "../components/StatusChip";
import { Loader } from "../components/Loader";
import { useAuth } from "../lib/auth";
import { listProjects, listProposals } from "../lib/records";
import { peekRead, reads } from "../lib/readCache";
import { userFacingError } from "../lib/errors";
import { SearchSelect } from "../components/SearchSelect";
import { projectTypeLabel } from "../types/domain";

type ProposalRow = { id: string; title?: string; status?: string; route?: string; researchArea?: string };
type ProjectRow = {
  id: string;
  title?: string;
  status?: string;
  health?: string;
  researchArea?: string;
  awardId?: string;
  proposalId?: string;
};

function countBy(rows: string[]) {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row, (counts.get(row) || 0) + 1);
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const body = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function warmReports() {
  const proposals = peekRead<ProposalRow[]>(reads.proposals);
  const projects = peekRead<ProjectRow[]>(reads.projects);
  if (!proposals || !projects) return undefined;
  return { proposals, projects };
}

export function AdminReportsPage() {
  const { profile } = useAuth();
  const warm = warmReports();
  const [proposals, setProposals] = useState<ProposalRow[]>(() => warm?.proposals ?? []);
  const [projects, setProjects] = useState<ProjectRow[]>(() => warm?.projects ?? []);
  const [route, setRoute] = useState("all");
  const [loaded, setLoaded] = useState(() => warm !== undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile?.role !== "admin") return;
    Promise.all([listProposals(), listProjects()])
      .then(([proposalRows, projectRows]) => {
        setProposals(proposalRows as ProposalRow[]);
        setProjects(projectRows as ProjectRow[]);
      })
      .catch((err: unknown) => setError(userFacingError(err, "Could not load reports.")))
      .finally(() => setLoaded(true));
  }, [profile?.role]);

  const awardProposalIds = useMemo(
    () => new Set(projects.filter((project) => project.awardId && project.proposalId).map((project) => project.proposalId)),
    [projects],
  );

  function proposalRoute(row: ProposalRow) {
    if (row.route === "saturdays" || awardProposalIds.has(row.id)) return "saturdays";
    return "direct";
  }

  const visibleProposals = proposals.filter((row) => route === "all" || proposalRoute(row) === route);
  const visibleProjects = projects.filter((row) => {
    if (route === "all") return true;
    return route === "saturdays" ? Boolean(row.awardId) : !row.awardId;
  });
  const proposalCounts = countBy(visibleProposals.map((row) => row.status || "unspecified"));
  const projectCounts = countBy(visibleProjects.map((row) => row.status || "unspecified"));
  const healthCounts = countBy(visibleProjects.map((row) => row.health || "green"));

  if (!profile) return null;
  if (profile.role !== "admin") return <Navigate to="/admin" replace />;
  if (error) return <p className="error">{error}</p>;
  if (!loaded) return <Loader label="Loading reports" />;

  return (
    <div>
      <h2><Mark name="report">Reports</Mark></h2>
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
      </div>
      <h3>Proposals</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {proposalCounts.map(([status, count]) => (
              <tr key={status}>
                <td>{status.replaceAll("_", " ")}</td>
                <td>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Projects</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {projectCounts.map(([status, count]) => (
              <tr key={status}>
                <td>{status.replaceAll("_", " ")}</td>
                <td>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Project health</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Health</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {healthCounts.map(([health, count]) => (
              <tr key={health}>
                <td><HealthMark health={health} /></td>
                <td>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="button-row">
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => {
            const rows = [
              ["Record", "Title", "Route", "Status", "Health", "Research area"],
              ...visibleProposals.map((row) => [
                "Proposal",
                row.title || "Untitled",
                proposalRoute(row) === "saturdays" ? "TRI AI Saturdays Research Award" : "Direct proposal",
                row.status || "",
                "",
                row.researchArea || "",
              ]),
              ...visibleProjects.map((row) => [
                "Project",
                row.title || "Untitled",
                projectTypeLabel(row),
                row.status || "",
                row.health || "green",
                row.researchArea || "",
              ]),
            ];
            downloadCsv("tri-ai-programme-report.csv", rows);
          }}
        >
          Export this view
        </button>
      </div>
    </div>
  );
}
