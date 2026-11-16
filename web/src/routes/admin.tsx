import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, For, Show, type Component } from "solid-js";
import { Dynamic } from "solid-js/web";
import { TopBar } from "~/components/TopBar/TopBar";
import { Stats } from "~/components/admin/Stats/Stats";
import { Users } from "~/components/admin/Users/Users";
import { useSession } from "~/lib/session-context";
import { m } from "~/paraglide/messages";

export const Route = createFileRoute("/admin")({
  component: Admin,
});

type TabId = "stats" | "users";

type Tab = {
  id: TabId;
  label: () => string;
  component: Component;
};

const TABS: Tab[] = [
  { id: "stats", label: () => m.admin_tab_stats(), component: Stats },
  { id: "users", label: () => m.admin_tab_users(), component: Users },
];

function Admin() {
  const session = useSession();
  const [active, setActive] = createSignal<TabId>("stats");
  const current = () => TABS.find((t) => t.id === active()) ?? TABS[0];

  return (
    <div class="grid h-screen grid-rows-[auto_auto_1fr]">
      <TopBar />
      <header class="flex items-center justify-between border-b border-background-offset px-6 py-2">
        <h1 class="text-lg font-semibold tracking-tight">
          {m.admin_heading()}
        </h1>
      </header>
      <Show
        when={session()?.isAdmin}
        fallback={
          <div class="flex items-center justify-center">
            <p class="text-sm text-foreground-muted">{m.admin_forbidden()}</p>
          </div>
        }
      >
        <div class="grid min-h-0 grid-cols-[12rem_1fr]">
          <nav class="flex flex-col border-r border-background-offset py-2">
            <For each={TABS}>
              {(tab) => {
                const isActive = () => active() === tab.id;
                return (
                  <button
                    type="button"
                    class="flex w-full items-center px-4 py-2 text-left text-sm hover:bg-background-offset"
                    classList={{
                      "bg-background-offset font-medium": isActive(),
                    }}
                    onClick={() => setActive(tab.id)}
                  >
                    {tab.label()}
                  </button>
                );
              }}
            </For>
          </nav>
          <section class="min-h-0 overflow-auto">
            <Dynamic component={current().component} />
          </section>
        </div>
      </Show>
    </div>
  );
}
