import type { ReactNode } from "react";

export type IconName =
  | "folder"
  | "document"
  | "path"
  | "researcher"
  | "senior"
  | "projects"
  | "about"
  | "dashboard"
  | "account"
  | "sign-in"
  | "sign-out"
  | "apply"
  | "award"
  | "overview"
  | "charter"
  | "milestone"
  | "progress"
  | "resource"
  | "output"
  | "meeting"
  | "task"
  | "match"
  | "report"
  | "review"
  | "theme"
  | "archive"
  | "status";

const tones: Record<IconName, "teaching" | "research" | "innovation" | "gold" | "success" | "alert"> = {
  folder: "gold",
  document: "research",
  path: "innovation",
  researcher: "teaching",
  senior: "research",
  projects: "innovation",
  about: "gold",
  dashboard: "teaching",
  account: "research",
  "sign-in": "innovation",
  "sign-out": "alert",
  apply: "teaching",
  award: "gold",
  overview: "teaching",
  charter: "research",
  milestone: "gold",
  progress: "innovation",
  resource: "teaching",
  output: "innovation",
  meeting: "research",
  task: "gold",
  match: "innovation",
  report: "research",
  review: "teaching",
  theme: "gold",
  archive: "research",
  status: "gold",
};

const glyphs: Record<IconName, string[]> = {
  folder: ["M3.5 7.8c0-.9.7-1.6 1.6-1.6H9l1.7 1.8h8.2c.9 0 1.6.7 1.6 1.6v8.6c0 .9-.7 1.6-1.6 1.6H5.1c-.9 0-1.6-.7-1.6-1.6V7.8Z"],
  document: ["M7 3.5h6.8L19 8.7V20.5H7V3.5Z", "M13.5 3.8V9H18.7", "M9.5 13h6.5", "M9.5 16.5h6.5"],
  path: ["M6 6.5h4.5", "M6 12h12", "M6 17.5h8", "M16.5 4.8 19.2 7.5 16.5 10.2"],
  researcher: ["M12 12.2a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2Z", "M6.2 18.8c.7-2.6 2.9-4 5.8-4s5.1 1.4 5.8 4"],
  senior: ["M8.2 11.4a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z", "M15.6 12a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2Z", "M4.2 18.6c.5-2.2 2.1-3.4 4-3.4 1.8 0 3.3 1.1 3.9 3.2", "M13.2 15.6c1.4.2 2.5 1.1 3 3"],
  projects: ["M4.5 4.5h6.2v6.2H4.5V4.5Z", "M13.3 4.5H19.5v6.2h-6.2V4.5Z", "M4.5 13.3h6.2v6.2H4.5v-6.2Z", "M13.3 13.3H19.5v6.2h-6.2v-6.2Z"],
  about: ["M12 20.2a8.2 8.2 0 1 0 0-16.4 8.2 8.2 0 0 0 0 16.4Z", "M12 11v5", "M12 8h.01"],
  dashboard: ["M4.5 4.5h6.5v7.2H4.5V4.5Z", "M13 4.5h6.5v4.2H13V4.5Z", "M13 11.2h6.5v8.3H13v-8.3Z", "M4.5 14.2h6.5v5.3H4.5v-5.3Z"],
  account: ["M12 12a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 12 12Z", "M6 19.2c.8-2.8 3-4.3 6-4.3s5.2 1.5 6 4.3"],
  "sign-in": ["M10 7.5V5.8A1.8 1.8 0 0 1 11.8 4h6.4A1.8 1.8 0 0 1 20 5.8v12.4a1.8 1.8 0 0 1-1.8 1.8h-6.4a1.8 1.8 0 0 1-1.8-1.8v-1.7", "M4 12h10", "M11 8.5 14.5 12 11 15.5"],
  "sign-out": ["M14 7.5V5.8A1.8 1.8 0 0 0 12.2 4H5.8A1.8 1.8 0 0 0 4 5.8v12.4A1.8 1.8 0 0 0 5.8 20h6.4a1.8 1.8 0 0 0 1.8-1.8v-1.7", "M10 12h10", "m16.5 8.5 3.5 3.5-3.5 3.5"],
  apply: ["M8 4.5h6.2L18 8.2V19.5H8V4.5Z", "M14 4.8V8.4h3.6", "M10.2 12.2h5.2", "M10.2 15.4h3.4"],
  award: ["M12 14.2a4.6 4.6 0 1 0 0-9.2 4.6 4.6 0 0 0 0 9.2Z", "M9.2 13.6 8 20l4-2.1L16 20l-1.2-6.4"],
  overview: ["M3.5 12S6.8 6.8 12 6.8 20.5 12 20.5 12 17.2 17.2 12 17.2 3.5 12 3.5 12Z", "M12 14.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z"],
  charter: ["M7 3.5h6.8L19 8.7V20.5H7V3.5Z", "M13.5 3.8V9H18.7", "M12 13.2 13.2 15.4 16.2 12"],
  milestone: ["M6 4.2v16", "M6 5.2h11.2L14.4 9.2l2.8 4H6"],
  progress: ["M4.5 18.5h15", "M7 15.5v3", "M12 11.5v7", "M17 7.5v11"],
  resource: ["M12 3.8 19.5 8 12 12.2 4.5 8 12 3.8Z", "M4.5 8v8L12 20.2 19.5 16V8", "M12 12.2V20"],
  output: ["M12 4.5v10", "M8.2 8.2 12 4.5l3.8 3.7", "M6 14.5v4.2h12v-4.2"],
  meeting: ["M7 5.2h2V3.6", "M15 5.2h2V3.6", "M6.2 8.2h11.6", "M5.5 5.8h13A1.5 1.5 0 0 1 20 7.3v11.2H4V7.3A1.5 1.5 0 0 1 5.5 5.8Z"],
  task: ["M5.5 4.8h13v14.4h-13V4.8Z", "M8.4 12.1 10.6 14.3 15.6 9.2"],
  match: ["M8.2 13.2a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z", "M15.8 17.6a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z", "M10.6 11.2 13.4 13.6"],
  report: ["M5 19.2V5.2", "M5 19.2h14", "M8.5 15.2v-4", "M12 15.2V8.2", "M15.5 15.2v-6"],
  review: ["M8 4.2h8.2L19 7v12.5H8V4.2Z", "M15.8 4.6V7.4H18.6", "M10.4 12.4 12 14l3.4-3.6"],
  theme: ["M12 4.2v1.8", "M12 18v1.8", "M4.2 12H6", "M18 12h1.8", "M6.4 6.4l1.3 1.3", "M16.3 16.3l1.3 1.3", "M17.6 6.4l-1.3 1.3", "M7.7 16.3l-1.3 1.3", "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"],
  archive: ["M4.5 6.2h15v3.2h-15V6.2Z", "M6 9.4v9.2h12V9.4", "M10 13h4"],
  status: ["M12 4.8 14.1 9.2 19 9.8 15.4 13.2 16.4 18 12 15.6 7.6 18 8.6 13.2 5 9.8 9.9 9.2 12 4.8Z"],
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className={`app-icon tone-${tones[name]}`} viewBox="0 0 24 24" aria-hidden="true">
      {glyphs[name].map((d) => (
        <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

export function Mark({ name, children }: { name: IconName; children: ReactNode }) {
  return (
    <span className="with-icon">
      <Icon name={name} />
      <span>{children}</span>
    </span>
  );
}
