export function ProposalRead({
  sections,
}: {
  sections: { title?: string; fields: { label: string; value: string }[] }[];
}) {
  return (
    <div className="proposal-read">
      {sections.map((section) => (
        <section key={section.title || section.fields[0]?.label}>
          {section.title ? <h3>{section.title}</h3> : null}
          {section.fields.map((field) => (
            <div className="proposal-field" key={field.label}>
              <p className="quiet">{field.label}</p>
              <p>{field.value.trim() || "—"}</p>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
