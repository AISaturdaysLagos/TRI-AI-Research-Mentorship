export function Loader({ label }: { label: string }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <div className="loader-mark" aria-hidden="true">
        <span className="loader-ring" />
        <span className="loader-arm">
          <span className="loader-dot d-teaching" />
        </span>
        <span className="loader-arm research">
          <span className="loader-dot d-research" />
        </span>
        <span className="loader-arm innovation">
          <span className="loader-dot d-innovation" />
        </span>
        <span className="loader-ai">AI</span>
      </div>
      <p>{label}</p>
    </div>
  );
}
