import { For, Show, type JSX } from "solid-js";

export type TabDef = {
  id: string;
  label: string;
  /** Optional badge count. Zero or undefined hides it. */
  badge?: number;
  content: JSX.Element;
};

export type TabGroupProps = {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
};

export function TabGroup(props: TabGroupProps) {
  return (
    <div class="flex h-full min-h-0 flex-col">
      <div
        role="tablist"
        class="flex shrink-0 border-b border-background-offset bg-background"
      >
        <For each={props.tabs}>
          {(tab) => {
            const isActive = () => props.active === tab.id;
            return (
              <button
                type="button"
                role="tab"
                aria-selected={isActive()}
                data-tab-id={tab.id}
                data-active={isActive()}
                onClick={() => props.onChange(tab.id)}
                class="flex items-center gap-1.5 px-3 py-1 text-xs text-foreground-subtle hover:bg-background-offset/40 hover:text-foreground data-[active=true]:border-b-2 data-[active=true]:border-primary data-[active=true]:bg-background-offset data-[active=true]:text-foreground"
              >
                <span>{tab.label}</span>
                <Show when={tab.badge && tab.badge > 0}>
                  <span class="min-w-[1.25rem] rounded-full bg-primary/20 px-1.5 text-[10px] text-primary">
                    {tab.badge}
                  </span>
                </Show>
              </button>
            );
          }}
        </For>
      </div>
      <div class="relative min-h-0 flex-1">
        <For each={props.tabs}>
          {(tab) => (
            <div
              role="tabpanel"
              data-tab-id={tab.id}
              class="absolute inset-0 overflow-auto"
              style={{ display: props.active === tab.id ? "block" : "none" }}
            >
              {tab.content}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
