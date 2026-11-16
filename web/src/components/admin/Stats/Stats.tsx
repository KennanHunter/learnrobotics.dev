import { createResource, Match, Switch } from "solid-js";
import { getAdminStats } from "~/server/admin";
import { m } from "~/paraglide/messages";

export function Stats() {
  const [stats] = createResource(() => getAdminStats());

  return (
    <div class="flex h-full flex-col">
      <div class="border-b border-background-offset px-6 py-4">
        <h2 class="text-xl font-medium">{m.admin_stats_heading()}</h2>
      </div>
      <div class="flex-1 overflow-auto p-6">
        <Switch>
          <Match when={stats.error}>
            <p class="text-sm text-foreground-muted">
              {m.admin_stats_error()}
            </p>
          </Match>
          <Match when={stats.loading}>
            <p class="text-sm text-foreground-muted">
              {m.admin_stats_loading()}
            </p>
          </Match>
          <Match when={stats()}>
            {(s) => (
              <dl class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Stat
                  label={m.admin_stats_total_users()}
                  value={s().totalUsers}
                />
                <Stat
                  label={m.admin_stats_registered_users()}
                  value={s().registeredUsers}
                />
                <Stat
                  label={m.admin_stats_anonymous_users()}
                  value={s().anonymousUsers}
                />
              </dl>
            )}
          </Match>
        </Switch>
      </div>
    </div>
  );
}

function Stat(props: { label: string; value: number }) {
  return (
    <div class="rounded border border-background-offset p-4">
      <dt class="text-xs uppercase tracking-wide text-foreground-muted">
        {props.label}
      </dt>
      <dd class="mt-1 text-3xl font-semibold tabular-nums">{props.value}</dd>
    </div>
  );
}
