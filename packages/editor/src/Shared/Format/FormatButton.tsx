import { createSignal, Show } from "solid-js";
import { formatSource, type FormatLanguage } from "./format";

export type FormatButtonProps = {
  language: FormatLanguage;
  tabSize: () => number;
  getValue: () => string;
  setValue: (next: string) => void;
};

export function FormatButton(props: FormatButtonProps) {
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function onClick() {
    setPending(true);
    setError(null);
    try {
      const formatted = await formatSource(
        props.getValue(),
        props.language,
        props.tabSize(),
      );
      props.setValue(formatted);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div class="flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending()}
        class="inline-flex items-center gap-1 rounded border border-background-offset px-2 py-1 text-xs hover:bg-background-offset disabled:opacity-60"
        title={`Format with Prettier (${props.language})`}
      >
        {pending() ? "Formatting…" : "Format"}
      </button>
      <Show when={error()}>
        <span
          class="truncate text-xs text-red"
          title={error() ?? undefined}
          aria-live="polite"
        >
          format failed
        </span>
      </Show>
    </div>
  );
}
