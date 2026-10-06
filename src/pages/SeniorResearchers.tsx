import { Link } from "react-router-dom";
import { Icon, Mark } from "../components/Icon";

export function SeniorResearchersPage() {
  return (
    <article>
      <header className="page-intro">
        <div className="container">
          <p className="mono">For Senior Researchers</p>
          <h1>Join the Senior Researcher pool.</h1>
          <p className="lede">Support a TRI AI research project.</p>
          <div className="actions">
            <Link className="btn btn-primary" to="/apply/senior-researcher">
              <Icon name="senior" />
              Join the Senior Researcher pool
            </Link>
          </div>
        </div>
      </header>
      <section className="section-tight">
        <div className="container card-grid">
          <article className="card">
            <h3><Mark name="senior">Who should apply</Mark></h3>
            <p>PhD students, postdocs, research scientists, faculty, and experienced practitioners.</p>
          </article>
          <article className="card">
            <h3><Mark name="review">What you do</Mark></h3>
            <p>Review a proposal, meet the Researcher, and advise on the work and its release.</p>
          </article>
          <article className="card">
            <h3><Mark name="resource">What TRI AI provides</Mark></h3>
            <p>Project coordination, compute, matching, and help sharing the work.</p>
          </article>
          <article className="card">
            <h3><Mark name="match">Matching and commitment</Mark></h3>
            <p>
              TRI AI sends some proposals to you. You can also record interest in other proposals open for matching.
              Accept, ask for changes, or decline. The project starts after the Project Charter is agreed.
            </p>
          </article>
        </div>
      </section>
    </article>
  );
}
