import type { IndexedStarter } from "~/lib/content";
import { getContentIndex } from "~/lib/content";
import { baseLocale } from "~/paraglide/runtime";

/** All starters, keyed by id. Locale-independent. */
export function getStarters(): Record<string, IndexedStarter> {
  return getContentIndex(baseLocale).starters;
}

export function getStarter(id: string): IndexedStarter | undefined {
  return getStarters()[id];
}

export type ResolvedStarter = {
  id: string;
  title: string;
  language: string;
  activeFile: string;
  files: Record<string, string>;
};

/**
 * Resolve a starter id to the shape the CodeRunner store wants
 * ({ files: Record<path, content>, activeFile, language }). Returns null
 * when the id doesn't match a known starter.
 */
export function resolveStarter(id: string): ResolvedStarter | null {
  const starter = getStarter(id);
  if (!starter) return null;
  return {
    id: starter.id,
    title: starter.title,
    language: starter.language,
    activeFile: starter.activeFile,
    files: { ...starter.contents },
  };
}
