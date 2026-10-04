export function Wordmark() {
  return (
    <span className="wm" aria-label="TRI AI">
      <span className="wm-text">
        <span className="wm-tri">TRI</span>
        <span className="wm-ai">AI</span>
      </span>
      <span className="wm-dots" aria-hidden="true">
        <span className="wm-dot d-teaching" />
        <span className="wm-dot d-research" />
        <span className="wm-dot d-innovation" />
      </span>
    </span>
  );
}
