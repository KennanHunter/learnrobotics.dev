import {
  createContext,
  createSignal,
  JSX,
  onCleanup,
  onMount,
  Show,
  useContext,
  type Component,
} from "solid-js";
import { Dynamic } from "solid-js/web";

/**
 * Visual style of the overlay panel.
 * - `modal`  — rounded card with shadow + backdrop. Classic dialog.
 * - `panel`  — rounded card, no backdrop. Floats over the main content.
 * - `bare`   — no card chrome at all; caller fully owns the look.
 */
export type OverlayVariant = "modal" | "panel" | "bare";

/** Named widths. Numbers map onto a 12-column grid. */
export type OverlaySize = "sm" | "md" | "lg" | "xl" | "full";

export type OverlayAnchor =
  | "center"
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "start"
  | "end";

/** Explicit 12×12 grid placement. 1-indexed, end exclusive. */
export type OverlayPlacement = {
  colStart?: number;
  colEnd?: number;
  rowStart?: number;
  rowEnd?: number;
};

export type OverlayOptions = {
  variant?: OverlayVariant;
  size?: OverlaySize;
  anchor?: OverlayAnchor;
  /** Overrides size + anchor when provided. */
  placement?: OverlayPlacement;
  /** Dim backdrop. Default: true for `modal`, false otherwise. */
  backdrop?: boolean;
  /** Click outside to dismiss. Default: true. */
  dismissOnBackdrop?: boolean;
  /** Close on Escape. Default: true. */
  dismissOnEscape?: boolean;
  /** Fires after close. */
  onClose?: () => void;
};

type ModalContextValue = {
  open: (render: Component, options?: OverlayOptions) => void;
  close: () => void;
  isOpen: () => boolean;
};

const ModalContext = createContext<ModalContextValue>();

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}

const SIZE_COLS: Record<OverlaySize, number> = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
  full: 12,
};
const SIZE_ROWS: Record<OverlaySize, number> = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
  full: 12,
};

function resolvePlacement(
  size: OverlaySize,
  anchor: OverlayAnchor,
): Required<OverlayPlacement> {
  const colSpan = SIZE_COLS[size];
  const rowSpan = SIZE_ROWS[size];
  const centerColStart = Math.max(1, Math.floor((12 - colSpan) / 2) + 1);
  const centerRowStart = Math.max(1, Math.floor((12 - rowSpan) / 2) + 1);

  const horiz = {
    start: [1, 1 + colSpan] as const,
    center: [centerColStart, centerColStart + colSpan] as const,
    end: [13 - colSpan, 13] as const,
  };
  const vert = {
    top: [1, 1 + rowSpan] as const,
    middle: [centerRowStart, centerRowStart + rowSpan] as const,
    bottom: [13 - rowSpan, 13] as const,
  };

  const map: Record<OverlayAnchor, [keyof typeof horiz, keyof typeof vert]> = {
    center: ["center", "middle"],
    top: ["center", "top"],
    "top-start": ["start", "top"],
    "top-end": ["end", "top"],
    bottom: ["center", "bottom"],
    "bottom-start": ["start", "bottom"],
    "bottom-end": ["end", "bottom"],
    start: ["start", "middle"],
    end: ["end", "middle"],
  };

  const [h, v] = map[anchor];
  const [colStart, colEnd] = horiz[h];
  const [rowStart, rowEnd] = vert[v];
  return { colStart, colEnd, rowStart, rowEnd };
}

const VARIANT_CLASSES: Record<OverlayVariant, string> = {
  modal:
    "rounded-lg border border-background-offset/60 bg-background shadow-xl",
  panel:
    "rounded-lg border border-background-offset/60 bg-background shadow-lg",
  bare: "",
};

export function ModalProvider(props: { children: JSX.Element }): JSX.Element {
  const [content, setContent] = createSignal<Component | null>(null);
  const [opts, setOpts] = createSignal<OverlayOptions>({});

  const open = (render: Component, options: OverlayOptions = {}) => {
    setOpts(options);
    setContent(() => render);
  };
  const close = () => {
    const o = opts();
    if (content() === null) return;
    setContent(null);
    o.onClose?.();
  };
  const isOpen = () => content() !== null;

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!isOpen()) return;
      if (opts().dismissOnEscape === false) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });

  return (
    <ModalContext.Provider value={{ open, close, isOpen }}>
      {props.children}
      <Show when={content()}>
        {(_) => {
          const o = opts();
          const variant: OverlayVariant = o.variant ?? "modal";
          const size: OverlaySize = o.size ?? "md";
          const anchor: OverlayAnchor = o.anchor ?? "center";
          const placement: Required<OverlayPlacement> = {
            ...resolvePlacement(size, anchor),
            ...o.placement,
          };
          const showBackdrop =
            o.backdrop ?? (variant === "modal" ? true : false);
          const dismissOnBackdrop = o.dismissOnBackdrop ?? true;

          return (
            <OverlayRoot
              onBackdropClick={dismissOnBackdrop ? close : undefined}
              showBackdrop={showBackdrop}
            >
              <div
                class={`min-h-0 overflow-hidden ${VARIANT_CLASSES[variant]}`}
                style={{
                  "grid-column": `${placement.colStart} / ${placement.colEnd}`,
                  "grid-row": `${placement.rowStart} / ${placement.rowEnd}`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div class="h-full overflow-y-auto overscroll-contain">
                  <Dynamic component={content()!} />
                </div>
              </div>
            </OverlayRoot>
          );
        }}
      </Show>
    </ModalContext.Provider>
  );
}

/**
 * The 12×12 grid. Positioned below the top bar via `--topbar-h`
 * (defaults to 3.5rem).
 */
function OverlayRoot(props: {
  children: JSX.Element;
  showBackdrop: boolean;
  onBackdropClick?: () => void;
}) {
  return (
    <div
      class="fixed inset-x-0 bottom-0 z-40"
      style={{ top: "var(--topbar-h, 3.5rem)" }}
      onClick={props.onBackdropClick}
    >
      <Show when={props.showBackdrop}>
        <div class="absolute inset-0 bg-primary/40" />
      </Show>
      <div
        class="relative grid h-full w-full gap-0 p-4"
        style={{
          "grid-template-columns": "repeat(12, minmax(0, 1fr))",
          "grid-template-rows": "repeat(12, minmax(0, 1fr))",
        }}
      >
        {props.children}
      </div>
    </div>
  );
}
