import { Show } from "solid-js";
import { AiOutlineArrowLeft } from "solid-icons/ai/AiOutlineArrowLeft";
import { AiOutlineArrowRight } from "solid-icons/ai/AiOutlineArrowRight";

export type LessonNavLink = {
  href: string;
  title: string;
};

export type LessonNavProps = {
  prev?: LessonNavLink;
  next?: LessonNavLink;
};

export function LessonNav(props: LessonNavProps) {
  return (
    <nav
      aria-label="Lesson navigation"
      class="mt-10 flex w-full flex-col items-stretch justify-between gap-3 border-t border-background-offset/60 pt-6 sm:flex-row"
    >
      <Show
        when={props.prev}
        fallback={<span class="flex-1" aria-hidden="true" />}
      >
        {(prev) => (
          <a
            href={prev().href}
            rel="prev"
            class="group flex flex-1 items-center gap-3 rounded border border-background-offset/60 px-4 py-3 text-left hover:bg-background-offset"
          >
            <AiOutlineArrowLeft class="shrink-0 text-base text-foreground-muted group-hover:text-foreground" />
            <span class="min-w-0 flex-1">
              <span class="block font-mono text-[10px] uppercase tracking-widest text-foreground-muted">
                Previous
              </span>
              <span class="block truncate text-sm font-medium">
                {prev().title}
              </span>
            </span>
          </a>
        )}
      </Show>
      <Show
        when={props.next}
        fallback={<span class="flex-1" aria-hidden="true" />}
      >
        {(next) => (
          <a
            href={next().href}
            rel="next"
            class="group flex flex-1 items-center justify-end gap-3 rounded border border-background-offset/60 px-4 py-3 text-right hover:bg-background-offset"
          >
            <span class="min-w-0 flex-1">
              <span class="block font-mono text-[10px] uppercase tracking-widest text-foreground-muted">
                Next
              </span>
              <span class="block truncate text-sm font-medium">
                {next().title}
              </span>
            </span>
            <AiOutlineArrowRight class="shrink-0 text-base text-foreground-muted group-hover:text-foreground" />
          </a>
        )}
      </Show>
    </nav>
  );
}
