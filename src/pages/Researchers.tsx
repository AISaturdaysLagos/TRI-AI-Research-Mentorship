import { Link } from "react-router-dom";
import { Icon, Mark } from "../components/Icon";

export function ResearchersPage() {
  return (
    <article>
      <header className="page-intro">
        <div className="container">
          <p className="mono">For Researchers</p>
          <h1>Turn strong AI research ideas into rigorous, supported projects.</h1>
          <p className="lede">
            The Researcher Programme helps students and early-career researchers do that work with
            an experienced Senior Researcher.
          </p>
          <div className="actions">
            <Link className="btn btn-primary" to="/apply/researcher">
              <Icon name="apply" />
              Apply as a Researcher
            </Link>
          </div>
        </div>
      </header>
      <section className="section-tight">
        <div className="container card-grid">
          <article className="card">
            <h3><Mark name="document">Direct Proposal Route</Mark></h3>
            <p>Submit a research proposal. Students and early-career researchers can apply.</p>
          </article>
          <article className="card">
            <h3><Mark name="award">TRI AI Saturdays Award</Mark></h3>
            <p>Selected projects receive a TRI AI Saturdays Award and continue into the programme.</p>
          </article>
          <article className="card">
            <h3><Mark name="resource">What TRI AI provides</Mark></h3>
            <p>A Senior Researcher, compute, project coordination, review, and help sharing the work.</p>
          </article>
          <article className="card">
            <h3><Mark name="researcher">What you take on</Mark></h3>
            <p>Most projects run for about 3–6 months. You lead the work.</p>
          </article>
        </div>
      </section>
    </article>
  );
}
