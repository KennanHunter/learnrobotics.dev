import { createEffect, createSignal, Show } from "solid-js";
import { MdOutlineChevron_right } from "solid-icons/md/MdOutlineChevron_right";
import { createDraggable, createDroppable } from "@thisbeyond/solid-dnd";
import type { TreeNode } from "./types";
import { getFileIconClass } from "./fileIcons";

export type FileTreeRowProps = {
  node: TreeNode;
  depth: number;
  expanded: boolean;
  selected: boolean;
  focused: boolean;
  renaming: boolean;
  dndDisabled: boolean;
  onPointerDown: (e: PointerEvent) => void;
  onClick: (e: MouseEvent) => void;
  onDblClick: (e: MouseEvent) => void;
  onContextMenu: (e: MouseEvent) => void;
  onCommitRename: (newName: string) => void;
  onCancelRename: () => void;
};

const INDENT_PX = 14;

export function FileTreeRow(props: FileTreeRowProps) {
  // solid-dnd requires string/number ids; use the node key.
  const draggable = props.dndDisabled
    ? null
    : createDraggable(props.node.key, { node: props.node });
  const droppable = props.dndDisabled
    ? null
    : createDroppable(props.node.key, { node: props.node });

  const setRef = (el: HTMLDivElement) => {
    if (draggable) draggable(el);
    if (droppable) droppable(el);
  };

  const iconClass = () =>
    getFileIconClass(props.node.name, props.node.isDirectory);

  const rowClass = () => {
    const base =
      "file-tree-row group flex items-center gap-1 pr-2 h-6 text-sm cursor-pointer select-none rounded-sm";
    const parts = [base];
    if (props.expanded) parts.push("expanded");
    if (props.selected) {
      parts.push("bg-primary/10 text-primary");
    } else {
      parts.push("hover:bg-background-offset");
    }
    if (props.focused) parts.push("ring-1 ring-primary/40");
    if (droppable?.isActiveDroppable) parts.push("bg-primary/20");
    if (draggable?.isActiveDraggable) parts.push("opacity-50");
    return parts.join(" ");
  };

  return (
    <div
      ref={setRef}
      class={rowClass()}
      style={{ "padding-left": `${props.depth * INDENT_PX + 4}px` }}
      role="treeitem"
      aria-selected={props.selected}
      aria-expanded={props.node.isDirectory ? props.expanded : undefined}
      aria-level={props.depth + 1}
      title={props.node.path}
      onPointerDown={(e) => props.onPointerDown(e)}
      onClick={(e) => props.onClick(e)}
      onDblClick={(e) => props.onDblClick(e)}
      onContextMenu={(e) => props.onContextMenu(e)}
    >
      <Show
        when={props.node.isDirectory}
      >
        <span
          class="inline-flex w-4 flex-shrink-0 items-center justify-center transition-transform"
          style={{
            transform: props.expanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
          aria-hidden
        >
          <MdOutlineChevron_right size={14} />
        </span>
      </Show>
      <span class={`file-tree-icon ${iconClass()}`} aria-hidden />
      <Show
        when={props.renaming}
        fallback={<span class="truncate">{props.node.name}</span>}
      >
        <RenameInput
          initial={props.node.name}
          onCommit={(v) => props.onCommitRename(v)}
          onCancel={() => props.onCancelRename()}
        />
      </Show>
    </div>
  );
}

function RenameInput(props: {
  initial: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = createSignal(props.initial);
  let inputRef!: HTMLInputElement;

  createEffect(() => {
    if (inputRef) {
      inputRef.focus();
      const dot = props.initial.lastIndexOf(".");
      if (dot > 0) inputRef.setSelectionRange(0, dot);
      else inputRef.select();
    }
  });

  return (
    <input
      ref={inputRef}
      value={value()}
      onInput={(e) => setValue(e.currentTarget.value)}
      onClick={(e) => e.stopPropagation()}
      onDblClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          const trimmed = value().trim();
          if (trimmed && trimmed !== props.initial) props.onCommit(trimmed);
          else props.onCancel();
        } else if (e.key === "Escape") {
          props.onCancel();
        }
      }}
      onBlur={() => {
        const trimmed = value().trim();
        if (trimmed && trimmed !== props.initial) props.onCommit(trimmed);
        else props.onCancel();
      }}
      class="min-w-0 flex-1 rounded border border-primary/40 bg-background px-1 text-sm outline-none"
    />
  );
}
