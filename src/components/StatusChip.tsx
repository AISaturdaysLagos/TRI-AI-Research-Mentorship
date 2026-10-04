export function StatusChip({ status }: { status: string }) {
  const tone =
    status === "declined" || status === "discontinued" || status === "red" || status === "not_a_fit"
      ? "red"
      : status === "revise" ||
          status === "paused" ||
          status === "amber" ||
          status === "no_current_match" ||
          status === "held"
        ? "amber"
        : "";
  return <span className={tone ? `chip ${tone}` : "chip"}>{status.replaceAll("_", " ")}</span>;
}
