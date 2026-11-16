import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onMount,
  Show,
} from "solid-js";
import { createVirtualizer } from "@tanstack/solid-virtual";
import { deleteUser, listUsersPage, type AdminUser } from "~/server/admin";
import { useSession } from "~/lib/session-context";
import { m } from "~/paraglide/messages";

const PAGE_SIZE = 50;
const ROW_HEIGHT = 36;

export function Users() {
  const session = useSession();
  const [rows, setRows] = createSignal<(AdminUser | undefined)[]>([]);
  const [total, setTotal] = createSignal<number | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [pendingId, setPendingId] = createSignal<string | null>(null);
  const inflight = new Set<number>();

  let scrollRef: HTMLDivElement | undefined;

  async function loadPage(pageIndex: number) {
    if (inflight.has(pageIndex)) return;
    const start = pageIndex * PAGE_SIZE;
    const known = total();
    if (known !== null && start >= known) return;
    inflight.add(pageIndex);
    try {
      const page = await listUsersPage({
        data: { start, count: PAGE_SIZE },
      });
      setTotal(page.total);
      setRows((prev) => {
        const next = prev.slice();
        if (next.length < page.total) next.length = page.total;
        for (let i = 0; i < page.rows.length; i++) {
          next[start + i] = page.rows[i];
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      inflight.delete(pageIndex);
    }
  }

  async function refetch() {
    inflight.clear();
    setRows([]);
    setTotal(null);
    await loadPage(0);
  }

  onMount(() => void loadPage(0));

  const count = createMemo(() => total() ?? 0);

  const virtualizer = createVirtualizer({
    get count() {
      return count();
    },
    getScrollElement: () => scrollRef ?? null,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  createEffect(() => {
    const items = virtualizer.getVirtualItems();
    if (items.length === 0) return;
    const firstPage = Math.floor(items[0]!.index / PAGE_SIZE);
    const lastPage = Math.floor(items[items.length - 1]!.index / PAGE_SIZE);
    const loaded = rows();
    for (let p = firstPage; p <= lastPage; p++) {
      const start = p * PAGE_SIZE;
      if (loaded[start] === undefined) void loadPage(p);
    }
  });

  async function onDelete(u: AdminUser) {
    if (
      !confirm(
        m.admin_users_confirm_delete({ name: u.name || u.email || u.id }),
      )
    )
      return;
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
        <Show when={total() !== null}>
          <span class="text-xs text-foreground-muted">
            {m.admin_users_count({ count: total()! })}
          </span>
        </Show>
      </div>
      <Show when={error()}>
        {(msg) => (
          <p class="border-b border-background-offset px-6 py-2 text-sm text-red-500">
            {msg()}
          </p>
        )}
      </Show>
      <UserTableHeader />
      <div ref={scrollRef} class="min-h-0 flex-1 overflow-auto">
        <Show
          when={total() !== null}
          fallback={
            <p class="px-6 py-4 text-sm text-foreground-muted">
              {m.admin_users_loading()}
            </p>
          }
        >
          <div
            class="relative w-full"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            <For each={virtualizer.getVirtualItems()}>
              {(vItem) => {
                const u = () => rows()[vItem.index];
                const isSelf = () => session()?.userId === u()?.id;
                const isPending = () => pendingId() === u()?.id;
                return (
                  <div
                    class="absolute left-0 top-0 grid w-full items-center border-b border-background-offset text-sm"
                    style={{
                      height: `${vItem.size}px`,
                      transform: `translateY(${vItem.start}px)`,
                      "grid-template-columns":
                        "minmax(0,2fr) minmax(0,3fr) 10rem 8rem 6rem",
                    }}
                  >
                    <Show
                      when={u()}
                      fallback={
                        <div class="col-span-5 px-6 text-xs text-foreground-subtle">
                          …
                        </div>
                      }
                    >
                      {(row) => (
                        <>
                          <div class="truncate px-6">{row().name}</div>
                          <div class="truncate px-6 text-foreground-muted">
                            {row().email ?? "—"}
                          </div>
                          <div class="px-6">
                            {row().isAnonymous
                              ? m.admin_users_type_anonymous()
                              : m.admin_users_type_registered()}
                          </div>
                          <div class="px-6 text-foreground-muted tabular-nums">
                            {new Date(row().createdAt).toLocaleDateString()}
                          </div>
                          <div class="px-6 text-right">
                            <button
                              type="button"
                              class="rounded border border-background-offset px-2 py-1 text-xs hover:bg-background-offset disabled:opacity-50"
                              disabled={isSelf() || isPending()}
                              title={
                                isSelf()
                                  ? m.admin_users_cant_delete_self()
                                  : undefined
                              }
                              onClick={() => onDelete(row())}
                            >
                              {isPending()
                                ? m.admin_users_deleting()
                                : m.admin_users_delete()}
                            </button>
                          </div>
                        </>
                      )}
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
}

function UserTableHeader() {
  return (
    <div
      class="grid border-b border-background-offset bg-background text-left text-xs uppercase tracking-wide text-foreground-muted"
      style={{
        "grid-template-columns": "minmax(0,2fr) minmax(0,3fr) 10rem 8rem 6rem",
      }}
    >
      <div class="px-6 py-2">{m.admin_users_col_name()}</div>
      <div class="px-6 py-2">{m.admin_users_col_email()}</div>
      <div class="px-6 py-2">{m.admin_users_col_type()}</div>
      <div class="px-6 py-2">{m.admin_users_col_created()}</div>
      <div class="px-6 py-2" />
    </div>
  );
}
