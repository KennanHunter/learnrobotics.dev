import { createEffect, onCleanup } from "solid-js";
import { useJavaCodeRunner } from "@learnrobotics/editor/variants/java-code-runner";
import { DRAFT_STORAGE_PREFIX } from "./StarterPicker";

export type DraftPersistProps = {
  starterId: string;
  starterTitle: string;
  /** Called with the Date.now() timestamp after each successful save. */
  onSaved?: (ts: number) => void;
  /** Called with Date.now() when a save is scheduled but hasn't fired yet. */
  onDirty?: (ts: number) => void;
};

/** Mounts inside a JavaCodeRunnerProvider and persists edits to localStorage. */
export function DraftPersist(props: DraftPersistProps) {
  const store = useJavaCodeRunner();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let firstRun = true;

  createEffect(() => {
    const files = store.files();
    const activeFile = store.activeFile();
    if (typeof localStorage === "undefined") return;
    if (firstRun) {
      firstRun = false;
      return;
    }
    props.onDirty?.(Date.now());
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const ts = Date.now();
        localStorage.setItem(
          DRAFT_STORAGE_PREFIX + props.starterId,
          JSON.stringify({
            id: props.starterId,
            title: props.starterTitle,
            updatedAt: ts,
            activeFile,
            files,
          }),
        );
        props.onSaved?.(ts);
      } catch {
        // Quota or private mode; drop silently.
      }
    }, 300);
  });

  onCleanup(() => {
    if (timer) clearTimeout(timer);
  });

  return null;
}
