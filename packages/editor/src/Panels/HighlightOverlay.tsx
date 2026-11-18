import { createSignal, onCleanup, onMount, Show } from "solid-js";
import type { EventDispatcher, HighlightEvent } from "@learnrobotics/events";

type ActiveHighlight = {
  target: string;
  rect: DOMRect | null;
  expiresAt: number;
};

const DEFAULT_DURATION_MS = 2500;

function resolveTarget(target: string): Element | null {
  if (typeof document === "undefined") return null;
  if (target.startsWith("mdx:")) {
    const hid = target.slice("mdx:".length);
    return document.querySelector(`[data-mdx-id="${CSS.escape(hid)}"]`);
  }
  return null;
}

export function HighlightOverlay(props: { dispatcher?: EventDispatcher }) {
  const [active, setActive] = createSignal<ActiveHighlight | null>(null);
  let clearTimer: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    if (!props.dispatcher) return;

    const unsubscribe = props.dispatcher.subscribe((event) => {
      if (event.type !== "highlight") return;
      const hl = event as HighlightEvent;
      const el = resolveTarget(hl.target);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const duration = hl.durationMs ?? DEFAULT_DURATION_MS;
      setActive({ target: hl.target, rect, expiresAt: performance.now() + duration });
      if (clearTimer) clearTimeout(clearTimer);
      clearTimer = setTimeout(() => setActive(null), duration);
    });

    onCleanup(() => {
      unsubscribe();
      if (clearTimer) clearTimeout(clearTimer);
    });
  });

  return (
    <Show when={active() && active()!.rect}>
      {(rect) => (
        <div
          aria-hidden="true"
          class="pointer-events-none fixed z-50 rounded border-2 border-primary shadow-[0_0_0_4px_rgba(237,28,36,0.25)] transition-all duration-150"
          style={{
            top: `${rect().top - 4}px`,
            left: `${rect().left - 4}px`,
            width: `${rect().width + 8}px`,
            height: `${rect().height + 8}px`,
          }}
        />
      )}
    </Show>
  );
}
