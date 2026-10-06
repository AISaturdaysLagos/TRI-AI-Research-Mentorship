import { Mark, type IconName } from "../components/Icon";

const stepIcons: IconName[] = ["apply", "award", "review", "match", "senior", "review", "charter", "projects", "meeting", "output"];

const steps = [
  "TRI AI opens calls for Researchers and Senior Researchers.",
  "Submit a research proposal, or enter with a TRI AI Saturdays Award.",
  "TRI AI reviews the proposal or the award project.",
  "Reviewed work moves to Senior Researcher matching.",
  "TRI AI shares the proposal with Senior Researchers.",
  "A Senior Researcher accepts, asks for changes, or declines.",
  "Agree a Project Charter.",
  "The project starts.",
  "The Researcher and Senior Researcher carry out the project.",
  "Completed work is reviewed, then shared.",
];

export function HowItWorksPage() {
  return (
    <article>
      <header className="page-intro">
        <div className="container">
          <p className="mono">How It Works</p>
          <h1>From a research idea to a project with a Senior Researcher.</h1>
        </div>
      </header>
      <section className="section-tight">
        <div className="container card-grid">
          {steps.map((copy, index) => (
            <article className="card" key={copy}>
              <p className="step-index">{String(index + 1).padStart(2, "0")}</p>
              <p><Mark name={stepIcons[index]}>{copy}</Mark></p>
            </article>
          ))}
        </div>
      </section>
    </article>
  );
}
