import { Show } from "solid-js";
import { useJavaCodeRunner } from "../playground-store";

export function StdoutPane() {
  const store = useJavaCodeRunner();
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
