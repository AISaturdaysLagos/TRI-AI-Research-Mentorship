export function AboutPage() {
  return (
    <article>
      <header className="page-intro">
        <div className="container">
          <p className="mono">About TRI AI Research</p>
          <h1>The Researcher and Senior Researcher Programme.</h1>
          <p className="lede">
            The TRI AI Research & Innovation Unit operates the programme: it reviews
            applications, manages matching, coordinates projects, provides approved resources,
            monitors progress, and supports dissemination of research outputs.
          </p>
        </div>
      </header>
      <section className="section-tight">
        <div className="container" style={{ maxWidth: 760 }}>
          <hr className="gold-rule" />
          <p style={{ marginBottom: 16 }}>
            The programme is designed to lower the barriers to high-quality AI research,
            particularly research relevant to Africa, and to create a practical pathway from
            research ideas to credible outputs such as papers, datasets, benchmarks, models, and
            open-source tools.
          </p>
          <p className="quiet">
            Working documents stay in Google Drive. This site keeps the record of who is involved,
            where the file is, and what the status is. A project appears in public research only
            when TRI AI marks it publishable. Publication is an aspiration, not an automatic
            guarantee.
          </p>
        </div>
      </section>
    </article>
  );
}
