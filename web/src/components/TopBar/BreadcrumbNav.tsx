import { createEffect, createSignal, For, Show, type JSX } from "solid-js";
import { AiOutlineDown } from "solid-icons/ai/AiOutlineDown";
import type {
  ContentIndex,
  IndexedChapter,
  IndexedLesson,
  IndexedUnit,
  LessonStatus,
} from "~/lib/content";
import { useModal } from "~/components/ModalManager/ModalManager";
import { StatusIcon, statusLabel } from "~/components/StatusIcon/StatusIcon";
import { localizeHref } from "~/paraglide/runtime";

export type BreadcrumbCrumbs = {
  index: ContentIndex;
  unit: IndexedUnit;
  chapter: IndexedChapter;
  lesson: IndexedLesson;
};

export function BreadcrumbNav(props: { crumbs: BreadcrumbCrumbs }) {
  const modal = useModal();

  const openPanel = () => {
    modal.open(
      () => <BreadcrumbPanel crumbs={props.crumbs} onNavigate={modal.close} />,
      {
        variant: "panel",
        size: "xl",
        anchor: "top-end",
      },
    );
  };

  return (
    <button
      type="button"
      onClick={openPanel}
      aria-expanded={modal.isOpen()}
      class="flex items-center gap-1.5 rounded-md border border-background-offset/60 px-2.5 py-1 text-xs hover:bg-background-offset/50"
    >
      <span class="text-foreground-muted">{props.crumbs.unit.title}</span>
      <span class="text-foreground-subtle">›</span>
      <span class="text-foreground-muted">{props.crumbs.chapter.title}</span>
      <span class="text-foreground-subtle">›</span>
      <span class="font-medium">{props.crumbs.lesson.title}</span>
      <AiOutlineDown class="text-xs text-foreground-subtle" />
    </button>
  );
}

export function BreadcrumbPanel(props: {
  crumbs: BreadcrumbCrumbs;
  onNavigate: () => void;
}) {
  const [activeUnit, setActiveUnit] = createSignal<IndexedUnit>(
    props.crumbs.unit,
  );
  const [activeChapter, setActiveChapter] = createSignal<IndexedChapter>(
    props.crumbs.chapter,
  );

  return (
    <div class="grid grid-cols-1 sm:grid-cols-2">
      <Column
        title="Unit"
        class="max-h-[50vh] border-b border-background-offset/60 sm:border-r"
      >
        <For each={props.crumbs.index.units}>
          {(unit) => (
            <ColumnRow
              label={unit.title}
              selected={activeUnit().slug === unit.slug}
              current={props.crumbs.unit.slug === unit.slug}
              progress={unitProgress(unit)}
              onSelect={() => {
                setActiveUnit(unit);
                setActiveChapter(unit.chapters[0]!);
              }}
            />
          )}
        </For>
      </Column>
      <Column
        title="Chapter"
        class="max-h-[50vh] border-b border-background-offset/60"
      >
        <For each={activeUnit().chapters}>
          {(chapter) => (
            <ColumnRow
              label={chapter.title}
              selected={activeChapter().slug === chapter.slug}
              current={
                props.crumbs.unit.slug === activeUnit().slug &&
                props.crumbs.chapter.slug === chapter.slug
              }
              progress={chapterProgress(chapter)}
              onSelect={() => setActiveChapter(chapter)}
            />
          )}
        </For>
      </Column>
      <Column title="Lesson" class="max-h-[50vh] sm:col-span-2">
        <For each={activeChapter().lessons}>
          {(lesson) => (
            <ColumnRow
              label={lesson.title}
              selected={
                props.crumbs.unit.slug === activeUnit().slug &&
                props.crumbs.chapter.slug === activeChapter().slug &&
                props.crumbs.lesson.slug === lesson.slug
              }
              current={
                props.crumbs.unit.slug === activeUnit().slug &&
                props.crumbs.chapter.slug === activeChapter().slug &&
                props.crumbs.lesson.slug === lesson.slug
              }
              progress={lessonProgress(lesson.status)}
              href={localizeHref(
                `/units/${activeUnit().slug}/${activeChapter().slug}/${lesson.slug}`,
              )}
              onSelect={props.onNavigate}
            />
          )}
        </For>
      </Column>
    </div>
  );
}

function Column(props: {
  title: string;
  class?: string;
  scroll?: boolean;
  children: JSX.Element;
}) {
  const scroll = () => props.scroll ?? true;
  return (
    <div class={`flex min-h-0 flex-col ${props.class ?? ""}`}>
      <div class="border-b border-background-offset/60 bg-background px-4 py-2 font-mono text-xs uppercase tracking-widest text-foreground-subtle">
        {props.title}
      </div>
      <div class={scroll() ? "min-h-0 flex-1 overflow-y-auto py-1" : "py-1"}>
        {props.children}
      </div>
    </div>
  );
}

type ProgressInfo =
  | { kind: "ratio"; done: number; total: number }
  | { kind: "status"; status: LessonStatus };

function ColumnRow(props: {
  label: string;
  selected: boolean;
  current: boolean;
  progress: ProgressInfo;
  href?: string;
  onSelect: () => void;
}) {
  let rowRef: HTMLElement | undefined;
  const base =
    "flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm";
  const stateClass = () =>
    props.selected
      ? "bg-background-offset/70"
      : "hover:bg-background-offset/40";

  // When this row becomes the selected one in its column, scroll it into
  // view — covers both the initial panel open and column pivots triggered
  // by clicks in the column to the left.
  createEffect(() => {
    if (props.selected && rowRef) {
      rowRef.scrollIntoView({ block: "nearest" });
    }
  });

  const inner = (
    <>
      <span class="flex items-center gap-2 truncate">
        <Show when={props.current}>
          <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
        </Show>
        <span class="truncate">{props.label}</span>
      </span>
      <ProgressBadge progress={props.progress} />
    </>
  );

  if (props.href) {
    return (
      <a
        ref={(el) => (rowRef = el)}
        href={props.href}
        onClick={props.onSelect}
        class={`${base} ${stateClass()}`}
      >
        {inner}
      </a>
    );
  }
  return (
    <button
      ref={(el) => (rowRef = el)}
      type="button"
      onClick={props.onSelect}
      class={`${base} ${stateClass()}`}
    >
      {inner}
    </button>
  );
}

function ProgressBadge(props: { progress: ProgressInfo }) {
  return (
    <Show
      when={props.progress.kind === "ratio"}
      fallback={<StatusDot status={(props.progress as any).status} />}
    >
      <RatioBar
        done={(props.progress as any).done}
        total={(props.progress as any).total}
      />
    </Show>
  );
}

function RatioBar(props: { done: number; total: number }) {
  const pct = () => (props.total === 0 ? 0 : (props.done / props.total) * 100);
  return (
    <span class="flex shrink-0 items-center gap-2">
      <span class="h-1.5 w-16 overflow-hidden rounded-full bg-background-offset/70">
        <span class="block h-full bg-green" style={{ width: `${pct()}%` }} />
      </span>
      <span class="w-10 text-right font-mono text-xs text-foreground-subtle">
        {props.done}/{props.total}
      </span>
    </span>
  );
}

function StatusDot(props: { status: LessonStatus }) {
  return (
    <span
      class="flex shrink-0 items-center gap-2 font-mono text-xs text-foreground-subtle"
      aria-label={statusLabel[props.status]}
      title={statusLabel[props.status]}
    >
      <StatusIcon status={props.status} />
    </span>
  );
}

function unitProgress(unit: IndexedUnit): ProgressInfo {
  let done = 0;
  let total = 0;
  for (const chapter of unit.chapters) {
    for (const lesson of chapter.lessons) {
      total++;
      if (isDone(lesson.status)) done++;
    }
  }
  return { kind: "ratio", done, total };
}

function chapterProgress(chapter: IndexedChapter): ProgressInfo {
  let done = 0;
  for (const lesson of chapter.lessons) {
    if (isDone(lesson.status)) done++;
  }
  return { kind: "ratio", done, total: chapter.lessons.length };
}

function lessonProgress(status: LessonStatus | undefined): ProgressInfo {
  return { kind: "status", status: status ?? "todo" };
}

function isDone(status: LessonStatus | undefined): boolean {
  return status === "done" || status === "placement-passed";
}
