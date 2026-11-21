import {
  createMemo,
  createSignal,
  For,
  onMount,
  Show,
  type JSX,
} from "solid-js";
import { PanelFrame } from "./PanelFrame";

type PanelKey = "article" | "files" | "editor" | "right";
type Sizes = Record<PanelKey, number>;

const HANDLE_PX = 6;
const MIN_FR = 5;
const STORAGE_PREFIX = "editor-panel-widths:";

export type CodeRunnerShellProps = {
  /** Top row, spans full width. Rendered flush — no outer padding. */
  toolbarSlot?: () => JSX.Element;
  articleSlot?: () => JSX.Element;
  filesSlot?: () => JSX.Element;
  editorSlot: () => JSX.Element;
  rightSlot: () => JSX.Element;

  articleTitle?: string;
  filesTitle?: string;
  editorTitle?: string;
  /** Right-aligned content in the editor panel header. */
  editorActions?: () => JSX.Element;
  /** Rendered before the editor panel's title (e.g. a sidebar-toggle button). */
  editorTitleLeading?: () => JSX.Element;
  /** Right-aligned content in the files panel header (e.g. a close button). */
  filesActions?: () => JSX.Element;
  rightTitle?: string;

  /** Hide the article panel's title header. Pass true when the article slot
   * already provides its own section header (e.g. a TabGroup tablist). */
  articleBare?: boolean;

  /** Column widths (`fr` units). When provided, acts as a hard override and
   * disables user resize + persistence. */
  columns?: {
    article?: number;
    files?: number;
    editor?: number;
    right?: number;
  };
};

export function CodeRunnerShell(props: CodeRunnerShellProps) {
  console.log("[CodeRunnerShell] body", {
    hasToolbar: Boolean(props.toolbarSlot),
    hasArticle: Boolean(props.articleSlot),
    hasFiles: Boolean(props.filesSlot),
  });
  const [mounted, setMounted] = createSignal(false);
  const [sizes, setSizes] = createSignal<Sizes>(resolveSizes(props));
  const [dragging, setDragging] = createSignal(false);
  let gridRef: HTMLDivElement | undefined;

  const propColumnsLocked = () =>
    props.columns !== undefined &&
    (props.columns.article !== undefined ||
      props.columns.files !== undefined ||
      props.columns.editor !== undefined ||
      props.columns.right !== undefined);

  const presentKeys = createMemo<PanelKey[]>(() => {
    const keys: PanelKey[] = [];
    if (props.articleSlot) keys.push("article");
    if (props.filesSlot) keys.push("files");
    keys.push("editor");
    keys.push("right");
    return keys;
  });

  const storageKey = () => STORAGE_PREFIX + presentKeys().join("+");

  onMount(() => {
    console.log("[CodeRunnerShell] onMount: client-mounting workbench");
    setMounted(true);
    if (!propColumnsLocked()) {
      const loaded = loadSizes(storageKey(), presentKeys());
      if (loaded) {
        setSizes({ ...resolveSizes(props), ...loaded });
      } else {
        setSizes(resolveSizes(props));
      }
    } else {
      setSizes(resolveSizes(props));
    }
  });

  // Row to put panels/handles on when a toolbar occupies row 1.
  const panelRow = () => (props.toolbarSlot ? "2" : "1");

  // Build `grid-template-columns` from current sizes + interleaved handle
  // columns (one 6px column between each pair of panels).
  const cols = () => {
    const s = sizes();
    const keys = presentKeys();
    const parts: string[] = [];
    keys.forEach((key, i) => {
      parts.push(`${s[key]}fr`);
      if (i < keys.length - 1) parts.push(`${HANDLE_PX}px`);
    });
    return parts.join(" ");
  };

  const gridRows = () => (props.toolbarSlot ? "auto 1fr" : "1fr");

  function onHandlePointerDown(e: PointerEvent, leftKey: PanelKey, rightKey: PanelKey) {
    if (propColumnsLocked()) return;
    if (e.button !== 0) return;
    const target = e.currentTarget as HTMLDivElement;
    target.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startSizes = { ...sizes() };
    const keys = presentKeys();
    const totalFr = keys.reduce((sum, k) => sum + startSizes[k], 0);
    const gridWidth = gridRef?.getBoundingClientRect().width ?? 0;
    const availablePx = Math.max(1, gridWidth - (keys.length - 1) * HANDLE_PX);

    setDragging(true);

    const onMove = (ev: PointerEvent) => {
      const deltaPx = ev.clientX - startX;
      let deltaFr = (deltaPx / availablePx) * totalFr;
      // Clamp so neither sibling drops below MIN_FR.
      const maxRight = startSizes[rightKey] - MIN_FR;
      const maxLeft = startSizes[leftKey] - MIN_FR;
      if (deltaFr > maxRight) deltaFr = maxRight;
      if (-deltaFr > maxLeft) deltaFr = -maxLeft;
      setSizes({
        ...startSizes,
        [leftKey]: startSizes[leftKey] + deltaFr,
        [rightKey]: startSizes[rightKey] - deltaFr,
      });
    };

    const onUp = (ev: PointerEvent) => {
      target.releasePointerCapture?.(ev.pointerId);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
      setDragging(false);
      persistSizes(storageKey(), sizes(), presentKeys());
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  }

  // Handle column indexes correspond to positions between panels in
  // `grid-template-columns`. Panel at keys[i] occupies column
  // 1 + 2*i; the handle after it occupies column 2 + 2*i.
  const panelColumn = (i: number) => String(1 + i * 2);
  const handleColumn = (i: number) => String(2 + i * 2);

  return (
    <Show
      when={mounted()}
      fallback={
        <div
          data-testid="workbench-loading"
          class="flex h-full w-full items-center justify-center text-xs text-foreground-muted"
        >
          Loading editor…
        </div>
      }
    >
      <div
        ref={gridRef}
        data-testid="workbench-root"
        class="grid h-full min-h-0 w-full min-w-0"
        style={{
          "grid-template-rows": gridRows(),
          "grid-template-columns": cols(),
          "user-select": dragging() ? "none" : undefined,
        }}
      >
        <Show when={props.toolbarSlot}>
          <div
            class="min-h-0 min-w-0"
            style={{ "grid-row": "1", "grid-column": "1 / -1" }}
          >
            {props.toolbarSlot!()}
          </div>
        </Show>

        <For each={presentKeys()}>
          {(key, i) => (
            <>
              <div
                class="min-h-0 min-w-0"
                style={{
                  "grid-row": panelRow(),
                  "grid-column": panelColumn(i()),
                }}
              >
                {key === "article" && (
                  <PanelFrame
                    title={
                      props.articleBare
                        ? undefined
                        : (props.articleTitle ?? "Lesson")
                    }
                    bare={props.articleBare}
                  >
                    {props.articleSlot!()}
                  </PanelFrame>
                )}
                {key === "files" && (
                  <PanelFrame
                    title={props.filesTitle ?? "Files"}
                    actions={props.filesActions?.()}
                  >
                    {props.filesSlot!()}
                  </PanelFrame>
                )}
                {key === "editor" && (
                  <PanelFrame
                    title={props.editorTitle ?? "Editor"}
                    titleLeading={props.editorTitleLeading?.()}
                    actions={props.editorActions?.()}
                  >
                    {props.editorSlot()}
                  </PanelFrame>
                )}
                {key === "right" && (
                  <PanelFrame title={props.rightTitle ?? "Output"}>
                    {props.rightSlot()}
                  </PanelFrame>
                )}
              </div>
              <Show when={i() < presentKeys().length - 1}>
                <ResizeHandle
                  row={panelRow()}
                  column={handleColumn(i())}
                  disabled={propColumnsLocked()}
                  onPointerDown={(e) =>
                    onHandlePointerDown(e, key, presentKeys()[i() + 1])
                  }
                />
              </Show>
            </>
          )}
        </For>
      </div>
    </Show>
  );
}

function ResizeHandle(props: {
  row: string;
  column: string;
  disabled: boolean;
  onPointerDown: (e: PointerEvent) => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      class="group relative z-10 flex items-stretch justify-center"
      style={{
        "grid-row": props.row,
        "grid-column": props.column,
        cursor: props.disabled ? "default" : "col-resize",
        "touch-action": "none",
      }}
      onPointerDown={props.disabled ? undefined : props.onPointerDown}
    >
      <div class="h-full w-px bg-transparent transition-colors group-hover:bg-foreground-muted/40 group-active:bg-foreground-muted/60" />
    </div>
  );
}

function resolveSizes(props: CodeRunnerShellProps): Sizes {
  const has = {
    article: Boolean(props.articleSlot),
    files: Boolean(props.filesSlot),
  };
  const defaults = (() => {
    if (has.article && has.files)
      return { article: 20, files: 15, editor: 40, right: 25 };
    if (has.article) return { article: 25, files: 0, editor: 50, right: 25 };
    if (has.files) return { article: 0, files: 20, editor: 50, right: 30 };
    return { article: 0, files: 0, editor: 65, right: 35 };
  })();
  return {
    article: props.columns?.article ?? defaults.article,
    files: props.columns?.files ?? defaults.files,
    editor: props.columns?.editor ?? defaults.editor,
    right: props.columns?.right ?? defaults.right,
  };
}

function loadSizes(key: string, presentKeys: PanelKey[]): Partial<Sizes> | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const out: Partial<Sizes> = {};
    for (const k of presentKeys) {
      const v = (parsed as Record<string, unknown>)[k];
      if (typeof v === "number" && isFinite(v) && v >= MIN_FR) {
        out[k] = v;
      } else {
        return null;
      }
    }
    return out;
  } catch {
    return null;
  }
}

function persistSizes(key: string, sizes: Sizes, presentKeys: PanelKey[]) {
  if (typeof localStorage === "undefined") return;
  try {
    const payload: Partial<Sizes> = {};
    for (const k of presentKeys) payload[k] = sizes[k];
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // quota/private mode — nothing we can do
  }
}
