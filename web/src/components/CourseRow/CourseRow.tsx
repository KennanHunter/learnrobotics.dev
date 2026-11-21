import { createSignal, For, Show } from "solid-js";
import { AiOutlineRight } from "solid-icons/ai/AiOutlineRight";
import { StatusIcon } from "~/components/StatusIcon/StatusIcon";
import type {
  IndexedChapter,
  IndexedLesson,
  IndexedUnit,
  LessonImportance,
  LessonKind,
} from "~/lib/content";
import { localizeHref } from "~/paraglide/runtime";

const kindLabel: Record<LessonKind, string> = {
  reading: "Read",
  code: "Code",
  sim: "Sim",
  quiz: "Quiz",
};

const importanceLabel: Record<LessonImportance, string> = {
  essential: "Essential",
  useful: "Useful",
  niche: "Niche",
};

const importanceClass: Record<LessonImportance, string> = {
  essential: "border-foreground-muted text-primary",
  useful: "border-foreground-subtle text-foreground-muted",
  niche: "border-foreground-subtle text-foreground-subtle",
};

export function CourseRow(props: { course: IndexedUnit }) {
  const [expanded, setExpanded] = createSignal(true);

  const progress = () => {
    const lessons = props.course.chapters.flatMap((c) => c.lessons);
    const done = lessons.filter(
      (l) => l.status === "done" || l.status === "placement-passed",
    ).length;
    const started = lessons.filter((l) => l.status === "in-progress").length;
    return { done, started, total: lessons.length };
  };

  return (
    <section class="py-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded()}
        class="group flex w-full items-start gap-5 text-left"
      >
        <AiOutlineRight
          class="mt-2 shrink-0 text-2xl text-foreground-muted transition-transform duration-200 group-hover:text-primary"
          style={{ transform: expanded() ? "rotate(90deg)" : "rotate(0deg)" }}
        />
        <div class="flex-1">
          <div class="flex items-center gap-6">
            <h2 class="text-3xl font-semibold tracking-tight">
              {props.course.title}
            </h2>
            <CourseProgress
              done={progress().done}
              started={progress().started}
              total={progress().total}
            />
          </div>
          <p class="mt-2 text-base text-foreground-muted">
            {props.course.blurb}
          </p>
        </div>
      </button>

      <div
        class="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
        style={{
          "grid-template-rows": expanded() ? "1fr" : "0fr",
          opacity: expanded() ? 1 : 0,
        }}
        aria-hidden={!expanded()}
      >
        <div class="min-h-0 overflow-hidden pt-6">
          <div
            class="grid grid-cols-1 gap-6"
            classList={{
              "md:grid-cols-2 md:[&>*:last-child:nth-child(odd)]:col-span-2":
                props.course.chapters.length > 1,
            }}
          >
            <For each={props.course.chapters}>
              {(chapter) => (
                <ChapterBox unit={props.course} chapter={chapter} />
              )}
            </For>
          </div>
        </div>
      </div>
    </section>
  );
}

function CourseProgress(props: {
  done: number;
  started: number;
  total: number;
}) {
  const donePct = () =>
    props.total === 0 ? 0 : (props.done / props.total) * 100;
  const startedPct = () =>
    props.total === 0 ? 0 : (props.started / props.total) * 100;
  return (
    <div class="flex flex-1 items-center gap-3">
      <div
        class="flex h-2 flex-1 overflow-hidden rounded-full bg-background-offset"
        role="progressbar"
        aria-valuenow={props.done}
        aria-valuemin="0"
        aria-valuemax={props.total}
      >
        <div
          class="h-full bg-green transition-all"
          style={{ width: `${donePct()}%` }}
        />
        <div
          class="h-full bg-[#e5b800] transition-all"
          style={{ width: `${startedPct()}%` }}
        />
      </div>
      <span class="shrink-0 font-mono text-xs text-foreground-muted">
        {props.done} / {props.total}
      </span>
    </div>
  );
}

function ChapterBox(props: { unit: IndexedUnit; chapter: IndexedChapter }) {
  return (
    <div
      id={`chapter-${props.chapter.id}`}
      class="scroll-mt-20 rounded-lg border border-background-offset p-7"
    >
      <h3 class="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
        {props.chapter.title}
      </h3>
      <p class="mb-5 mt-1 text-sm text-foreground-muted">
        {props.chapter.description}
      </p>
      <ul class="flex flex-col gap-1">
        <For each={props.chapter.lessons}>
          {(lesson) => (
            <LessonRow
              unit={props.unit}
              chapter={props.chapter}
              lesson={lesson}
            />
          )}
        </For>
      </ul>
    </div>
  );
}

function LessonRow(props: {
  unit: IndexedUnit;
  chapter: IndexedChapter;
  lesson: IndexedLesson;
}) {
  const href = () =>
    localizeHref(
      `/units/${props.unit.slug}/${props.chapter.slug}/${props.lesson.slug}`,
    );

  return (
    <li>
      <a
        href={href()}
        class="-mx-2 flex items-center gap-2 rounded px-2 py-1 text-sm transition-colors hover:bg-background-offset"
      >
        <StatusIcon status={props.lesson.status ?? "todo"} />
        <span class="w-10 shrink-0 font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
          {kindLabel[props.lesson.kind]}
        </span>
        <span class="min-w-0 flex-1 truncate">{props.lesson.title}</span>
        <span
          class={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${importanceClass[props.lesson.importance]}`}
        >
          {importanceLabel[props.lesson.importance]}
        </span>
        <span class="min-w-5 shrink-0 text-right font-mono text-xs text-foreground-subtle">
          <Show when={props.lesson.estMinutes != null}>
            {props.lesson.estMinutes}m
          </Show>
        </span>
      </a>
    </li>
  );
}
