import { Link } from "react-router-dom";
import { Icon, Mark, type IconName } from "../components/Icon";

const steps: [string, string, string, IconName][] = [
  ["01", "Submit a proposal", "Share a structured research idea for TRI AI review.", "apply"],
  ["02", "Match", "TRI AI shares approved proposals with Senior Researchers.", "match"],
  ["03", "Scope", "Agree a Project Charter with your Senior Researcher.", "charter"],
  ["04", "Research", "Most projects run for about 3–6 months.", "projects"],
  ["05", "Review", "Completed work is reviewed with TRI AI support.", "review"],
  ["06", "Publish or release", "Papers, datasets, models, and tools.", "output"],
];

export function HomePage() {
  return (
    <div className="home">
      <section className="hero">
        <div className="container hero-grid">
          <div className="home-hero-copy">
            <p className="mono">TRI AI Research Mentorship Programme</p>
            <h1 className="display">
              Turn a strong AI research proposal into a mentored project with a Senior Researcher.
            </h1>
            <p className="lede">
              This is TRI AI’s research mentorship programme. Submit a Direct Proposal. TRI AI reviews it, matches you
              with a Senior Researcher when it is ready, and supports the work through to release.
            </p>
            <div className="actions">
              <Link className="btn btn-primary" to="/apply/researcher">
                <Icon name="apply" />
                Submit a proposal
              </Link>
              <Link className="btn btn-ghost" to="/how-it-works">
                <Icon name="path" />
                How It Works
              </Link>
            </div>
          </div>
          <aside className="card">
            <p className="mono">Senior Researchers</p>
            <h2>
              <Mark name="senior">A retained Senior Researcher pool.</Mark>
            </h2>
            <p>Join the pool and choose which proposals you take on. Acceptance is voluntary.</p>
            <div className="actions">
              <Link className="btn btn-ghost" to="/apply/senior-researcher">
                <Icon name="senior" />
                Join as a Senior Researcher
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="section-tight">
        <div className="container home-prose">
          <hr className="gold-rule" />
          <p className="mono">Direct Proposal</p>
          <h2>
            <Mark name="document">The open path into the mentorship programme</Mark>
          </h2>
          <p>
            Researchers submit a structured proposal. TRI AI reviews it for quality, feasibility, and mentorship need,
            then moves approved work into Senior Researcher matching. From there you scope the project, agree a
            Project Charter, and run the research with TRI AI coordination.
          </p>
          <div className="actions">
            <Link className="btn btn-primary" to="/apply/researcher">
              <Icon name="apply" />
              Apply as a Researcher
            </Link>
            <Link className="btn btn-ghost" to="/researchers">
              <Icon name="researcher" />
              For Researchers
            </Link>
          </div>
          <p className="quiet home-aside-note">
            A small number of people join through a TRI AI Saturdays Research Award invite. That path is by invitation
            only and is not the main way to apply.
          </p>
        </div>
      </section>

      <section className="section band">
        <div className="container">
          <p className="mono">Programme path</p>
          <h2 className="home-band-title">
            <Mark name="path">From a Direct Proposal to a finished mentored project.</Mark>
          </h2>
          <div className="step-grid">
            {steps.map(([index, title, copy, icon]) => (
              <article key={index}>
                <p className="step-index">{index}</p>
                <h3>
                  <Mark name={icon}>{title}</Mark>
                </h3>
                <p className="quiet">{copy}</p>
              </article>
            ))}
          </div>
          <div className="actions">
            <Link className="btn btn-primary" to="/apply/researcher">
              <Icon name="apply" />
              Submit a proposal
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
    </div>
  );
}
