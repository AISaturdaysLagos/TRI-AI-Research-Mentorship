import { Link } from "react-router-dom";

export function SeniorResearchersPage() {
  return (
    <article>
      <header className="page-intro">
        <div className="container">
          <p className="mono">For Senior Researchers</p>
          <h1>Join a retained mentor pool. Take on only the projects that fit.</h1>
          <p className="lede">
            Senior Researchers are experienced researchers who mentor selected TRI AI research
            projects. They only take on work that matches their expertise, interests, and
            availability.
          </p>
          <div className="actions">
            <Link className="btn btn-primary" to="/apply/senior-researcher">
              Join the Senior Researcher pool
            </Link>
          </div>
        </div>
      </header>
      <section className="section-tight">
        <div className="container card-grid">
          <article className="card">
            <h3>Who should apply</h3>
            <p>
              Typical applicants include current PhD students, postdoctoral researchers, research
              scientists, and experienced research practitioners with a strong record in AI or
              adjacent fields. Faculty and industry researchers may also apply.
            </p>
          </article>
          <article className="card">
            <h3>What you do</h3>
            <p>
              Review selected proposals shared by TRI AI. Choose whether to mentor a project.
              Help refine the research question, methodology, experiments, and evaluation. Meet
              the Researcher at an agreed cadence, review key outputs, and advise on publication
              or release readiness.
            </p>
          </article>
          <article className="card">
            <h3>What TRI AI provides</h3>
            <p>
              Administrative and project coordination. Approved compute or research infrastructure.
              Proposal screening and researcher matching. Internal review and publication support.
              Help sourcing collaborators where appropriate.
            </p>
          </article>
          <article className="card">
            <h3>Matching and commitment</h3>
            <p>
              TRI AI shares only proposals that appear relevant to your stated interests. You may
              accept, request more information or refinement, or decline without obligation. You
              are retained as a mentor and are not expected to supervise continuously. A project
              begins only after the Researcher, Senior Researcher, and TRI AI agree a Project
              Charter.
            </p>
          </article>
        </div>
      </section>
    </article>
  );
}
