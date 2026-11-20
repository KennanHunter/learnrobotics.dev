import { createMemo, createSignal, Show } from "solid-js";
import { useCodeRunner } from "@learnrobotics/editor/variants/code-runner";
import {
  FileTree,
  TreeNode,
  generateDirectoryTree,
  type FileTreeAction,
} from "~/components/FileTree";

/**
 * Playground file panel: builds a TreeNode view of the current virtual FS
 * (`store.files()`) and lets the user open/rename/delete files and add new
 * ones. Mutations go through the CodeRunner store, which ProjectPersist
 * observes and writes back to D1.
 */
export function ProjectFilesPanel() {
  const store = useCodeRunner();

  const root = createMemo(() =>
    generateDirectoryTree(Object.keys(store.files()), "project"),
  );

  // Default to every directory expanded — projects are small and a flat view
  // is what the user expected before the tree swap.
  const defaultExpanded = createMemo(() => {
    const out = new Set<string>();
    const walk = (n: TreeNode) => {
      if (n.isDirectory) {
        out.add(n.key);
        for (const c of n.children) walk(c);
      }
    };
    walk(root());
    return out;
  });

  // Track the active file's key in the tree so the FileTree highlights it.
  const selectedKey = createMemo<string | null>(() => {
    const active = store.activeFile();
    let found: string | null = null;
    const walk = (n: TreeNode) => {
      if (found) return;
      if (!n.isDirectory && n.path === active) found = n.key;
      for (const c of n.children) walk(c);
    };
    walk(root());
    return found;
  });

  // "Add" input state. target === "" means root; a path means that folder.
  const [addTarget, setAddTarget] = createSignal<string | null>(null);
  const [draftName, setDraftName] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);

  const closeAdd = () => {
    setAddTarget(null);
    setDraftName("");
    setError(null);
  };

  const commitAdd = () => {
    const name = draftName().trim();
    if (!name) {
      closeAdd();
      return;
    }
    const target = addTarget();
    const path = target ? `${target}/${name}` : name;
    if (store.files()[path] !== undefined) {
      setError("A file with that name already exists");
      return;
    }
    store.setFileContent(path, "");
    store.setActiveFile(path);
    closeAdd();
  };

  const renameNode = (node: TreeNode, next: string) => {
    const clean = next.trim();
    if (!clean || clean === node.name || node.isDirectory) return;
    const parentPath = node.parent?.path ?? "";
    const newPath = parentPath ? `${parentPath}/${clean}` : clean;
    if (store.files()[newPath] !== undefined) return;
    store.renameFile(node.path, newPath);
  };

  const deleteNode = (node: TreeNode) => {
    if (node.isDirectory) return;
    const path = node.path;
    const files = store.files();
    if (files[path] === undefined) return;
    const remaining = Object.keys(files).filter((p) => p !== path);
    if (remaining.length === 0) {
      // Don't let the user delete the last file — Monaco needs at least one
      // model. Clearing the content is the useful fallback.
      store.setFileContent(path, "");
      return;
    }
    if (store.activeFile() === path) store.setActiveFile(remaining[0]!);
    store.deleteFile(path);
  };

  const getActions = (node: TreeNode): FileTreeAction[] => {
    if (node.isDirectory) {
      return [
        {
          kind: "action",
          id: "new-file",
          label: "New file…",
          run: () => {
            setAddTarget(node.parent ? node.path : "");
            setDraftName("");
          },
        },
      ];
    }
    return [
      {
        kind: "action",
        id: "delete",
        label: "Delete",
        run: () => deleteNode(node),
      },
    ];
  };

  return (
    <div class="flex h-full min-h-0 flex-col text-xs">
      <div class="min-h-0 flex-1 overflow-hidden">
        <FileTree
          root={root()}
          selectedKey={selectedKey()}
          defaultExpandedKeys={defaultExpanded()}
          onSelect={(node) => {
            if (!node.isDirectory) store.setActiveFile(node.path);
          }}
          onOpen={(node) => {
            if (!node.isDirectory) store.setActiveFile(node.path);
          }}
          onRename={renameNode}
          getActions={getActions}
        />
      </div>

      <div class="shrink-0 border-t border-background-offset p-1">
        <Show
          when={addTarget() !== null}
          fallback={
            <button
              type="button"
              onClick={() => {
                setAddTarget("");
                setDraftName("");
              }}
              class="w-full rounded px-2 py-1 text-left text-foreground-muted hover:bg-background-offset hover:text-foreground"
            >
              + New file
            </button>
          }
        >
          <div class="flex flex-col gap-1">
            <input
              type="text"
              autofocus
              placeholder={
                addTarget() ? `${addTarget()}/Name.java` : "Main.java"
              }
              value={draftName()}
              onInput={(e) => {
                setDraftName(e.currentTarget.value);
                if (error()) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitAdd();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  closeAdd();
                }
              }}
              onBlur={() => {
                if (draftName().trim() === "") closeAdd();
              }}
              class="w-full rounded border border-background-offset bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
            />
            <Show when={error()}>
              <span class="px-1 text-[10px] text-red">{error()}</span>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}
