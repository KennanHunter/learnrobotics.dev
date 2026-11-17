import { For, onCleanup, onMount, Show } from "solid-js";
import type { FileTreeAction } from "./types";

export type ContextMenuProps = {
  x: number;
  y: number;
  actions: FileTreeAction[];
  onClose: () => void;
};

export function ContextMenu(props: ContextMenuProps) {
  let rootRef!: HTMLDivElement;

  const onDocClick = (e: MouseEvent) => {
    if (rootRef && !rootRef.contains(e.target as Node)) props.onClose();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") props.onClose();
  };

  onMount(() => {
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
  });
  onCleanup(() => {
    document.removeEventListener("mousedown", onDocClick);
    document.removeEventListener("keydown", onKey);
  });

  return (
    <div
      ref={rootRef}
      class="fixed z-50 min-w-[180px] rounded border border-foreground-subtle/20 bg-background py-1 text-sm shadow-lg"
      style={{ left: `${props.x}px`, top: `${props.y}px` }}
      role="menu"
    >
      <For each={props.actions}>
        {(action) => (
          <Show
            when={action.kind === "action"}
            fallback={<div class="my-1 h-px bg-foreground-subtle/20" />}
          >
            <button
              type="button"
              class="block w-full px-3 py-1.5 text-left hover:bg-background-offset disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                action.kind === "action" && action.enabled === false
              }
              onClick={() => {
                if (action.kind !== "action") return;
                action.run();
                props.onClose();
              }}
              role="menuitem"
            >
              {action.kind === "action" ? action.label : ""}
            </button>
          </Show>
        )}
      </For>
    </div>
  );
}
