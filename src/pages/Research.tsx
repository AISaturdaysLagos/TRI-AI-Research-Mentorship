import { useEffect, useMemo, useState } from "react";
import { Loader } from "../components/Loader";
import { StatusChip } from "../components/StatusChip";
import { firebaseConfigured } from "../lib/firebase";
import { listResearchProjects } from "../lib/records";
import { OUTPUT_TYPES, listPublicOutputs, type OutputRecord } from "../lib/workspace";

type NamedPerson = { name?: string };

type PublicProject = {
  id: string;
  title?: string;
  researchArea?: string;
  summary?: string;
  question?: string;
  contribution?: string;
  year?: string;
  status?: string;
  researchers?: NamedPerson[];
  seniorResearchers?: NamedPerson[];
};

function personNames(people?: NamedPerson[]) {
  const names = (people ?? []).map((person) => person.name).filter(Boolean);
  return names.length > 0 ? names.join(", ") : "";
}

export function ResearchPage() {
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [outputs, setOutputs] = useState<Record<string, OutputRecord[]>>({});
  const [area, setArea] = useState("all");
  const [year, setYear] = useState("all");
  const [outputType, setOutputType] = useState("all");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoaded(true);
      return;
    }
    listResearchProjects()
      .then(async (rows) => {
        const list = rows as PublicProject[];
        const pairs = await Promise.all(
          list.map(async (project) => [project.id, await listPublicOutputs(project.id).catch(() => [])] as const),
        );
        setProjects(list);
        setOutputs(Object.fromEntries(pairs));
      })
      .catch(() => setProjects([]))
      .finally(() => setLoaded(true));
  }, []);

  const areas = useMemo(
    () => ["all", ...new Set(projects.map((project) => project.researchArea).filter(Boolean) as string[])],
    [projects],
  );
  const years = useMemo(() => {
    const values = [...new Set(projects.map((project) => project.year).filter(Boolean) as string[])].sort();
    return ["all", ...values];
  }, [projects]);
  const visible = projects.filter((project) => {
    if (area !== "all" && project.researchArea !== area) return false;
    if (year !== "all" && project.year !== year) return false;
    if (outputType !== "all" && !(outputs[project.id] ?? []).some((item) => item.type === outputType)) return false;
    return true;
  });

  return (
    <article>
      <header className="page-intro">
        <div className="container">
          <p className="mono">Research projects and outputs</p>
          <h1>Current TRI AI research projects.</h1>
          <p className="lede">Current projects and their outputs.</p>
        </div>
      </header>
      <section className="section-tight">
        <div className="container">
          <div className="filters">
            <label>
              Research area
              <select value={area} onChange={(event) => setArea(event.target.value)}>
                {areas.map((item) => (
                  <option key={item} value={item}>
                    {item === "all" ? "All areas" : item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Year
              <select value={year} onChange={(event) => setYear(event.target.value)}>
                {years.map((item) => (
                  <option key={item} value={item}>
                    {item === "all" ? "All years" : item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Output
              <select value={outputType} onChange={(event) => setOutputType(event.target.value)}>
                <option value="all">All outputs</option>
                {OUTPUT_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!loaded ? <Loader label="Loading research projects" /> : null}
          {loaded && visible.length === 0 ? (
            <div className="empty">
              No projects yet.
            </div>
          ) : null}
          {loaded ? (
          <div className="card-grid">
            {visible.map((project) => (
              <article className="card" key={project.id}>
                <p className="mono">{project.researchArea || "Research"}</p>
                <h3>{project.title || "Untitled project"}</h3>
                <p>{project.question || project.summary || "A summary has not been added yet."}</p>
                {project.status ? (
                  <p>
                    <StatusChip status={project.status} />
                  </p>
                ) : null}
                {project.contribution ? <p className="quiet">{project.contribution}</p> : null}
                {project.year ? <p className="quiet">Year {project.year}</p> : null}
                {(outputs[project.id] ?? []).length > 0 ? (
                  <ul className="output-links">
                    {(outputs[project.id] ?? []).map((item) => (
                      <li key={item.id}>
                        {item.link ? <a href={item.link}>{item.title || item.link}</a> : item.title}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {personNames(project.researchers) ? (
                  <p className="quiet">Researchers: {personNames(project.researchers)}</p>
                ) : null}
                {personNames(project.seniorResearchers) ? (
                  <p className="quiet">Senior Researchers: {personNames(project.seniorResearchers)}</p>
                ) : null}
              </article>
            ))}
          </div>
          ) : null}
        </div>
      </section>
    </article>
  );
}
