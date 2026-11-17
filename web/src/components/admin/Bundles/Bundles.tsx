import { createResource, For, Match, Show, Switch } from "solid-js";
import { listBundles, type BundleObject } from "~/server/admin";

export function Bundles() {
  const [inv] = createResource(() => listBundles());

  return (
    <div class="flex h-full flex-col">
      <div class="border-b border-background-offset px-6 py-4">
        <h2 class="text-xl font-medium">Bundles</h2>
        <p class="text-xs text-foreground-muted">
          Artifacts hosted on R2. Teavm uses a flat file-per-pin layout;
          runtime-bundles are a single <code>bundle.tar.gz</code> per kind/pin.
        </p>
      </div>
      <div class="flex-1 overflow-auto p-6">
        <Switch>
          <Match when={inv.error}>
            <p class="text-sm text-red-500">
              Failed to load: {String(inv.error)}
            </p>
          </Match>
          <Match when={inv.loading}>
            <p class="text-sm text-foreground-muted">Loading…</p>
          </Match>
          <Match when={inv()}>
            {(data) => (
              <div class="space-y-6">
                <For each={data().sources}>
                  {(src) => <SourceSection source={src} />}
                </For>
              </div>
            )}
          </Match>
        </Switch>
      </div>
    </div>
  );
}

type SourceProps = {
  source: {
    label: string;
    bucket: string;
    prefix: string;
    objects: BundleObject[];
    error?: string;
  };
};

function SourceSection(props: SourceProps) {
  const totals = () => {
    const objs = props.source.objects;
    const pins = new Set(objs.map((o) => `${o.kind}/${o.pin}`));
    return {
      pins: pins.size,
      objects: objs.length,
      bytes: objs.reduce((n, o) => n + o.size, 0),
    };
  };

  return (
    <section class="rounded border border-background-offset">
      <header class="flex items-center justify-between border-b border-background-offset px-4 py-2">
        <div>
          <h3 class="text-sm font-semibold">{props.source.label}</h3>
          <p class="text-xs text-foreground-muted">
            r2://{props.source.bucket}/{props.source.prefix}
          </p>
        </div>
        <div class="text-right text-xs text-foreground-muted">
          <div>{totals().pins} pins · {totals().objects} objects</div>
          <div>{formatBytes(totals().bytes)}</div>
        </div>
      </header>
      <Show when={props.source.error}>
        <p class="px-4 py-2 text-xs text-red-500">{props.source.error}</p>
      </Show>
      <Show when={props.source.objects.length > 0} fallback={
        <p class="px-4 py-4 text-sm text-foreground-muted">No objects.</p>
      }>
        <ObjectTable objects={props.source.objects} />
      </Show>
    </section>
  );
}

function ObjectTable(props: { objects: BundleObject[] }) {
  return (
    <table class="w-full text-sm">
      <thead class="bg-background-offset/30">
        <tr class="text-left text-xs uppercase tracking-wide text-foreground-muted">
          <th class="px-4 py-2 font-medium">Kind</th>
          <th class="px-4 py-2 font-medium">Pin</th>
          <th class="px-4 py-2 font-medium">File</th>
          <th class="px-4 py-2 font-medium text-right">Size</th>
          <th class="px-4 py-2 font-medium">Uploaded</th>
          <th class="px-4 py-2 font-medium">ETag</th>
        </tr>
      </thead>
      <tbody>
        <For each={props.objects}>
          {(obj) => (
            <tr class="border-t border-background-offset">
              <td class="px-4 py-2 font-mono text-xs">{obj.kind}</td>
              <td class="px-4 py-2 font-mono text-xs">{obj.pin}</td>
              <td class="px-4 py-2 font-mono text-xs">{obj.filename}</td>
              <td class="px-4 py-2 text-right font-mono text-xs">
                {formatBytes(obj.size)}
              </td>
              <td class="px-4 py-2 text-xs">{formatDate(obj.lastModified)}</td>
              <td
                class="px-4 py-2 font-mono text-xs text-foreground-muted"
                title={obj.etag}
              >
                {obj.etag?.slice(0, 10) ?? "—"}
              </td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
