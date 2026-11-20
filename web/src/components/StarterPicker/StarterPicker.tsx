import { createResource, createSignal, For, onMount, Show } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import type { IndexedStarter } from "~/lib/content";
import { getStarters } from "~/lib/starters";
import { localizeHref } from "~/paraglide/runtime";
import { deleteUserProject, listUserProjects } from "~/server/projects";
import type { ProjectSummary } from "@learnrobotics/db";

type LegacyDraft = {
  id: string;
  title: string;
  updatedAt: number;
  activeFile: string;
  files: Record<string, string>;
};

const DRAFT_PREFIX = "playground:draft:";

function loadLegacyDrafts(): LegacyDraft[] {
  if (typeof localStorage === "undefined") return [];
  const out: LegacyDraft[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(DRAFT_PREFIX)) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as LegacyDraft;
      if (parsed && parsed.id && parsed.files) out.push(parsed);
    } catch {
      /* ignore malformed drafts */
    }
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function StarterPicker() {
  const navigate = useNavigate();
  const [legacyDrafts, setLegacyDrafts] = createSignal<LegacyDraft[]>([]);
  onMount(() => setLegacyDrafts(loadLegacyDrafts()));

  const [projects, { refetch: refetchProjects }] = createResource<
    ProjectSummary[]
  >(async () => {
    try {
      return await listUserProjects();
    } catch {
      return [];
    }
  });

  const starters = Object.values(getStarters()) as IndexedStarter[];

  const openStarter = (id: string) =>
    navigate({ to: "/playground", search: { s: id } });

  const openProject = (p: ProjectSummary) =>
    navigate({
      to: "/playground",
      search: { s: p.starterId ?? undefined, project: p.id },
    });

  const deleteProject = async (id: string) => {
    try {
      await deleteUserProject({ data: { id } });
    } catch {
      /* ignore — refetch will reconcile */
    }
    void refetchProjects();
  };

  const deleteLegacyDraft = (id: string) => {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(DRAFT_PREFIX + id);
    setLegacyDrafts(loadLegacyDrafts());
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
                  onClick={() => openStarter(s.id)}
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
        <h2 class="mb-4 text-lg font-semibold tracking-tight">Your projects</h2>
        <Show
          when={(projects() ?? []).length > 0}
          fallback={
            <p class="text-xs text-foreground-muted">
              Past code sessions will show up here.
            </p>
          }
        >
          <ul class="flex flex-col gap-2">
            <For each={projects()}>
              {(p) => (
                <li class="flex items-center justify-between gap-3 rounded border border-background-offset bg-background px-4 py-2">
                  <button
                    type="button"
                    onClick={() => openProject(p)}
                    class="flex flex-1 flex-col items-start gap-0.5 text-left hover:opacity-80"
                  >
                    <span class="text-sm font-medium">{p.title}</span>
                    <span class="text-[11px] text-foreground-muted">
                      {new Date(p.updatedAt).toLocaleString()}
                      {p.starterId ? ` · ${p.starterId}` : " · scratch"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteProject(p.id)}
                    class="rounded px-2 py-1 text-xs text-foreground-muted hover:bg-background-offset hover:text-foreground"
                    aria-label="Delete project"
                  >
                    ✕
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </section>

      <Show when={legacyDrafts().length > 0}>
        <section>
          <h2 class="mb-2 text-sm font-semibold tracking-tight">
            Local drafts
          </h2>
          <p class="mb-3 text-[11px] text-foreground-muted">
            These were saved to this browser before cloud sync. Open one to
            migrate, or delete if no longer needed.
          </p>
          <ul class="flex flex-col gap-2">
            <For each={legacyDrafts()}>
              {(d) => (
                <li class="flex items-center justify-between gap-3 rounded border border-background-offset bg-background px-4 py-2">
                  <button
                    type="button"
                    onClick={() => openStarter(d.id)}
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
                    onClick={() => deleteLegacyDraft(d.id)}
                    class="rounded px-2 py-1 text-xs text-foreground-muted hover:bg-background-offset hover:text-foreground"
                    aria-label="Delete draft"
                  >
                    ✕
                  </button>
                </li>
              )}
            </For>
          </ul>
        </section>
      </Show>

      <a
        href={localizeHref("/")}
        class="inline-block text-xs text-foreground-muted hover:text-foreground"
      >
        ← Back to home
      </a>
    </div>
  );
}

export const DRAFT_STORAGE_PREFIX = DRAFT_PREFIX;
