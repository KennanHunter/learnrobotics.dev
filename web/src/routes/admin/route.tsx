import { createFileRoute, Link, Outlet } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import { TopBar } from "~/components/TopBar/TopBar";
import { useSession } from "@learnrobotics/db";
import { m } from "~/paraglide/messages";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

type TabId = "stats" | "users" | "bundles";

const TABS: { id: TabId; label: () => string; to: string }[] = [
  { id: "stats", label: () => m.admin_tab_stats(), to: "/admin/stats" },
  { id: "users", label: () => m.admin_tab_users(), to: "/admin/users" },
  { id: "bundles", label: () => "Bundles", to: "/admin/bundles" },
];

function AdminLayout() {
  const session = useSession();

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
              {(tab) => (
                <Link
                  to={tab.to}
                  class="flex w-full items-center px-4 py-2 text-left text-sm hover:bg-background-offset"
                  activeProps={{
                    class:
                      "flex w-full items-center px-4 py-2 text-left text-sm bg-background-offset font-medium",
                  }}
                >
                  {tab.label()}
                </Link>
              )}
            </For>
          </nav>
          <section class="min-h-0 overflow-auto">
            <Outlet />
          </section>
        </div>
      </Show>
    </div>
  );
}
