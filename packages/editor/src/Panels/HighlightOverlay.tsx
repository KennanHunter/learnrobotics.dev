import { createSignal, onCleanup, onMount, Show } from "solid-js";
import type { EventDispatcher, HighlightEvent } from "@learnrobotics/events";

type ActiveOverlay = {
  target: string;
  rect: DOMRect | null;
  expiresAt: number;
};

const DEFAULT_DURATION_MS = 2500;
const HIGHLIGHT_CLASS = "event-highlight";

type Resolved =
  | { kind: "overlay"; el: Element }
  | { kind: "class"; el: Element };

function resolveTarget(target: string): Resolved | null {
  if (typeof document === "undefined") return null;
  if (target.startsWith("mdx:")) {
    const hid = target.slice("mdx:".length);
    const el = document.querySelector(`[data-mdx-id="${CSS.escape(hid)}"]`);
    return el ? { kind: "overlay", el } : null;
  }
  try {
    const el = document.querySelector(target);
    return el ? { kind: "class", el } : null;
  } catch {
    return null;
  }
}

export function HighlightOverlay(props: { dispatcher?: EventDispatcher }) {
  const [active, setActive] = createSignal<ActiveOverlay | null>(null);
  let overlayTimer: ReturnType<typeof setTimeout> | null = null;
  let overlayRectTimer: ReturnType<typeof setTimeout> | null = null;
  const classActives = new Map<
    string,
    { el: Element; timer: ReturnType<typeof setTimeout> | null }
  >();

  function clearOverlay() {
    if (overlayTimer) {
      clearTimeout(overlayTimer);
      overlayTimer = null;
    }
    if (overlayRectTimer) {
      clearTimeout(overlayRectTimer);
      overlayRectTimer = null;
    }
    setActive(null);
  }

  function clearClass(target: string) {
    const entry = classActives.get(target);
    if (!entry) return;
    entry.el.classList.remove(HIGHLIGHT_CLASS);
    if (entry.timer) clearTimeout(entry.timer);
    classActives.delete(target);
  }

  function clearAll() {
    clearOverlay();
    for (const target of Array.from(classActives.keys())) clearClass(target);
  }

  onMount(() => {
    if (!props.dispatcher) return;

    const unsubscribe = props.dispatcher.subscribe((event) => {
      if (event.type === "highlight-clear") {
        if (!event.target) {
          clearAll();
          return;
        }
        if (event.target.startsWith("mdx:")) {
          const cur = active();
          if (!cur || cur.target === event.target) clearOverlay();
        } else {
          clearClass(event.target);
        }
        return;
      }
      if (event.type !== "highlight") return;
      const hl = event as HighlightEvent;
      const resolved = resolveTarget(hl.target);
      if (!resolved) return;
      resolved.el.scrollIntoView({ behavior: "smooth", block: "center" });
      const duration = hl.durationMs ?? DEFAULT_DURATION_MS;

      if (resolved.kind === "overlay") {
        if (overlayTimer) clearTimeout(overlayTimer);
        if (overlayRectTimer) clearTimeout(overlayRectTimer);
        setActive({
          target: hl.target,
          rect: resolved.el.getBoundingClientRect(),
          expiresAt: performance.now() + duration,
        });
        overlayTimer = setTimeout(() => setActive(null), duration);
        overlayRectTimer = setTimeout(() => {
          const settled = resolveTarget(hl.target);
          if (!settled || settled.kind !== "overlay") return;
          setActive((prev) =>
            prev && prev.target === hl.target
              ? { ...prev, rect: settled.el.getBoundingClientRect() }
              : prev,
          );
        }, 350);
        return;
      }

      // Class mode: reset the timer if this target is already lit and add
      // the highlight class. Removing on expire so stacking highlights
      // never leaves a stale class behind.
      clearClass(hl.target);
      resolved.el.classList.add(HIGHLIGHT_CLASS);
      const timer = setTimeout(() => clearClass(hl.target), duration);
      classActives.set(hl.target, { el: resolved.el, timer });
    });

    onCleanup(() => {
      unsubscribe();
      clearAll();
    });
  });

  return (
    <>
      <style>{`
        .${HIGHLIGHT_CLASS} {
          border-radius: 6px;
          box-shadow:
            0 0 0 3px rgba(253, 224, 71, 0.9),
            0 0 24px 8px rgba(253, 224, 71, 0.55),
            0 0 48px 16px rgba(250, 204, 21, 0.3);
          transition: box-shadow 200ms ease-in-out;
        }
      `}</style>
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
    </>
  );
}
