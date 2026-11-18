import { Show, type JSX } from "solid-js";

export type PanelFrameProps = {
  title?: string;
  actions?: JSX.Element;
  children: JSX.Element;
  /** Hide the header entirely. Use for toolbar-shaped panels. */
  bare?: boolean;
};

export function PanelFrame(props: PanelFrameProps) {
  return (
    <section class="flex h-full min-h-0 flex-col overflow-hidden border border-background-offset bg-background">
      <Show when={!props.bare && (props.title || props.actions)}>
        <header class="flex h-7 shrink-0 items-center gap-2 border-b border-background-offset px-3 text-xs font-medium text-foreground-subtle">
          <Show when={props.title}>
            <span class="flex-1 truncate">{props.title}</span>
          </Show>
          <Show when={!props.title}>
            <span class="flex-1" />
          </Show>
          {props.actions}
        </header>
      </Show>
      <div class="min-h-0 flex-1 overflow-hidden">{props.children}</div>
    </section>
  );
}
