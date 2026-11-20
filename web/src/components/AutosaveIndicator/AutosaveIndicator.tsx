export function AutosaveIndicator(props: {
  savedAt: number | null;
  dirtyAt: number | null;
}) {
  const state = (): "idle" | "saving" | "saved" => {
    const saved = props.savedAt;
    const dirty = props.dirtyAt;
    if (saved == null && dirty == null) return "idle";
    if (dirty != null && (saved == null || dirty > saved)) return "saving";
    return "saved";
  };
  const label = () => {
    switch (state()) {
      case "saving":
        return "Saving…";
      case "saved":
        return "Saved";
      default:
        return "Unsaved";
    }
  };
  const dotClass = () => {
    switch (state()) {
      case "saving":
        return "bg-foreground-muted animate-pulse";
      case "saved":
        return "bg-green";
      default:
        return "bg-foreground-subtle";
    }
  };
  const textClass = () =>
    state() === "saved" ? "text-green" : "text-foreground-muted";
  return (
    <span
      class={`flex items-center gap-1.5 text-[11px] ${textClass()}`}
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        class={`inline-block h-1.5 w-1.5 rounded-full ${dotClass()}`}
      />
      {label()}
    </span>
  );
}
