import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  on,
  Show,
  untrack,
} from "solid-js";
import { useNavigate, useSearch } from "@tanstack/solid-router";
import { createVirtualizer } from "@tanstack/solid-virtual";
import {
  deleteUser,
  getUserDetails,
  listUsersPage,
  type AdminUser,
} from "~/server/admin";
import { useSession } from "~/lib/session-context";
import { m } from "~/paraglide/messages";

const PAGE_SIZE = 50;
const ROW_HEIGHT = 36;
const GRID_COLS = "minmax(0,2fr) minmax(0,3fr) 10rem 8rem 6rem";

export function Users() {
  const session = useSession();
  const search = useSearch({ from: "/admin/users" });
  const navigate = useNavigate({ from: "/admin/users" });

  const [rows, setRows] = createSignal<(AdminUser | undefined)[]>([]);
  const [total, setTotal] = createSignal<number | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [pendingId, setPendingId] = createSignal<string | null>(null);
  const [expandedIndex, setExpandedIndex] = createSignal<number | null>(null);
  const EXPANDED_DETAIL_PX = 340;
  const [queryInput, setQueryInput] = createSignal(search().q ?? "");
  const inflight = new Set<number>();

  let scrollRef: HTMLDivElement | undefined;
  let debounce: ReturnType<typeof setTimeout> | undefined;

  const activeQuery = () => search().q?.trim() || undefined;

  async function loadPage(pageIndex: number, opts?: { reset?: boolean }) {
    if (inflight.has(pageIndex)) return;
    const start = pageIndex * PAGE_SIZE;
    // Read reactive state without tracking — callers run inside effects and
    // we don't want fetches to re-register the effect on every state write.
    const known = untrack(total);
    const q = untrack(activeQuery);
    if (!opts?.reset && known !== null && start >= known) return;
    inflight.add(pageIndex);
    try {
      const page = await listUsersPage({
        data: { start, count: PAGE_SIZE, query: q },
      });
      setTotal(page.total);
      setRows((prev) => {
        const next = opts?.reset ? [] : prev.slice();
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
    setExpandedIndex(null);
    await loadPage(0, { reset: true });
  }

  // Initial load + re-fetch whenever the URL search query changes.
  // `on` with defer:false fires on setup but only tracks activeQuery, so
  // signal writes inside refetch (setTotal/setRows) don't loop back.
  createEffect(on(activeQuery, () => void refetch()));

  const count = createMemo(() => total() ?? 0);

  const virtualizer = createVirtualizer({
    get count() {
      return count();
    },
    getScrollElement: () => scrollRef ?? null,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  function toggleExpand(index: number) {
    const cur = expandedIndex();
    if (cur === index) {
      setExpandedIndex(null);
      virtualizer.resizeItem(index, ROW_HEIGHT);
      return;
    }
    if (cur !== null) virtualizer.resizeItem(cur, ROW_HEIGHT);
    setExpandedIndex(index);
    virtualizer.resizeItem(index, ROW_HEIGHT + EXPANDED_DETAIL_PX);
  }

  createEffect(() => {
    const items = virtualizer.getVirtualItems();
    if (items.length === 0) return;
    const firstPage = Math.floor(items[0]!.index / PAGE_SIZE);
    const lastPage = Math.floor(items[items.length - 1]!.index / PAGE_SIZE);
    const loaded = rows();
    untrack(() => {
      for (let p = firstPage; p <= lastPage; p++) {
        const start = p * PAGE_SIZE;
        if (loaded[start] === undefined) void loadPage(p);
      }
    });
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

  function onQueryInput(value: string) {
    setQueryInput(value);
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      const next = value.trim();
      void navigate({
        search: (prev) => ({ ...prev, q: next || undefined }),
        replace: true,
      });
    }, 200);
  }

  return (
    <div class="flex h-full flex-col">
      <div class="flex items-baseline justify-between gap-4 border-b border-background-offset px-6 py-4">
        <h2 class="text-xl font-medium">{m.admin_tab_users()}</h2>
        <input
          type="search"
          data-testid="admin-users-search"
          value={queryInput()}
          placeholder="Search name, email, or id…"
          class="min-w-0 flex-1 max-w-md rounded border border-background-offset bg-background px-3 py-1.5 text-sm placeholder:text-foreground-subtle focus:border-primary focus:outline-none"
          onInput={(e) => onQueryInput(e.currentTarget.value)}
        />
        <Show when={total() !== null}>
          <span class="whitespace-nowrap text-xs text-foreground-muted">
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
          <Show
            when={count() > 0}
            fallback={
              <p class="px-6 py-4 text-sm text-foreground-muted">
                No matching users.
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
                  const isExpanded = () => expandedIndex() === vItem.index;
                  return (
                    <div
                      class="absolute left-0 top-0 w-full border-b border-background-offset"
                      style={{
                        transform: `translateY(${vItem.start}px)`,
                      }}
                    >
                      <Show
                        when={u()}
                        fallback={
                          <div
                            class="px-6 text-xs text-foreground-subtle"
                            style={{ height: `${ROW_HEIGHT}px`, "line-height": `${ROW_HEIGHT}px` }}
                          >
                            …
                          </div>
                        }
                      >
                        {(row) => (
                          <>
                            <div
                              role="button"
                              tabindex={0}
                              aria-expanded={isExpanded()}
                              data-testid="admin-user-row"
                              data-user-id={row().id}
                              class="grid w-full cursor-pointer items-center text-left text-sm hover:bg-background-offset/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                              style={{
                                height: `${ROW_HEIGHT}px`,
                                "grid-template-columns": GRID_COLS,
                              }}
                              onClick={() => toggleExpand(vItem.index)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  toggleExpand(vItem.index);
                                }
                              }}
                            >
                              <div class="flex min-w-0 items-center gap-2 px-6">
                                <span class="text-foreground-subtle">
                                  {isExpanded() ? "▾" : "▸"}
                                </span>
                                <span class="truncate">{row().name}</span>
                              </div>
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void onDelete(row());
                                  }}
                                >
                                  {isPending()
                                    ? m.admin_users_deleting()
                                    : m.admin_users_delete()}
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </Show>
                    </div>
                  );
                }}
              </For>
              <Show when={expandedIndex() !== null}>
                {(_) => {
                  const idx = () => expandedIndex()!;
                  const expandedUser = () => rows()[idx()];
                  return (
                    <Show when={expandedUser()}>
                      {(u) => (
                        <div
                          class="absolute left-0 w-full"
                          style={{
                            top: `${idx() * ROW_HEIGHT + ROW_HEIGHT}px`,
                            height: `${EXPANDED_DETAIL_PX}px`,
                          }}
                        >
                          <UserDetails userId={u().id} />
                        </div>
                      )}
                    </Show>
                  );
                }}
              </Show>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
}

function UserTableHeader() {
  return (
    <div
      class="grid border-b border-background-offset bg-background text-left text-xs uppercase tracking-wide text-foreground-muted"
      style={{ "grid-template-columns": GRID_COLS }}
    >
      <div class="px-6 py-2">{m.admin_users_col_name()}</div>
      <div class="px-6 py-2">{m.admin_users_col_email()}</div>
      <div class="px-6 py-2">{m.admin_users_col_type()}</div>
      <div class="px-6 py-2">{m.admin_users_col_created()}</div>
      <div class="px-6 py-2" />
    </div>
  );
}

function UserDetails(props: { userId: string }) {
  const [details] = createResource(
    () => props.userId,
    (userId) => getUserDetails({ data: { userId } }),
  );
  return (
    <div class="border-t border-background-offset bg-background-offset/30 px-6 py-4 text-sm">
      <Show
        when={details()}
        fallback={
          <Show
            when={details.error}
            fallback={<p class="text-foreground-muted">Loading details…</p>}
          >
            <p class="text-red-500">
              {details.error instanceof Error
                ? details.error.message
                : String(details.error)}
            </p>
          </Show>
        }
      >
        {(d) => (
          <div
            data-testid="user-details"
            data-user-type={d().isAnonymous ? "anonymous" : "registered"}
            class="grid gap-6 md:grid-cols-3"
          >
            <Section
              title={
                <span class="flex items-center gap-2">
                  Identity
                  <Show
                    when={d().isAnonymous}
                    fallback={
                      <span class="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                        registered
                      </span>
                    }
                  >
                    <span class="rounded-full border border-foreground-subtle/30 bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
                      anonymous
                    </span>
                  </Show>
                </span>
              }
            >
              <KV
                k="User ID"
                v={<code class="font-mono text-xs">{d().id}</code>}
              />
              <KV k="Name" v={d().name || "—"} />
              <Show when={!d().isAnonymous}>
                <KV k="Email" v={d().email ?? "—"} />
                <KV
                  k="Email verified"
                  v={d().emailVerified ? "yes" : "no"}
                />
              </Show>
              <KV k="Created" v={new Date(d().createdAt).toLocaleString()} />
              <KV k="Updated" v={new Date(d().updatedAt).toLocaleString()} />
            </Section>
            <Section
              title={
                d().isAnonymous
                  ? "Config"
                  : `Accounts (${d().accounts.length})`
              }
            >
              <Show when={!d().isAnonymous}>
                <Show
                  when={d().accounts.length > 0}
                  fallback={
                    <p class="text-foreground-muted">
                      No linked OAuth accounts.
                    </p>
                  }
                >
                  <ul class="space-y-2">
                    <For each={d().accounts}>
                      {(a) => (
                        <li class="rounded border border-background-offset bg-background p-2">
                          <div class="font-medium">{a.providerId}</div>
                          <div class="text-xs text-foreground-muted">
                            <code class="font-mono">{a.accountId}</code>
                          </div>
                          <Show when={a.scope}>
                            <div class="truncate text-xs text-foreground-muted">
                              scope: {a.scope}
                            </div>
                          </Show>
                          <div class="text-xs text-foreground-subtle">
                            linked{" "}
                            {new Date(a.createdAt).toLocaleDateString()}
                          </div>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </Show>
              <Show
                when={d().config}
                fallback={
                  <Show when={d().isAnonymous}>
                    <p class="text-foreground-muted">
                      No stored config for this user.
                    </p>
                  </Show>
                }
              >
                {(c) => (
                  <div
                    class={
                      d().isAnonymous
                        ? ""
                        : "mt-4 border-t border-background-offset pt-3"
                    }
                  >
                    <Show when={!d().isAnonymous}>
                      <div class="mb-1 text-xs uppercase tracking-wide text-foreground-muted">
                        Config
                      </div>
                    </Show>
                    <KV k="Theme" v={c().theme ?? "—"} />
                    <KV k="Monaco theme" v={c().monacoTheme ?? "—"} />
                  </div>
                )}
              </Show>
            </Section>
            <Section
              title={`Sessions (${d().sessions.active}/${d().sessions.total} active)`}
            >
              <KV
                k="Last seen"
                v={
                  d().sessions.lastSeen
                    ? new Date(d().sessions.lastSeen!).toLocaleString()
                    : "—"
                }
              />
              <Show
                when={d().sessions.recent.length > 0}
                fallback={
                  <p class="mt-2 text-foreground-muted">No sessions.</p>
                }
              >
                <ul class="mt-2 space-y-2">
                  <For each={d().sessions.recent}>
                    {(s) => (
                      <li class="rounded border border-background-offset bg-background p-2 text-xs">
                        <div class="tabular-nums">
                          {new Date(s.updatedAt).toLocaleString()}
                        </div>
                        <Show when={s.ipAddress}>
                          <div class="text-foreground-muted">
                            ip: <code class="font-mono">{s.ipAddress}</code>
                          </div>
                        </Show>
                        <Show when={s.userAgent}>
                          <div
                            class="truncate text-foreground-muted"
                            title={s.userAgent ?? undefined}
                          >
                            {s.userAgent}
                          </div>
                        </Show>
                        <div class="text-foreground-subtle">
                          expires{" "}
                          {new Date(s.expiresAt).toLocaleDateString()}
                        </div>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </Section>
          </div>
        )}
      </Show>
    </div>
  );
}

function Section(props: { title: any; children: any }) {
  return (
    <div>
      <div class="mb-2 text-xs uppercase tracking-wide text-foreground-muted">
        {props.title}
      </div>
      <div class="space-y-1">{props.children}</div>
    </div>
  );
}

function KV(props: { k: string; v: any }) {
  return (
    <div class="flex items-baseline gap-2">
      <span class="w-28 shrink-0 text-xs text-foreground-muted">
        {props.k}
      </span>
      <span class="min-w-0 flex-1 break-words">{props.v}</span>
    </div>
  );
}
