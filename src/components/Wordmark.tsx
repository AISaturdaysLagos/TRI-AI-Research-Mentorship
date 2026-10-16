import type { CSSProperties } from "react";

/** Matches the triAI wordmark on https://tri-ai.org/ */
export function Wordmark({ size = 28 }: { size?: number }) {
  const dotSize = size <= 28 ? 5 : 6;
  const style = {
    "--wm-size": `${size}px`,
    "--dot-size": `${dotSize}px`,
    "--dot-gap": "4px",
  } as CSSProperties;

  return (
    <span className="wm" style={style} aria-label="triAI">
      <span className="wm-text">
        <span className="wm-tri">tri</span>
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
