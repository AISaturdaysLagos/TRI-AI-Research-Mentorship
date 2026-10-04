import { useEffect, useMemo, useState } from "react";
import { firebaseConfigured } from "../lib/firebase";
import { listPublicProjects } from "../lib/records";

type PublicProject = {
  id: string;
  title?: string;
  researchArea?: string;
  summary?: string;
  status?: string;
};

export function ResearchPage() {
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [area, setArea] = useState("all");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoaded(true);
      return;
    }
    listPublicProjects()
      .then((rows) => setProjects(rows as PublicProject[]))
      .catch(() => setProjects([]))
      .finally(() => setLoaded(true));
  }, []);

  const areas = useMemo(
    () => ["all", ...new Set(projects.map((project) => project.researchArea).filter(Boolean) as string[])],
    [projects],
  );
  const visible = area === "all" ? projects : projects.filter((project) => project.researchArea === area);

  return (
    <article>
      <header className="page-intro">
        <div className="container">
          <p className="mono">Research projects and outputs</p>
          <h1>Work TRI has chosen to publish.</h1>
          <p className="lede">
            Outputs may include peer-reviewed or workshop papers, preprints, technical reports,
            open-source models or software, datasets, benchmarks, research prototypes, and
            reproducible experiments. They appear here only when TRI AI marks the project
            publishable. You can read them by research area, output, year, and relevance to
            African contexts.
          </p>
        </div>
      </header>
      <section className="section-tight">
        <div className="container">
          {areas.length > 1 ? (
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
            </div>
          ) : null}
          {!loaded ? <p className="quiet">Loading published projects…</p> : null}
          {loaded && visible.length === 0 ? (
            <div className="empty">
              {firebaseConfigured
                ? "No published projects yet. The showcase stays empty until TRI releases one."
                : "The research record is not connected yet. Published projects will appear here once Firebase is configured."}
            </div>
          ) : null}
          <div className="card-grid">
            {visible.map((project) => (
              <article className="card" key={project.id}>
                <p className="mono">{project.researchArea || "Research"}</p>
                <h3>{project.title || "Untitled project"}</h3>
                <p>{project.summary || "Summary will appear when TRI publishes it."}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </article>
  );
}
