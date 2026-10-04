const steps = [
  "TRI AI periodically opens calls for Researchers and Senior Researchers. TRI AI Saturdays is an additional internal pathway.",
  "Direct applicants submit a structured research proposal. Selected top TRI AI Saturdays projects may receive the TRI AI Saturdays Research Mentorship Award and be referred into the programme.",
  "TRI AI screens direct proposals, and reviews awarded Saturdays projects for research readiness, scope, feasibility, and mentorship needs.",
  "Approved direct proposals and research-ready award projects enter the mentor-matching pool.",
  "TRI AI shares relevant proposals with suitable Senior Researchers.",
  "A Senior Researcher may accept, request refinement, or decline a mentoring opportunity.",
  "Where there is mutual interest, TRI AI facilitates scoping and a Project Charter is agreed.",
  "The project is activated and receives the TRI AI support that has been agreed.",
  "The Researcher and Senior Researcher carry out the project, with periodic TRI AI check-ins.",
  "Completed work proceeds to internal review and an appropriate research output or publication pathway.",
];

export function HowItWorksPage() {
  return (
    <article>
      <header className="page-intro">
        <div className="container">
          <p className="mono">How It Works</p>
          <h1>A structured path from research idea to a mentored project.</h1>
          <p className="lede">
            Direct-proposal approval does not guarantee project activation. A TRI AI Saturdays
            Research Mentorship Award guarantees entry into the research mentorship route. Mentor
            assignment, final research scope, resource approval, and activation still depend on a
            suitable mentor and on research scoping.
          </p>
        </div>
      </header>
      <section className="section-tight">
        <div className="container card-grid">
          {steps.map((copy, index) => (
            <article className="card" key={copy}>
              <p className="step-index">{String(index + 1).padStart(2, "0")}</p>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </article>
  );
}
