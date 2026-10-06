import { Link } from "react-router-dom";
import { Icon, Mark, type IconName } from "../components/Icon";

const steps: [string, string, string, IconName][] = [
  ["01", "Apply or qualify", "Submit a proposal, or enter with a TRI AI Saturdays Award.", "apply"],
  ["02", "Match", "TRI AI shares the project with Senior Researchers.", "match"],
  ["03", "Scope", "Agree a Project Charter.", "charter"],
  ["04", "Research", "Most projects run for about 3–6 months.", "projects"],
  ["05", "Review", "Completed work is reviewed.", "review"],
  ["06", "Publish or release", "Papers, datasets, models, and tools.", "output"],
];

export function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="mono">Researcher · Senior Researcher</p>
            <h1 className="display" style={{ margin: "16px 0" }}>
              Turn promising AI research ideas into rigorous research with a Senior Researcher.
            </h1>
            <p className="lede">
              A research programme from TRI AI. Submit a proposal, or enter with a TRI AI Saturdays Award.
            </p>
            <div className="actions">
              <Link className="btn btn-primary" to="/apply/researcher">
                <Icon name="apply" />
                Apply as a Researcher
              </Link>
              <Link className="btn btn-ghost" to="/apply/senior-researcher">
                <Icon name="senior" />
                Apply as a Senior Researcher
              </Link>
            </div>
          </div>
          <aside className="card">
            <p className="mono">Senior Researchers</p>
            <h2 style={{ margin: "12px 0 8px" }}><Mark name="senior">A retained Senior Researcher pool.</Mark></h2>
            <p>Join the Senior Researcher pool and choose the projects you take on.</p>
          </aside>
        </div>
      </section>

      <section className="section-tight">
        <div className="container">
          <hr className="gold-rule" />
          <div className="path">
            <article className="card">
              <p className="mono">Direct Proposal Route</p>
              <h3><Mark name="review">Then TRI AI review</Mark></h3>
              <p>Submit a research proposal for review.</p>
              <div className="actions">
                <Link className="btn btn-ghost" to="/apply/researcher">
                  <Icon name="apply" />
                  Apply as a Researcher
                </Link>
              </div>
            </article>
            <p className="path-join">both proceed toward Senior Researcher matching</p>
            <article className="card">
              <p className="mono">TRI AI Saturdays Award</p>
              <h3><Mark name="award">Then research readiness</Mark></h3>
              <p>Selected projects receive a TRI AI Saturdays Award and continue into the programme.</p>
              <div className="actions">
                <Link className="btn btn-ghost" to="/how-it-works">
                  <Icon name="path" />
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
          <h2 style={{ margin: "12px 0 28px" }}><Mark name="path">From a proposal or a TRI AI Saturdays Award to a project.</Mark></h2>
          <div className="step-grid">
            {steps.map(([index, title, copy, icon]) => (
              <article key={index}>
                <p className="step-index">{index}</p>
                <h3><Mark name={icon}>{title}</Mark></h3>
                <p className="quiet">{copy}</p>
              </article>
            ))}
          </div>
          <div className="actions">
            <Link className="btn btn-primary" to="/apply/researcher">
              <Icon name="apply" />
              Apply
            </Link>
            <Link className="btn btn-ghost" to="/apply/senior-researcher">
              <Icon name="senior" />
              Join the Senior Researcher pool
            </Link>
            <Link className="btn btn-ghost" to="/research">
              <Icon name="projects" />
              Research projects and outputs
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
