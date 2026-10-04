import { Link } from "react-router-dom";

export function ResearchersPage() {
  return (
    <article>
      <header className="page-intro">
        <div className="container">
          <p className="mono">For Researchers</p>
          <h1>Turn strong AI research ideas into rigorous, supported projects.</h1>
          <p className="lede">
            The Researcher Programme helps students and early-career researchers do that work with
            experienced mentorship.
          </p>
          <div className="actions">
            <Link className="btn btn-primary" to="/apply/researcher">
              Apply as a Researcher
            </Link>
          </div>
        </div>
      </header>
      <section className="section-tight">
        <div className="container card-grid">
          <article className="card">
            <h3>Direct Proposal Route</h3>
            <p>
              Submit a specific research proposal for TRI AI review. Direct applicants should have
              enough technical or research experience to formulate a research question and
              contribute substantially to the work. Students and early-career researchers are
              especially encouraged.
            </p>
            <p>
              A proposal may be shortlisted for mentor matching, returned for refinement, held
              until an appropriate mentor is available, or declined. Shortlisting does not
              guarantee that a project will launch.
            </p>
          </article>
          <article className="card">
            <h3>TRI AI Saturdays Research Mentorship Award</h3>
            <p>
              Selected top student projects may be awarded research mentorship based on project
              performance and research potential. The award recognises strong project performance
              and the potential to develop the work into rigorous research.
            </p>
            <p>
              Recipients do not restart the application. TRI AI uses the existing project as the
              starting point and asks only for the information needed to turn it into a research
              plan. The award guarantees entry into the mentorship route. The mentor, research
              scope, resource allocation, and activation timeline depend on fit, readiness, and
              availability.
            </p>
          </article>
          <article className="card">
            <h3>What TRI AI provides</h3>
            <p>Subject to approval and availability:</p>
            <p>
              Research mentorship. Compute or infrastructure support. Administrative and project
              coordination. Internal research review. Publication and dissemination support. Access
              to additional collaborators where useful.
            </p>
          </article>
          <article className="card">
            <h3>What you take on</h3>
            <p>
              Most projects should initially target approximately 3–6 months. You drive the project,
              prepare for mentor meetings, keep clear research records, communicate blockers early,
              and follow responsible research and data practices.
            </p>
            <p>
              Projects may produce papers, preprints, technical reports, datasets, benchmarks,
              models, software, prototypes, or other credible research artefacts. Publication is
              not guaranteed. The quality of the research is the primary standard.
            </p>
          </article>
        </div>
      </section>
    </article>
  );
}
