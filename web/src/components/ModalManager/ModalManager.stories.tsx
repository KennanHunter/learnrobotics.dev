import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { For } from "solid-js";
import {
  ModalProvider,
  useModal,
  type OverlayAnchor,
  type OverlayOptions,
  type OverlaySize,
  type OverlayVariant,
} from "./ModalManager";

/**
 * Overlay demo harness. Mounts a `ModalProvider` with a fake top-bar so
 * stories can see the grid landing below it.
 */
const meta = {
  title: "Components/ModalManager",
  component: ModalProvider,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ModalProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

function FakeTopBar() {
  return (
    <div
      class="flex items-center justify-between border-b border-background-offset bg-background px-4 py-3"
      style={{ height: "3.5rem" }}
    >
      <div class="font-mono text-sm">learnrobotics.dev</div>
      <div class="text-xs text-foreground-subtle">fake top bar</div>
    </div>
  );
}

function FakeContent() {
  return (
    <div class="p-8">
      <h1 class="text-2xl font-semibold">Main content</h1>
      <p class="mt-2 max-w-xl text-foreground-muted">
        The overlay is positioned <em>below</em> the top bar, so this area is
        what gets covered.
      </p>
      <div class="mt-4 grid grid-cols-3 gap-2">
        <For each={Array.from({ length: 24 })}>
          {() => (
            <div class="h-20 rounded border border-background-offset/60" />
          )}
        </For>
      </div>
    </div>
  );
}

function PanelBody(props: { label: string }) {
  return (
    <div class="p-6">
      <h2 class="text-lg font-semibold">{props.label}</h2>
      <p class="mt-2 text-sm text-foreground-muted">
        Click outside or press Escape to close.
      </p>
    </div>
  );
}

function OpenButton(props: { label: string; options: OverlayOptions }) {
  const modal = useModal();
  return (
    <button
      type="button"
      class="rounded border border-background-offset px-3 py-1.5 text-sm hover:bg-background-offset"
      onClick={() =>
        modal.open(() => <PanelBody label={props.label} />, props.options)
      }
    >
      {props.label}
    </button>
  );
}

function Shell(props: { children: any }) {
  return (
    <ModalProvider>
      <FakeTopBar />
      <div class="relative">
        <FakeContent />
        <div class="pointer-events-none absolute inset-0 flex items-start justify-center p-4">
          <div class="pointer-events-auto flex flex-wrap gap-2 rounded border border-background-offset bg-background p-3 shadow">
            {props.children}
          </div>
        </div>
      </div>
    </ModalProvider>
  );
}

export const DefaultModal: Story = {
  render: () => (
    <Shell>
      <OpenButton label="Default (modal / md / center)" options={{}} />
    </Shell>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <Shell>
      <For each={["sm", "md", "lg", "xl", "full"] as OverlaySize[]}>
        {(size) => (
          <OpenButton
            label={`modal · ${size}`}
            options={{ variant: "modal", size }}
          />
        )}
      </For>
    </Shell>
  ),
};

export const AllAnchors: Story = {
  render: () => (
    <Shell>
      <For
        each={
          [
            "center",
            "top",
            "top-start",
            "top-end",
            "bottom",
            "bottom-start",
            "bottom-end",
            "start",
            "end",
          ] as OverlayAnchor[]
        }
      >
        {(anchor) => (
          <OpenButton
            label={anchor}
            options={{ variant: "panel", size: "md", anchor }}
          />
        )}
      </For>
    </Shell>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <Shell>
      <For each={["modal", "panel", "bare"] as OverlayVariant[]}>
        {(variant) => (
          <OpenButton
            label={variant}
            options={{ variant, size: "md", anchor: "center" }}
          />
        )}
      </For>
    </Shell>
  ),
};

export const PanelTopEnd: Story = {
  name: "Panel · top-end (like the breadcrumb menu)",
  render: () => (
    <Shell>
      <OpenButton
        label="Open panel"
        options={{ variant: "panel", size: "xl", anchor: "top-end" }}
      />
    </Shell>
  ),
};

export const BackdropOverride: Story = {
  render: () => (
    <Shell>
      <OpenButton
        label="panel + backdrop"
        options={{ variant: "panel", backdrop: true }}
      />
      <OpenButton
        label="modal, no backdrop"
        options={{ variant: "modal", backdrop: false }}
      />
      <OpenButton
        label="sticky (no backdrop dismiss)"
        options={{ variant: "modal", dismissOnBackdrop: false }}
      />
    </Shell>
  ),
};

export const ExplicitPlacement: Story = {
  name: "Explicit grid placement",
  render: () => (
    <Shell>
      <OpenButton
        label="cols 2–8, rows 3–10"
        options={{
          variant: "panel",
          placement: { colStart: 2, colEnd: 8, rowStart: 3, rowEnd: 10 },
        }}
      />
      <OpenButton
        label="right rail (cols 9–13, full height)"
        options={{
          variant: "panel",
          placement: { colStart: 9, colEnd: 13, rowStart: 1, rowEnd: 13 },
        }}
      />
      <OpenButton
        label="bottom sheet (rows 9–13)"
        options={{
          variant: "panel",
          placement: { colStart: 1, colEnd: 13, rowStart: 9, rowEnd: 13 },
        }}
      />
    </Shell>
  ),
};
