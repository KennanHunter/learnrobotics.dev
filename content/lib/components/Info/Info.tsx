import { createSignal, Show, type JSX } from "solid-js";
import { AiOutlineInfoCircle } from "solid-icons/ai/AiOutlineInfoCircle";

export function Info(props: { title?: string; children: JSX.Element }) {
  const [open, setOpen] = createSignal(false);
  return (
    <span class="not-prose relative inline-block align-baseline">
      <button
        type="button"
        aria-label={props.title ?? "More info"}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        class="align-baseline text-foreground-muted hover:text-foreground focus:text-foreground focus:outline-none"
      >
        <AiOutlineInfoCircle class="inline h-[0.5em] w-[0.5em] -translate-y-[0.35em]" />
      </button>
      <Show when={open()}>
        <span
          role="tooltip"
          class="absolute bottom-full left-1/2 z-50 mb-1.5 w-64 -translate-x-1/2 rounded border border-background-offset bg-background px-3 py-2 text-left text-xs leading-snug text-foreground shadow-lg"
        >
          <Show when={props.title}>
            <span class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
              {props.title}
            </span>
          </Show>
          <span class="block text-foreground-muted">{props.children}</span>
        </span>
      </Show>
    </span>
  );
}
