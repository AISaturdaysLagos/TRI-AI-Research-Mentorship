import { Link } from "react-router-dom";

const steps = [
  ["01", "Apply or qualify", "Submit a direct proposal, or enter with a TRI AI Saturdays Research Mentorship Award."],
  ["02", "Match", "TRI AI shares relevant projects with Senior Researchers. Mentors accept, request refinement, or decline."],
  ["03", "Scope", "Where there is mutual interest, you agree a Project Charter."],
  ["04", "Research", "Most projects start with a target of about 3–6 months."],
  ["05", "Review", "Completed work goes through internal review before it is shared."],
  ["06", "Publish or release", "Outputs may include papers, datasets, benchmarks, models, and open-source tools."],
];

export function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="mono">Researcher · Senior Researcher</p>
            <h1 className="display" style={{ margin: "16px 0" }}>
              Turn promising AI research ideas into rigorous, mentored research.
            </h1>
            <p className="lede">
              A project-driven research programme from the TRI AI Research & Innovation Unit.
              It connects emerging researchers with experienced research mentors, and it is built
              to lower the barriers to high-quality AI research, particularly research relevant to
              Africa.
            </p>
            <div className="actions">
              <Link className="btn btn-primary" to="/apply/researcher">
                Apply as a Researcher
              </Link>
              <Link className="btn btn-ghost" to="/apply/senior-researcher">
                Apply as a Senior Researcher
              </Link>
            </div>
          </div>
          <aside className="card">
            <p className="mono">Senior Researchers</p>
            <h2 style={{ margin: "12px 0 8px" }}>A retained mentor pool.</h2>
            <p>
              Senior Researchers join a retained mentor pool and only take on projects that match
              their expertise, interests, and availability. Joining the pool does not require you
              to accept every project.
            </p>
          </aside>
        </div>
      </section>

      <section className="section-tight">
        <div className="container">
          <hr className="gold-rule" />
          <div className="path">
            <article className="card">
              <p className="mono">Direct Proposal Route</p>
              <h3>Then TRI AI review</h3>
              <p>
                Submit a specific research proposal. If it meets the programme standard, it proceeds
                toward Senior Researcher matching. Shortlisting does not guarantee that a project
                will launch.
              </p>
              <div className="actions">
                <Link className="btn btn-ghost" to="/apply/researcher">
                  Apply as a Researcher
                </Link>
              </div>
            </article>
            <p className="path-join">both proceed toward Senior Researcher matching</p>
            <article className="card">
              <p className="mono">TRI AI Saturdays Research Mentorship Award</p>
              <h3>Then research readiness</h3>
              <p>
                Selected top student projects may be awarded research mentorship based on project
                performance and research potential. Recipients do not restart the application.
              </p>
              <div className="actions">
                <Link className="btn btn-ghost" to="/how-it-works">
                  How It Works
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section band">
        <div className="container">
          <p className="mono">Programme</p>
          <h2 style={{ margin: "12px 0 28px" }}>From proposal or award to a mentored project.</h2>
          <div className="step-grid">
            {steps.map(([index, title, copy]) => (
              <article key={index}>
                <p className="step-index">{index}</p>
                <h3>{title}</h3>
                <p className="quiet">{copy}</p>
              </article>
            ))}
          </div>
          <div className="actions">
            <Link className="btn btn-primary" to="/apply/researcher">
              Apply
            </Link>
            <Link className="btn btn-ghost" to="/apply/senior-researcher">
              Join the Senior Researcher pool
            </Link>
            <Link className="btn btn-ghost" to="/research">
              Research projects and outputs
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
