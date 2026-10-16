import { Link } from "react-router-dom";
import { Icon, Mark, type IconName } from "../components/Icon";

const stages: { title: string; copy: string; icon: IconName }[] = [
  {
    title: "Submit a proposal",
    copy: "A Researcher submits a structured research proposal through this site. The proposal covers the problem, methods, data, timeline, readiness, and the Senior Researcher support you need.",
    icon: "apply",
  },
  {
    title: "TRI AI review",
    copy: "TRI AI reviews the proposal for research quality, feasibility, African relevance where claimed, and mentorship needs. The outcome is one of: approved for matching, revision requested, held for future matching, or declined. You hear from TRI AI with that decision.",
    icon: "review",
  },
  {
    title: "Senior Researcher matching",
    copy: "When a proposal is ready for matching, TRI AI shares it with Senior Researchers in the pool. Acceptance is voluntary. A Senior Researcher may express interest, ask for revisions or questions, say they are not available, or decline the fit.",
    icon: "match",
  },
  {
    title: "Introduction and scoping",
    copy: "When TRI AI introduces you to a Senior Researcher, you meet to scope the work. Together you agree what the project will and will not cover, how you will work, and what a useful output looks like.",
    icon: "meeting",
  },
  {
    title: "Project Charter and activation",
    copy: "You write a Project Charter covering scope, roles, cadence, resources, integrity, authorship, and release expectations. TRI AI records the signed charter and activates the project so the research can begin formally.",
    icon: "charter",
  },
  {
    title: "Research, review, and release",
    copy: "The Researcher leads the work with Senior Researcher advice. TRI AI stays involved for coordination, progress updates, resource decisions, and internal review. Completed work may appear as papers, datasets, models, or tools, including on the public research page when TRI AI marks it ready.",
    icon: "output",
  },
];

export function HowItWorksPage() {
  return (
    <article>
      <header className="page-intro">
        <div className="container">
          <p className="mono">How It Works</p>
          <h1>From a research proposal to a project with a Senior Researcher.</h1>
          <p className="lede">
            This page explains the Direct Proposal route: how a Researcher applies, how TRI AI reviews and matches,
            what TRI AI does during a project, and how long projects usually run.
          </p>
          <div className="actions">
            <Link className="btn btn-primary" to="/apply/researcher">
              <Icon name="apply" />
              Apply as a Researcher
            </Link>
            <Link className="btn btn-ghost" to="/apply/senior-researcher">
              <Icon name="senior" />
              Join the Senior Researcher pool
            </Link>
          </div>
        </div>
      </header>

      <section className="section-tight">
        <div className="container" style={{ maxWidth: 760 }}>
          <hr className="gold-rule" />
          <h2><Mark name="path">The proposal route</Mark></h2>
          <p>
            The Direct Proposal route is the open path into the programme. You submit a research idea as a formal
            proposal. TRI AI decides whether it is ready for a Senior Researcher, then coordinates matching,
            scoping, and project support until the work is ready to share.
          </p>
        </div>
      </section>

      <section className="section band">
        <div className="container">
          <p className="mono">Stages</p>
          <h2 style={{ margin: "12px 0 28px" }}>
            <Mark name="projects">What happens after you apply</Mark>
          </h2>
          <div className="step-grid">
            {stages.map((stage, index) => (
              <article key={stage.title}>
                <p className="step-index">{String(index + 1).padStart(2, "0")}</p>
                <h3>
                  <Mark name={stage.icon}>{stage.title}</Mark>
                </h3>
                <p className="quiet">{stage.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container" style={{ maxWidth: 760 }}>
          <h2><Mark name="resource">What TRI AI provides</Mark></h2>
          <p>
            TRI AI is not a silent platform. The programme team reviews proposals, runs Senior Researcher matching,
            sets up introductions and scoping, hosts the project workspace, helps with coordination, and supports
            internal review and sharing of outputs. Where appropriate, TRI AI can also help with compute and other
            agreed resources.
          </p>
          <h2 style={{ marginTop: 36 }}>
            <Mark name="about">What TRI AI expects</Mark>
          </h2>
          <p>TRI AI expects Researchers and Senior Researchers to treat the project as real research, not a casual side task.</p>
          <ul>
            <li>Respond to review decisions, matching messages, and meeting invites in good time.</li>
            <li>Attend the scoping discussion and agree a clear Project Charter before the project is activated.</li>
            <li>Keep the agreed meeting cadence and flag blockers early, including in progress updates.</li>
            <li>Use the project workspace and shared documents so TRI AI can coordinate without chasing private threads.</li>
            <li>Be honest about feasibility, data access, ethics, authorship, and what the project will release.</li>
            <li>For Senior Researchers: acceptance is voluntary, but once you join a project, advise seriously and keep the commitments in the charter.</li>
          </ul>
          <h2 style={{ marginTop: 36 }}>
            <Mark name="meeting">Typical duration</Mark>
          </h2>
          <p>
            Most projects run for about <strong>3–6 months</strong> after activation. The proposal timeline sets the
            intended length; the Project Charter confirms it. Shorter scoping bursts happen first. Longer work is
            possible when the charter and TRI AI agree, but the default expectation is a focused project that can
            finish and release something useful within that window.
          </p>
          <div className="actions" style={{ marginTop: 28 }}>
            <Link className="btn btn-primary" to="/apply/researcher">
              <Icon name="apply" />
              Start a proposal
            </Link>
            <Link className="btn btn-ghost" to="/researchers">
              <Icon name="researcher" />
              For Researchers
            </Link>
            <Link className="btn btn-ghost" to="/senior-researchers">
              <Icon name="senior" />
              For Senior Researchers
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}
