import type { Component } from "solid-js";
import type {
  ChapterDef,
  LessonDef,
  StarterDef,
  UnitDef,
} from "./types";

export type IndexedLesson = LessonDef & {
  order: number;
  slug: string;
  Body: Component;
};
export type IndexedChapter = ChapterDef & {
  order: number;
  slug: string;
  lessons: IndexedLesson[];
};
export type IndexedUnit = UnitDef & {
  order: number;
  slug: string;
  chapters: IndexedChapter[];
};

export type ContentIndex = {
  units: IndexedUnit[];
  starters: Record<string, StarterDef>;
};

// Glob results are resolved by the importing bundler (Vite). Paths are
// relative to this file inside the content package.
const unitModules = import.meta.glob<UnitDef>(
  "../units/*/unit.*.ts",
  { eager: true, import: "default" },
);
const chapterModules = import.meta.glob<ChapterDef>(
  "../units/*/*/chapter.*.ts",
  { eager: true, import: "default" },
);
const lessonModules = import.meta.glob<LessonDef>(
  "../units/*/*/*.*.mdx",
  { eager: true, import: "meta" },
);
const lessonBodies = import.meta.glob<Component>(
  "../units/*/*/*.*.mdx",
  { eager: true, import: "default" },
);
const starterModules = import.meta.glob<StarterDef>(
  "../starters/*/starter.ts",
  { eager: true, import: "default" },
);

function parsePrefixed(seg: string): { order: number; slug: string } {
  const m = seg.match(/^(\d+)-(.+)$/);
  if (!m) throw new Error(`content: expected NN-slug, got "${seg}"`);
  return { order: Number(m[1]!), slug: m[2]! };
}

function parseLessonFile(name: string): {
  order: number;
  slug: string;
  locale: string;
} {
  const m = name.match(/^(\d+)-(.+)\.([a-z-]+)\.mdx$/);
  if (!m)
    throw new Error(`content: expected NN-slug.<locale>.mdx, got "${name}"`);
  return { order: Number(m[1]!), slug: m[2]!, locale: m[3]! };
}

function parseMetaFile(
  name: string,
  prefix: "unit" | "chapter",
): { locale: string } {
  const m = name.match(new RegExp(`^${prefix}\\.([a-z-]+)\\.ts$`));
  if (!m)
    throw new Error(`content: expected ${prefix}.<locale>.ts, got "${name}"`);
  return { locale: m[1]! };
}

function segments(path: string): string[] {
  const marker = "/units/";
  const i = path.indexOf(marker);
  if (i === -1) throw new Error(`content: path missing /units/: ${path}`);
  return path.slice(i + marker.length).split("/");
}

type UnitBucket = {
  dir: string;
  byLocale: Map<string, UnitDef>;
};
type ChapterBucket = {
  dir: string;
  unitDir: string;
  byLocale: Map<string, ChapterDef>;
};
type LessonLocaleEntry = {
  meta: LessonDef;
  Body: Component;
};
type LessonBucket = {
  file: string;
  unitDir: string;
  chapterDir: string;
  order: number;
  slug: string;
  byLocale: Map<string, LessonLocaleEntry>;
};

function collectBuckets(): {
  units: Map<string, UnitBucket>;
  chapters: Map<string, ChapterBucket>;
  lessons: Map<string, LessonBucket>;
} {
  const units = new Map<string, UnitBucket>();
  const chapters = new Map<string, ChapterBucket>();
  const lessons = new Map<string, LessonBucket>();

  for (const [path, def] of Object.entries(unitModules)) {
    const parts = segments(path);
    const { locale } = parseMetaFile(parts[1]!, "unit");
    const b = units.get(parts[0]!) ?? { dir: parts[0]!, byLocale: new Map() };
    b.byLocale.set(locale, def);
    units.set(parts[0]!, b);
  }

  for (const [path, def] of Object.entries(chapterModules)) {
    const parts = segments(path);
    const { locale } = parseMetaFile(parts[2]!, "chapter");
    const key = `${parts[0]}/${parts[1]}`;
    const b = chapters.get(key) ?? {
      dir: parts[1]!,
      unitDir: parts[0]!,
      byLocale: new Map(),
    };
    b.byLocale.set(locale, def);
    chapters.set(key, b);
  }

  for (const [path, def] of Object.entries(lessonModules)) {
    const parts = segments(path);
    const { locale, order, slug } = parseLessonFile(parts[2]!);
    const key = `${parts[0]}/${parts[1]}/${slug}`;
    const Body = lessonBodies[path];
    if (!Body) throw new Error(`content: missing default export for ${path}`);
    const b = lessons.get(key) ?? {
      file: parts[2]!,
      unitDir: parts[0]!,
      chapterDir: parts[1]!,
      order,
      slug,
      byLocale: new Map<string, LessonLocaleEntry>(),
    };
    b.byLocale.set(locale, { meta: def, Body });
    lessons.set(key, b);
  }

  return { units, chapters, lessons };
}

function pick<T>(byLocale: Map<string, T>, locale: string, baseLocale: string): T {
  return byLocale.get(locale) ?? byLocale.get(baseLocale)!;
}

function buildIndex(
  locale: string,
  baseLocale: string,
  buckets: ReturnType<typeof collectBuckets>,
): ContentIndex {
  const unitsByDir = new Map<string, IndexedUnit>();

  for (const b of buckets.units.values()) {
    const def = pick(b.byLocale, locale, baseLocale);
    const { order, slug } = parsePrefixed(b.dir);
    unitsByDir.set(b.dir, { ...def, order, slug, chapters: [] });
  }

  const chaptersByKey = new Map<string, IndexedChapter>();
  for (const b of buckets.chapters.values()) {
    const def = pick(b.byLocale, locale, baseLocale);
    const { order, slug } = parsePrefixed(b.dir);
    const chapter: IndexedChapter = { ...def, order, slug, lessons: [] };
    const unit = unitsByDir.get(b.unitDir)!;
    unit.chapters.push(chapter);
    chaptersByKey.set(`${b.unitDir}/${b.dir}`, chapter);
  }

  for (const b of buckets.lessons.values()) {
    const entry = pick(b.byLocale, locale, baseLocale);
    const chapter = chaptersByKey.get(`${b.unitDir}/${b.chapterDir}`)!;
    chapter.lessons.push({
      ...entry.meta,
      order: b.order,
      slug: b.slug,
      Body: entry.Body,
    });
  }

  const starters: Record<string, StarterDef> = {};
  for (const def of Object.values(starterModules)) starters[def.id] = def;

  const units = [...unitsByDir.values()].sort((a, b) => a.order - b.order);
  for (const u of units) {
    u.chapters.sort((a, b) => a.order - b.order);
    for (const c of u.chapters) c.lessons.sort((a, b) => a.order - b.order);
  }

  return { units, starters };
}

export function createContentRegistry(opts: { baseLocale: string }) {
  const buckets = collectBuckets();
  const indexCache = new Map<string, ContentIndex>();

  function getContentIndex(locale: string): ContentIndex {
    let cached = indexCache.get(locale);
    if (!cached) {
      cached = buildIndex(locale, opts.baseLocale, buckets);
      indexCache.set(locale, cached);
    }
    return cached;
  }

  return { getContentIndex, findLesson };
}

export function findLesson(
  index: ContentIndex,
  unitSlug: string,
  chapterSlug: string,
  lessonSlug: string,
): { unit: IndexedUnit; chapter: IndexedChapter; lesson: IndexedLesson } | undefined {
  const unit = index.units.find((u) => u.slug === unitSlug);
  if (!unit) return undefined;
  const chapter = unit.chapters.find((c) => c.slug === chapterSlug);
  if (!chapter) return undefined;
  const lesson = chapter.lessons.find((l) => l.slug === lessonSlug);
  if (!lesson) return undefined;
  return { unit, chapter, lesson };
}

export type LessonNeighbor = {
  unitSlug: string;
  chapterSlug: string;
  lessonSlug: string;
  title: string;
};

function flattenLessons(index: ContentIndex): LessonNeighbor[] {
  const out: LessonNeighbor[] = [];
  for (const unit of index.units) {
    for (const chapter of unit.chapters) {
      for (const lesson of chapter.lessons) {
        out.push({
          unitSlug: unit.slug,
          chapterSlug: chapter.slug,
          lessonSlug: lesson.slug,
          title: lesson.title,
        });
      }
    }
  }
  return out;
}

export function findAdjacentLessons(
  index: ContentIndex,
  unitSlug: string,
  chapterSlug: string,
  lessonSlug: string,
): { prev?: LessonNeighbor; next?: LessonNeighbor } {
  const flat = flattenLessons(index);
  const i = flat.findIndex(
    (l) =>
      l.unitSlug === unitSlug &&
      l.chapterSlug === chapterSlug &&
      l.lessonSlug === lessonSlug,
  );
  if (i < 0) return {};
  return { prev: flat[i - 1], next: flat[i + 1] };
}
