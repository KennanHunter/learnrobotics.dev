import { Show, type JSX } from "solid-js";
import { AiOutlineInfoCircle } from "solid-icons/ai/AiOutlineInfoCircle";
import { HoverCard } from "../HoverCard/HoverCard";

export function Info(props: { title?: string; children: JSX.Element }) {
  return (
    <span class="not-prose inline-block align-baseline">
      <HoverCard
        content={() => (
          <>
            <Show when={props.title}>
              <span class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
                {props.title}
              </span>
            </Show>
            <span class="block text-foreground-muted">{props.children}</span>
          </>
        )}
      >
        {(ref) => (
          <button
            ref={ref}
            type="button"
            aria-label={props.title ?? "More info"}
            class="align-baseline text-foreground-muted hover:text-foreground focus:text-foreground focus:outline-none"
          >
            <AiOutlineInfoCircle class="inline h-[0.5em] w-[0.5em] -translate-y-[0.35em]" />
          </button>
        )}
      </HoverCard>
    </span>
  );
}
