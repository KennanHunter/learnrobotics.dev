import { createEffect, onCleanup } from "solid-js";
import { useCodeRunner } from "@learnrobotics/editor/variants/code-runner";
import { createUserProject, updateUserProject } from "~/server/projects";
import { DRAFT_STORAGE_PREFIX } from "./StarterPicker";

export type ProjectPersistProps = {
  starterId: string;
  starterTitle: string;
  /** If set, updates this project; if null, creates a new one on first edit. */
  projectId: string | null;
  /** Optional: scopes new projects to a binding key. Used when the lesson
   * route pre-provisions a project id via ensureUserBoundProject but can
   * also be passed alongside a null projectId for a fresh bound project. */
  bindingKey?: string | null;
  /** Fired once after a successful create, with the new project id. */
  onCreated?: (id: string) => void;
  /** Called with Date.now() after each successful server save. */
  onSaved?: (ts: number) => void;
  /** Called with Date.now() when a save is scheduled but hasn't fired. */
  onDirty?: (ts: number) => void;
};

/**
 * Mounts inside a CodeRunnerProvider and persists edits to D1 via the
 * projects server fns. Falls back to localStorage on server failure so the
 * buffer survives; clears the fallback once a server write confirms.
 */
export function ProjectPersist(props: ProjectPersistProps) {
  const store = useCodeRunner();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let firstRun = true;
  let inFlight = false;
  let localId: string | null = props.projectId;

  const fallbackKey = () => DRAFT_STORAGE_PREFIX + props.starterId;

  const writeFallback = (files: Record<string, string>, activeFile: string) => {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(
        fallbackKey(),
        JSON.stringify({
          id: props.starterId,
          title: props.starterTitle,
          updatedAt: Date.now(),
          activeFile,
          files,
        }),
      );
    } catch {
      // quota/private mode — nothing we can do
    }
  };

  const clearFallback = () => {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.removeItem(fallbackKey());
    } catch {
      /* ignore */
    }
  };

  const save = async (files: Record<string, string>, activeFile: string) => {
    if (inFlight) return;
    inFlight = true;
    try {
      if (localId == null) {
        const row = await createUserProject({
          data: {
            title: props.starterTitle,
            starterId: props.starterId,
            bindingKey: props.bindingKey ?? null,
            activeFile,
            files,
          },
        });
        localId = row.id;
        props.onCreated?.(row.id);
      } else {
        await updateUserProject({
          data: {
            id: localId,
            patch: { files, activeFile },
          },
        });
      }
      props.onSaved?.(Date.now());
      clearFallback();
    } catch {
      writeFallback(files, activeFile);
    } finally {
      inFlight = false;
    }
  };

  createEffect(() => {
    const files = store.files();
    const activeFile = store.activeFile();
    if (firstRun) {
      firstRun = false;
      return;
    }
    props.onDirty?.(Date.now());
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void save(files, activeFile);
    }, 300);
  });

  onCleanup(() => {
    if (timer) clearTimeout(timer);
  });

  return null;
}
