import { For, Show } from "solid-js";
import { useCodeRunner } from "../code-runner-store";

export function CompilePane() {
  const store = useCodeRunner();
  const hasContent = () =>
    store.compileError() !== null || store.diagnostics().length > 0;

  return (
    <div class="h-full overflow-auto p-3 font-mono text-xs">
      <Show
        when={hasContent()}
        fallback={
          <div class="text-foreground-muted">No compile output yet.</div>
        }
      >
        <Show when={store.compileError()}>
          <pre class="mb-2 whitespace-pre-wrap text-red">
            {store.compileError()}
          </pre>
        </Show>
        <Show when={store.diagnostics().length > 0}>
          <ul class="flex flex-col gap-1">
            <For each={store.diagnostics()}>
              {(d) => (
                <li
                  classList={{
                    "text-red": d.severity === "error",
                    "text-yellow-500": d.severity === "warning",
                    "text-foreground-muted": d.severity === "other",
                  }}
                >
                  {d.fileName}:{d.lineNumber}
                  {d.columnNumber ? `:${d.columnNumber}` : ""} {d.severity}:{" "}
                  {d.message}
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Show>
    </div>
  );
}
