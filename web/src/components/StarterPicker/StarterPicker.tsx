import { createSignal, For, onMount, Show } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import type { IndexedStarter } from "~/lib/content";
import { getStarters } from "~/lib/starters";
import { localizeHref } from "~/paraglide/runtime";

type Draft = {
  id: string;
  title: string;
  updatedAt: number;
  activeFile: string;
  files: Record<string, string>;
};

const DRAFT_PREFIX = "playground:draft:";

function loadDrafts(): Draft[] {
  if (typeof localStorage === "undefined") return [];
  const out: Draft[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(DRAFT_PREFIX)) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as Draft;
      if (parsed && parsed.id && parsed.files) out.push(parsed);
    } catch {
      // ignore malformed drafts
    }
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function StarterPicker() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = createSignal<Draft[]>([]);
  onMount(() => setDrafts(loadDrafts()));

  const starters = Object.values(getStarters()) as IndexedStarter[];
  const open = (id: string) =>
    navigate({ to: "/playground", search: { s: id } });

  const deleteDraft = (id: string) => {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(DRAFT_PREFIX + id);
    setDrafts(loadDrafts());
  };

  return (
    <div class="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <section>
        <h2 class="mb-4 text-lg font-semibold tracking-tight">
          Pick a starter
        </h2>
        <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <For each={starters}>
            {(s) => (
              <li>
                <button
                  type="button"
                  onClick={() => open(s.id)}
                  class="flex w-full flex-col items-start gap-1 rounded border border-background-offset bg-background p-4 text-left transition hover:border-primary/60 hover:bg-background-offset"
                >
                  <span class="text-sm font-medium">{s.title}</span>
                  <span class="text-xs text-foreground-subtle">
                    {s.language} · {s.activeFile}
                  </span>
                  <span class="text-[11px] text-foreground-muted">
                    {Object.keys(s.contents).length} file
                    {Object.keys(s.contents).length === 1 ? "" : "s"}
                  </span>
                </button>
              </li>
            )}
          </For>
        </ul>
      </section>

      <section>
        <h2 class="mb-4 text-lg font-semibold tracking-tight">Your drafts</h2>
        <Show
          when={drafts().length > 0}
          fallback={
            <p class="text-xs text-foreground-muted">
              Past code sessions will show up here.
            </p>
          }
        >
          <ul class="flex flex-col gap-2">
            <For each={drafts()}>
              {(d) => (
                <li class="flex items-center justify-between gap-3 rounded border border-background-offset bg-background px-4 py-2">
                  <button
                    type="button"
                    onClick={() => open(d.id)}
                    class="flex flex-1 flex-col items-start gap-0.5 text-left hover:opacity-80"
                  >
                    <span class="text-sm font-medium">{d.title}</span>
                    <span class="text-[11px] text-foreground-muted">
                      {new Date(d.updatedAt).toLocaleString()} ·{" "}
                      {Object.keys(d.files).length} file
                      {Object.keys(d.files).length === 1 ? "" : "s"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteDraft(d.id)}
                    class="rounded px-2 py-1 text-xs text-foreground-muted hover:bg-background-offset hover:text-foreground"
                    aria-label="Delete draft"
                  >
                    ✕
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
        <a
          href={localizeHref("/")}
          class="mt-6 inline-block text-xs text-foreground-muted hover:text-foreground"
        >
          ← Back to home
        </a>
      </section>
    </div>
  );
}

export const DRAFT_STORAGE_PREFIX = DRAFT_PREFIX;
