import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onMount,
  Show,
} from "solid-js";
import {
  DragDropProvider,
  DragDropSensors,
  type DragEvent as DndDragEvent,
} from "@thisbeyond/solid-dnd";
import type { FileTreeAction, TreeNode } from "./types";
import {
  collectAllDirectoryKeys,
  flattenVisible,
  type VisibleRow,
} from "./treeUtils";
import { FileTreeRow } from "./FileTreeRow";
import { ContextMenu } from "./ContextMenu";
import "./icons.css";

export type FileTreeProps = {
  root: TreeNode;
  /** Controlled selection. Omit to use internal state. */
  selectedKey?: string | null;
  /** Controlled expanded set. Omit to use internal state. */
  expandedKeys?: ReadonlySet<string>;
  /** Keys to start expanded when the component is uncontrolled. */
  defaultExpandedKeys?: ReadonlySet<string>;
  onSelect?: (node: TreeNode) => void;
  onOpen?: (node: TreeNode) => void;
  onMove?: (source: TreeNode, target: TreeNode) => void;
  onRename?: (node: TreeNode, newName: string) => void;
  getActions?: (node: TreeNode) => FileTreeAction[];
  dndDisabled?: boolean;
  renameDisabled?: boolean;
  /** Controls whether the tree auto-focuses on mount. */
  autoFocus?: boolean;
  class?: string;
};

export function FileTree(props: FileTreeProps) {
  const [internalExpanded, setInternalExpanded] = createSignal<Set<string>>(
    new Set(props.defaultExpandedKeys ?? []),
  );
  const [internalSelected, setInternalSelected] = createSignal<string | null>(
    null,
  );
  const [focusedKey, setFocusedKey] = createSignal<string | null>(null);
  const [renamingKey, setRenamingKey] = createSignal<string | null>(null);
  const [menu, setMenu] = createSignal<
    { x: number; y: number; node: TreeNode } | null
  >(null);
  const [lastClickTime, setLastClickTime] = createSignal(0);
  const [lastClickKey, setLastClickKey] = createSignal<string | null>(null);

  const expanded = () => props.expandedKeys ?? internalExpanded();
  const selected = () =>
    props.selectedKey === undefined ? internalSelected() : props.selectedKey;

  const rows = createMemo<VisibleRow[]>(() => flattenVisible(props.root, expanded()));

  let rootRef!: HTMLDivElement;

  onMount(() => {
    if (props.autoFocus) rootRef.focus();
  });

  const setExpanded = (key: string, value: boolean) => {
    if (props.expandedKeys !== undefined) return; // controlled; parent owns it
    setInternalExpanded((prev) => {
      const next = new Set(prev);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const toggleExpanded = (node: TreeNode) => {
    if (!node.isDirectory) return;
    setExpanded(node.key, !expanded().has(node.key));
  };

  const selectNode = (node: TreeNode) => {
    if (props.selectedKey === undefined) setInternalSelected(node.key);
    setFocusedKey(node.key);
    props.onSelect?.(node);
  };

  const openNode = (node: TreeNode) => {
    props.onOpen?.(node);
  };

  const handleRowClick = (node: TreeNode) => {
    const now = Date.now();
    const isDoubleClick =
      lastClickKey() === node.key && now - lastClickTime() < 500;
    setLastClickTime(now);
    setLastClickKey(node.key);
    selectNode(node);
    if (node.isDirectory) {
      toggleExpanded(node);
    } else if (isDoubleClick) {
      openNode(node);
    }
  };

  const findRowIndex = (key: string | null) => {
    if (key == null) return -1;
    return rows().findIndex((r) => r.node.key === key);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const currentIdx = findRowIndex(focusedKey() ?? selected());
    const list = rows();
    if (list.length === 0) return;

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const idx = currentIdx < 0 ? 0 : Math.min(currentIdx + 1, list.length - 1);
        setFocusedKey(list[idx].node.key);
        if (props.selectedKey === undefined) setInternalSelected(list[idx].node.key);
        props.onSelect?.(list[idx].node);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const idx = currentIdx < 0 ? list.length - 1 : Math.max(currentIdx - 1, 0);
        setFocusedKey(list[idx].node.key);
        if (props.selectedKey === undefined) setInternalSelected(list[idx].node.key);
        props.onSelect?.(list[idx].node);
        break;
      }
      case "ArrowRight": {
        e.preventDefault();
        const cur = list[currentIdx];
        if (!cur) break;
        if (cur.node.isDirectory && !expanded().has(cur.node.key)) {
          setExpanded(cur.node.key, true);
        } else if (cur.node.isDirectory && expanded().has(cur.node.key)) {
          const next = list[currentIdx + 1];
          if (next) {
            setFocusedKey(next.node.key);
            if (props.selectedKey === undefined) setInternalSelected(next.node.key);
          }
        }
        break;
      }
      case "ArrowLeft": {
        e.preventDefault();
        const cur = list[currentIdx];
        if (!cur) break;
        if (cur.node.isDirectory && expanded().has(cur.node.key)) {
          setExpanded(cur.node.key, false);
        } else if (cur.node.parent && cur.node.parent !== props.root) {
          setFocusedKey(cur.node.parent.key);
          if (props.selectedKey === undefined)
            setInternalSelected(cur.node.parent.key);
        }
        break;
      }
      case "Home": {
        e.preventDefault();
        setFocusedKey(list[0].node.key);
        if (props.selectedKey === undefined) setInternalSelected(list[0].node.key);
        break;
      }
      case "End": {
        e.preventDefault();
        setFocusedKey(list[list.length - 1].node.key);
        if (props.selectedKey === undefined)
          setInternalSelected(list[list.length - 1].node.key);
        break;
      }
      case "Enter": {
        e.preventDefault();
        const cur = list[currentIdx];
        if (!cur) break;
        if (cur.node.isDirectory) toggleExpanded(cur.node);
        else openNode(cur.node);
        break;
      }
      case "F2": {
        e.preventDefault();
        const cur = list[currentIdx];
        if (!cur || props.renameDisabled) break;
        setRenamingKey(cur.node.key);
        break;
      }
      case "Escape": {
        setRenamingKey(null);
        break;
      }
    }
  };

  const onDragEnd = (ev: DndDragEvent) => {
    const { draggable, droppable } = ev;
    if (!draggable || !droppable) return;
    const source = draggable.data.node as TreeNode;
    const target = droppable.data.node as TreeNode;
    if (!source || !target) return;
    if (!target.isDirectory) return;
    if (target === source.parent) return;
    if (target === source) return;
    if (target.isDescendantOf(source)) return;
    props.onMove?.(source, target);
  };

  // Clear stale focus/selection if the tree changed and key no longer present.
  createEffect(() => {
    const list = rows();
    const keys = new Set(list.map((r) => r.node.key));
    if (focusedKey() && !keys.has(focusedKey()!)) setFocusedKey(null);
  });

  return (
    <DragDropProvider onDragEnd={onDragEnd}>
      <DragDropSensors />
      <div
        ref={rootRef}
        class={`file-tree relative h-full w-full overflow-auto py-1 text-foreground-muted outline-none ${props.class ?? ""}`}
        role="tree"
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <Show when={rows().length === 0}>
          <div class="px-4 py-2 text-xs italic text-foreground-subtle">
            Empty
          </div>
        </Show>
        <For each={rows()}>
          {(row) => (
            <FileTreeRow
              node={row.node}
              depth={row.depth}
              expanded={expanded().has(row.node.key)}
              selected={selected() === row.node.key}
              focused={focusedKey() === row.node.key}
              renaming={renamingKey() === row.node.key}
              dndDisabled={!!props.dndDisabled}
              onPointerDown={() => {
                /* no-op; sensors own it */
              }}
              onClick={() => handleRowClick(row.node)}
              onDblClick={() => {
                if (!row.node.isDirectory) openNode(row.node);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                selectNode(row.node);
                if (!props.getActions) return;
                const actions = props.getActions(row.node);
                if (actions.length === 0) return;
                setMenu({ x: e.clientX, y: e.clientY, node: row.node });
              }}
              onCommitRename={(name) => {
                props.onRename?.(row.node, name);
                setRenamingKey(null);
              }}
              onCancelRename={() => setRenamingKey(null)}
            />
          )}
        </For>
        <Show when={menu()}>
          {(m) => (
            <ContextMenu
              x={m().x}
              y={m().y}
              actions={props.getActions?.(m().node) ?? []}
              onClose={() => setMenu(null)}
            />
          )}
        </Show>
      </div>
    </DragDropProvider>
  );
}

/**
 * Convenience helper for stories/consumers: get every directory key in the
 * tree (useful for `expandedKeys={collectAllDirectoryKeys(root)}` fixtures).
 */
export { collectAllDirectoryKeys };
