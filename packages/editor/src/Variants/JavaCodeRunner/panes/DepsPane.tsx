import { Show } from "solid-js";
import { useJavaCodeRunner } from "../playground-store";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / 1024 / 1024).toFixed(2)} MiB`;
}

export function DepsPane() {
  const store = useJavaCodeRunner();
  const progress = () => store.depsProgress();
  const percent = () => {
    const p = progress();
    if (!p || p.total == null || p.total === 0) return null;
    return Math.min(100, Math.round((p.received / p.total) * 100));
  };

  return (
    <div class="flex h-full flex-col gap-3 p-3 text-xs">
      <Show when={store.bundleState() === "ready" && !progress()}>
        <div class="text-foreground-muted">Dependencies ready.</div>
      </Show>

      <Show when={store.bundleState() === "fetching" || progress()}>
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between text-foreground-subtle">
            <span>
              {store.bundleState() === "ready"
                ? "Ready"
                : "Downloading dependencies…"}
            </span>
            <Show when={progress()}>
              <span class="font-mono">
                {formatBytes(progress()!.received)}
                <Show when={progress()!.total != null}>
                  {" "}
                  / {formatBytes(progress()!.total!)}
                </Show>
              </span>
            </Show>
          </div>
          <div class="h-2 overflow-hidden rounded bg-background-offset">
            <Show
              when={percent() !== null}
              fallback={
                <div class="h-full w-1/3 animate-pulse rounded bg-primary" />
              }
            >
              <div
                class="h-full rounded bg-primary transition-all"
                style={{ width: `${percent()}%` }}
              />
            </Show>
          </div>
        </div>
      </Show>

      <Show when={store.bundleState() === "failed"}>
        <div class="flex flex-col gap-2">
          <div class="text-red">Dependency download failed.</div>
          <button
            type="button"
            onClick={store.retryDeps}
            class="self-start rounded bg-primary px-3 py-1 text-background hover:opacity-80"
          >
            Retry
          </button>
        </div>
      </Show>

      <Show
        when={
          store.bundleState() === "unknown" &&
          !progress() &&
          store.runState() === "idle"
        }
      >
        <div class="text-foreground-muted">Dependencies not loaded yet.</div>
      </Show>
    </div>
  );
}
