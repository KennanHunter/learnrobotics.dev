import { For, Show } from "solid-js";
import { SnippetCard } from "./SnippetCard";

export type SnippetItem = {
  id: string;
  title: string;
  language: "java" | "markdown";
  body: readonly string[];
};

export type SnippetsPaneProps = {
  snippets: readonly SnippetItem[];
  tabSize: () => number;
};

export function SnippetsPane(props: SnippetsPaneProps) {
  return (
    <div class="flex h-full flex-col overflow-auto px-4 py-3">
      <Show
        when={props.snippets.length > 0}
        fallback={
          <p class="text-xs text-foreground-muted">
            No snippets attached to this lesson.
          </p>
        }
      >
        <p class="mb-3 text-xs text-foreground-muted">
          Reference snippets. Copy any into the editor on the right.
        </p>
        <div class="flex flex-col gap-3">
          <For each={props.snippets}>
            {(s) => (
              <SnippetCard
                title={s.title}
                language={s.language}
                body={s.body}
                tabSize={props.tabSize()}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
