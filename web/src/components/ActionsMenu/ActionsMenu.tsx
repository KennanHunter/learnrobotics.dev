import {
  For,
  createSignal,
  onCleanup,
  onMount,
  Show,
  type JSX,
} from "solid-js";
import { MdFillMore_vert } from "solid-icons/md/MdFillMore_vert";

export type ActionsMenuItem = {
  id: string;
  label: string;
  icon?: JSX.Element;
  disabled?: boolean;
  run: () => void;
};

export type ActionsMenuProps = {
  items: ActionsMenuItem[];
  /** aria-label for the trigger button. */
  label?: string;
};

/**
 * Three-dot dropdown menu. Trigger is a small icon button; items render in
 * a floating menu anchored to the trigger's bottom-right.
 */
export function ActionsMenu(props: ActionsMenuProps) {
  const [open, setOpen] = createSignal(false);
  let triggerRef!: HTMLButtonElement;
  let menuRef: HTMLDivElement | undefined;

  const close = () => setOpen(false);

  const onDocPointer = (e: PointerEvent) => {
    if (!open()) return;
    const t = e.target as Node;
    if (triggerRef.contains(t)) return;
    if (menuRef && menuRef.contains(t)) return;
    close();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && open()) close();
  };

  onMount(() => {
    document.addEventListener("pointerdown", onDocPointer);
    document.addEventListener("keydown", onKey);
  });
  onCleanup(() => {
    document.removeEventListener("pointerdown", onDocPointer);
    document.removeEventListener("keydown", onKey);
  });

  return (
    <div class="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open()}
        aria-label={props.label ?? "More actions"}
        onClick={() => setOpen((v) => !v)}
        class="inline-flex h-5 w-5 items-center justify-center rounded text-foreground-muted hover:bg-background-offset hover:text-foreground"
      >
        <MdFillMore_vert />
      </button>
      <Show when={open()}>
        <div
          ref={(el) => (menuRef = el)}
          role="menu"
          class="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-md border border-background-offset bg-background py-1 text-xs shadow-lg"
        >
          <For each={props.items}>
            {(item) => (
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  close();
                  item.run();
                }}
                class="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-background-offset disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Show when={item.icon}>
                  <span class="inline-flex h-3.5 w-3.5 items-center justify-center text-foreground-subtle">
                    {item.icon}
                  </span>
                </Show>
                <span>{item.label}</span>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
