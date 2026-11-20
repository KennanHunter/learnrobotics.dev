import { Show } from "solid-js";
import { useCodeRunner } from "../code-runner-store";

export function StdoutPane() {
  const store = useCodeRunner();
  return (
    <div
      class="h-full overflow-auto p-3 font-mono text-xs"
      data-testid="playground-output"
    >
      <Show
        when={store.stdout()}
        fallback={
          <div class="text-foreground-muted">
            Program output will appear here.
          </div>
        }
      >
        <pre class="whitespace-pre-wrap">{store.stdout()}</pre>
      </Show>
    </div>
  );
}
