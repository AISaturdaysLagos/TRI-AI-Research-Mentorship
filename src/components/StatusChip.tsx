import { Icon } from "./Icon";

export function StatusChip({ status }: { status: string }) {
  const tone =
    status === "declined" || status === "discontinued" || status === "not_a_fit"
      ? "red"
      : status === "revise" ||
          status === "paused" ||
          status === "no_current_match" ||
          status === "held_for_matching" ||
          status === "held" ||
          status === "not_available" ||
          status === "interested_with_questions"
        ? "amber"
        : "";
  return (
    <span className={tone ? `chip ${tone}` : "chip"}>
      <Icon name="status" />
      {status.replaceAll("_", " ")}
    </span>
  );
}

function healthTone(health?: string) {
  if (health === "amber" || health === "red") return health;
  return "green";
}

function healthLabel(tone: string) {
  if (tone === "amber") return "Amber";
  if (tone === "red") return "Red";
  return "Green";
}

export function HealthMark({ health }: { health?: string }) {
  const tone = healthTone(health);
  return (
    <span className="health-label">
      <span className={`health-mark ${tone}`} role="img" aria-label={healthLabel(tone)} />
      Project health
    </span>
  );
}

export function HealthChoices({ value, onChange }: { value: string; onChange: (health: string) => void }) {
  return (
    <div className="health-choices" role="radiogroup" aria-label="Project health">
      {(["green", "amber", "red"] as const).map((tone) => (
        <button
          key={tone}
          className={value === tone ? `health-mark ${tone} selected` : `health-mark ${tone}`}
          type="button"
          role="radio"
          aria-checked={value === tone}
          aria-label={healthLabel(tone)}
          onClick={() => onChange(tone)}
        />
      ))}
    </div>
  );
}
