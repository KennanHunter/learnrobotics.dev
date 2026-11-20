import { For } from "solid-js";
import { useCodeRunner } from "./code-runner-store";

export function FilesPane() {
  const store = useCodeRunner();
  const entries = () => Object.keys(store.files()).sort();
  return (
    <ul class="flex flex-col gap-0.5 p-2 text-xs">
      <For each={entries()}>
        {(path) => {
          const isActive = () => store.activeFile() === path;
          return (
            <li>
              <button
                type="button"
                data-active={isActive()}
                onClick={() => store.setActiveFile(path)}
                class="w-full truncate rounded px-2 py-1 text-left hover:bg-background-offset data-[active=true]:bg-background-offset data-[active=true]:text-foreground"
              >
                {path}
              </button>
            </li>
          );
        }}
      </For>
    </ul>
  );
}
