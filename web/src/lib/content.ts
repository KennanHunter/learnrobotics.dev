import { createContentRegistry } from "@learnrobotics/content";
import { baseLocale, type Locale } from "~/paraglide/runtime";

export type {
  LessonDef,
  LessonKind,
  LessonImportance,
  LessonStatus,
  IndexedLesson,
  IndexedChapter,
  IndexedUnit,
  IndexedStarter,
  ContentIndex,
} from "@learnrobotics/content";
export { findLesson } from "@learnrobotics/content";

const registry = createContentRegistry({ baseLocale });

export function getContentIndex(locale: Locale) {
  return registry.getContentIndex(locale);
}
