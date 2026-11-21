import { createSignal, onCleanup, onMount, type JSX } from "solid-js";
import { isServer, render as solidRender } from "solid-js/web";
import tippy, { type Placement } from "tippy.js";
import "tippy.js/dist/tippy.css";

export type HoverCardProps = {
  children: (ref: (el: HTMLElement) => void) => JSX.Element;
  content: () => JSX.Element;
  placement?: Placement;
  interactive?: boolean;
};

/** Hover popover primitive backed by Tippy.js. Portals to document.body,
 * flips/shifts to stay in-viewport. All DOM/tippy setup is deferred to
 * onMount so hydration just sees the plain trigger markup. Uses tippy.js
 * directly — solid-tippy's useTippy force-calls `.show()` on setup when
 * its `hidden` option is unset, which pops the panel open on page load. */
export function HoverCard(props: HoverCardProps) {
  const [el, setEl] = createSignal<HTMLElement>();

  onMount(() => {
    if (isServer) return;
    const target = el();
    if (!target) return;

    const contentEl = document.createElement("div");
    contentEl.className =
      "rounded border border-background-offset bg-background px-3 py-2 text-left text-xs leading-snug text-foreground shadow-lg max-w-xs";
    const dispose = solidRender(() => props.content(), contentEl);

    const instance = tippy(target, {
      content: contentEl,
      placement: props.placement ?? "top",
      interactive: props.interactive ?? false,
      offset: [0, 8],
      appendTo: () => document.body,
      trigger: "mouseenter focus",
      arrow: false,
      hideOnClick: false,
      popperOptions: {
        modifiers: [
          { name: "flip", options: { padding: 8 } },
          { name: "preventOverflow", options: { padding: 8 } },
        ],
      },
    });

    onCleanup(() => {
      instance.destroy();
      dispose();
    });
  });

  return <>{props.children(setEl)}</>;
}
