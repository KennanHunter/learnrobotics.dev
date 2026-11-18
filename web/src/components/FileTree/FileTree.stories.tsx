import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { createJSXDecorator } from "storybook-solidjs-vite";
import { createSignal, For, onMount } from "solid-js";
import { FileTree } from "./FileTree";
import { TreeNode, type FileTreeAction } from "./types";
import {
  collectAllDirectoryKeys,
  generateDirectoryTree,
  sortedChildren,
} from "./treeUtils";
import { directoryListing } from "./directoryListing";

const meta = {
  component: FileTree,
  tags: ["!autodocs"],
  decorators: [
    createJSXDecorator((Story) => (
      <div
        style={{
          width: "320px",
          height: "500px",
          background: "var(--color-background)",
          color: "var(--color-primary)",
          border: "1px solid rgba(128,128,128,0.2)",
        }}
      >
        <Story />
      </div>
    )),
  ],
} satisfies Meta<typeof FileTree>;

export default meta;
type Story = StoryObj<typeof meta>;

const buildSample = () => generateDirectoryTree(directoryListing, "demo");

export const Default: Story = {
  render: () => <FileTree root={buildSample()} />,
};

export const AllExpanded: Story = {
  render: () => {
    const root = buildSample();
    return (
      <FileTree
        root={root}
        defaultExpandedKeys={collectAllDirectoryKeys(root)}
      />
    );
  },
};

export const Empty: Story = {
  render: () => <FileTree root={new TreeNode("1", "empty", true, null)} />,
};

export const SingleFile: Story = {
  render: () => (
    <FileTree root={generateDirectoryTree(["readme.md"], "solo")} />
  ),
};

export const DeepNesting: Story = {
  render: () => {
    const path = "a/b/c/d/e/f/g/h/i/j/leaf.txt";
    const root = generateDirectoryTree([path], "deep");
    return (
      <FileTree
        root={root}
        defaultExpandedKeys={collectAllDirectoryKeys(root)}
      />
    );
  },
};

export const LongNames: Story = {
  render: () => {
    const long =
      "extraordinarily-long-filename-that-should-definitely-overflow-and-get-ellipsized-at-the-row-boundary.txt";
    const root = generateDirectoryTree(
      [long, `folder-with-an-equally-long-name-for-stress-testing/${long}`],
      "long",
    );
    return (
      <FileTree
        root={root}
        defaultExpandedKeys={collectAllDirectoryKeys(root)}
      />
    );
  },
};

export const WithSelection: Story = {
  render: () => {
    const root = buildSample();
    // Find a file node to pre-select.
    const readme = root.children.find((c) => c.name === "readme.md");
    return (
      <FileTree
        root={root}
        defaultExpandedKeys={collectAllDirectoryKeys(root)}
        selectedKey={readme?.key ?? null}
      />
    );
  },
};

export const WithContextMenu: Story = {
  render: () => {
    const [log, setLog] = createSignal<string[]>([]);
    const root = buildSample();
    const getActions = (node: TreeNode): FileTreeAction[] => {
      const push = (msg: string) =>
        setLog((prev) =>
          [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev].slice(0, 5),
        );
      const actions: FileTreeAction[] = [];
      if (node.isDirectory) {
        actions.push(
          {
            kind: "action",
            id: "newFile",
            label: "New File",
            run: () => push(`New File in ${node.path}`),
          },
          {
            kind: "action",
            id: "newFolder",
            label: "New Folder",
            run: () => push(`New Folder in ${node.path}`),
          },
          { kind: "separator" },
        );
      }
      actions.push(
        {
          kind: "action",
          id: "rename",
          label: "Rename",
          run: () => push(`Rename ${node.path}`),
        },
        {
          kind: "action",
          id: "delete",
          label: "Delete",
          run: () => push(`Delete ${node.path}`),
        },
      );
      return actions;
    };
    return (
      <div
        style={{ display: "flex", "flex-direction": "column", height: "100%" }}
      >
        <div style={{ flex: 1, "min-height": 0 }}>
          <FileTree
            root={root}
            defaultExpandedKeys={collectAllDirectoryKeys(root)}
            getActions={getActions}
          />
        </div>
        <div
          style={{
            "border-top": "1px solid rgba(128,128,128,0.2)",
            padding: "6px 8px",
            "font-size": "11px",
            "font-family": "monospace",
            "max-height": "100px",
            overflow: "auto",
          }}
        >
          <div style={{ opacity: 0.6 }}>Right-click rows. Last 5 actions:</div>
          <For each={log()}>{(line) => <div>{line}</div>}</For>
        </div>
      </div>
    );
  },
};

function MutableTree(props: {
  dndDisabled?: boolean;
  renameDisabled?: boolean;
}) {
  const [tick, setTick] = createSignal(0);
  const [root, setRoot] = createSignal(buildSample());
  const bump = () => setTick(tick() + 1);
  const reset = () => {
    setRoot(buildSample());
    bump();
  };

  const onMove = (source: TreeNode, target: TreeNode) => {
    if (!source.parent) return;
    source.parent.children = source.parent.children.filter((c) => c !== source);
    target.children.push(source);
    source.parent = target;
    bump();
  };

  const onRename = (node: TreeNode, newName: string) => {
    node.name = newName;
    bump();
  };

  return (
    <div
      style={{ display: "flex", "flex-direction": "column", height: "100%" }}
    >
      <div
        style={{
          padding: "4px 8px",
          "font-size": "11px",
          "border-bottom": "1px solid rgba(128,128,128,0.2)",
          display: "flex",
          "justify-content": "space-between",
        }}
      >
        <span>tick: {tick()}</span>
        <button type="button" onClick={reset} style={{ "font-size": "11px" }}>
          reset
        </button>
      </div>
      <div style={{ flex: 1, "min-height": 0 }}>
        {/* re-key on tick so the tree rebuilds visible rows after mutations */}
        {tick() >= 0 && (
          <FileTree
            root={root()}
            defaultExpandedKeys={collectAllDirectoryKeys(root())}
            dndDisabled={props.dndDisabled}
            renameDisabled={props.renameDisabled}
            onMove={onMove}
            onRename={onRename}
          />
        )}
      </div>
    </div>
  );
}

export const DndEnabled: Story = {
  render: () => <MutableTree />,
};

export const DndDisabled: Story = {
  render: () => <MutableTree dndDisabled />,
};

export const InlineRename: Story = {
  render: () => <MutableTree />,
};

export const RenameDisabled: Story = {
  render: () => <MutableTree renameDisabled />,
};

export const IconShowcase: Story = {
  render: () => {
    // Craft a root exercising every icon the port supports.
    const root = generateDirectoryTree(
      [
        "readme.md",
        "license.txt",
        "package.json",
        "notes.txt",
        "index.html",
        "app.js",
        "styles.css",
        "config.json",
        "logo.png",
        "animation.gif",
        "snap.jpg",
        "favicon.ico",
        "css/theme.css",
        "js/app.js",
        "img/banner.png",
        "models/user.js",
        "views/home.html",
        "controllers/api.js",
        "templates/mail.html",
        "public/favicon.ico",
      ],
      "icons",
    );
    return (
      <FileTree
        root={root}
        defaultExpandedKeys={collectAllDirectoryKeys(root)}
      />
    );
  },
};

function ThemedWrapper(props: { theme: "light" | "dark"; children: any }) {
  let ref!: HTMLDivElement;
  onMount(() => {
    ref.classList.add(props.theme);
  });
  return (
    <div
      ref={ref}
      style={{
        height: "100%",
        background: "var(--color-background)",
        color: "var(--color-primary)",
      }}
    >
      {props.children}
    </div>
  );
}

export const ThemedLight: Story = {
  render: () => (
    <ThemedWrapper theme="light">
      <FileTree
        root={buildSample()}
        defaultExpandedKeys={collectAllDirectoryKeys(buildSample())}
      />
    </ThemedWrapper>
  ),
};

export const ThemedDark: Story = {
  render: () => (
    <ThemedWrapper theme="dark">
      <FileTree
        root={buildSample()}
        defaultExpandedKeys={collectAllDirectoryKeys(buildSample())}
      />
    </ThemedWrapper>
  ),
};

export const ControlledExternally: Story = {
  render: () => {
    const root = buildSample();
    const allKeys = collectAllDirectoryKeys(root);
    const [expanded, setExpanded] = createSignal<Set<string>>(new Set());
    const [selected, setSelected] = createSignal<string | null>(null);

    const firstFile = (() => {
      const walk = (n: TreeNode): TreeNode | null => {
        for (const c of sortedChildren(n)) {
          if (!c.isDirectory) return c;
          const r = walk(c);
          if (r) return r;
        }
        return null;
      };
      return walk(root);
    })();

    return (
      <div
        style={{ display: "flex", "flex-direction": "column", height: "100%" }}
      >
        <div
          style={{
            padding: "4px 8px",
            "font-size": "11px",
            display: "flex",
            gap: "6px",
            "border-bottom": "1px solid rgba(128,128,128,0.2)",
          }}
        >
          <button type="button" onClick={() => setExpanded(new Set(allKeys))}>
            Expand all
          </button>
          <button type="button" onClick={() => setExpanded(new Set())}>
            Collapse all
          </button>
          <button
            type="button"
            onClick={() => firstFile && setSelected(firstFile.key)}
          >
            Select first file
          </button>
          <button type="button" onClick={() => setSelected(null)}>
            Clear selection
          </button>
        </div>
        <div style={{ flex: 1, "min-height": 0 }}>
          <FileTree
            root={root}
            expandedKeys={expanded()}
            selectedKey={selected()}
            onSelect={(n) => setSelected(n.key)}
          />
        </div>
      </div>
    );
  },
};

export const LargeTree: Story = {
  render: () => {
    const entries: string[] = [];
    for (let a = 0; a < 5; a++) {
      for (let b = 0; b < 5; b++) {
        for (let c = 0; c < 5; c++) {
          for (let d = 0; d < 4; d++) {
            entries.push(`dir-${a}/sub-${b}/leaf-${c}/file-${d}.txt`);
          }
        }
      }
    }
    const root = generateDirectoryTree(entries, "big");
    return <FileTree root={root} />;
  },
};

export const KeyboardDrivenPlayground: Story = {
  render: () => {
    const [log, setLog] = createSignal<string[]>([]);
    const root = buildSample();
    const push = (msg: string) => setLog((prev) => [msg, ...prev].slice(0, 8));
    return (
      <div
        style={{ display: "flex", "flex-direction": "column", height: "100%" }}
      >
        <div
          style={{
            padding: "6px 8px",
            "font-size": "11px",
            "border-bottom": "1px solid rgba(128,128,128,0.2)",
          }}
        >
          Try: ↑/↓ move, →/← expand/collapse, Enter opens, F2 renames, Esc
          cancels.
        </div>
        <div style={{ flex: 1, "min-height": 0 }}>
          <FileTree
            root={root}
            autoFocus
            defaultExpandedKeys={collectAllDirectoryKeys(root)}
            onSelect={(n) => push(`select ${n.path}`)}
            onOpen={(n) => push(`open ${n.path}`)}
            onRename={(n, name) => push(`rename ${n.path} → ${name}`)}
          />
        </div>
        <div
          style={{
            "border-top": "1px solid rgba(128,128,128,0.2)",
            padding: "6px 8px",
            "font-family": "monospace",
            "font-size": "11px",
            "max-height": "120px",
            overflow: "auto",
          }}
          data-testid="event-log"
        >
          <For each={log()}>{(line) => <div>{line}</div>}</For>
        </div>
      </div>
    );
  },
};
