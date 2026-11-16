import { createResource, createSignal, For, Match, Show, Switch } from "solid-js";
import { deleteUser, listUsers, type AdminUser } from "~/server/admin";
import { useSession } from "~/lib/session-context";
import { m } from "~/paraglide/messages";

export function Users() {
  const session = useSession();
  const [users, { refetch }] = createResource(() => listUsers());
  const [pendingId, setPendingId] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  async function onDelete(u: AdminUser) {
    if (!confirm(m.admin_users_confirm_delete({ name: u.name || u.email }))) return;
    setPendingId(u.id);
    setError(null);
    try {
      await deleteUser({ data: { userId: u.id } });
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div class="flex h-full flex-col">
      <div class="flex items-baseline justify-between border-b border-background-offset px-6 py-4">
        <h2 class="text-xl font-medium">{m.admin_tab_users()}</h2>
        <Show when={users()}>
          {(list) => (
            <span class="text-xs text-foreground-muted">
              {m.admin_users_count({ count: list().length })}
            </span>
          )}
        </Show>
      </div>
      <Show when={error()}>
        {(msg) => (
          <p class="border-b border-background-offset px-6 py-2 text-sm text-red-500">
            {msg()}
          </p>
        )}
      </Show>
      <div class="flex-1 overflow-auto">
        <Switch>
          <Match when={users.error}>
            <p class="px-6 py-4 text-sm text-foreground-muted">
              {m.admin_users_error()}
            </p>
          </Match>
          <Match when={users.loading}>
            <p class="px-6 py-4 text-sm text-foreground-muted">
              {m.admin_users_loading()}
            </p>
          </Match>
          <Match when={users()}>
            {(list) => (
              <table class="w-full text-sm">
                <thead class="sticky top-0 bg-background text-left text-xs uppercase tracking-wide text-foreground-muted">
                  <tr>
                    <th class="px-6 py-2 font-normal">
                      {m.admin_users_col_name()}
                    </th>
                    <th class="px-6 py-2 font-normal">
                      {m.admin_users_col_email()}
                    </th>
                    <th class="px-6 py-2 font-normal">
                      {m.admin_users_col_type()}
                    </th>
                    <th class="px-6 py-2 font-normal">
                      {m.admin_users_col_created()}
                    </th>
                    <th class="px-6 py-2 font-normal" />
                  </tr>
                </thead>
                <tbody>
                  <For each={list()}>
                    {(u) => {
                      const isSelf = () => session()?.userId === u.id;
                      const isPending = () => pendingId() === u.id;
                      return (
                        <tr class="border-t border-background-offset">
                          <td class="px-6 py-2">{u.name}</td>
                          <td class="px-6 py-2 text-foreground-muted">
                            {u.email}
                          </td>
                          <td class="px-6 py-2">
                            {u.isAnonymous
                              ? m.admin_users_type_anonymous()
                              : m.admin_users_type_registered()}
                          </td>
                          <td class="px-6 py-2 text-foreground-muted tabular-nums">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td class="px-6 py-2 text-right">
                            <button
                              type="button"
                              class="rounded border border-background-offset px-2 py-1 text-xs hover:bg-background-offset disabled:opacity-50"
                              disabled={isSelf() || isPending()}
                              title={isSelf() ? m.admin_users_cant_delete_self() : undefined}
                              onClick={() => onDelete(u)}
                            >
                              {isPending()
                                ? m.admin_users_deleting()
                                : m.admin_users_delete()}
                            </button>
                          </td>
                        </tr>
                      );
                    }}
                  </For>
                </tbody>
              </table>
            )}
          </Match>
        </Switch>
      </div>
    </div>
  );
}
