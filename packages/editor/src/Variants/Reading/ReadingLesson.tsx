import { onCleanup, onMount, type Component } from "solid-js";
import { Dynamic, isServer } from "solid-js/web";
import type { EventDispatcher } from "@learnrobotics/events";
import {
  CitationsProvider,
  CitationList,
} from "@learnrobotics/content/components/Citation";
import { HighlightOverlay } from "../../Panels";
import { LessonNav, MarkdownCopy, type LessonNavLink } from "../../Shared";

export type ReadingLessonProps = {
  title: string;
  Body: Component;
  /** URL that serves the prompt-bundle markdown projection for Copy. */
  markdownUrl: string;
  /** Previous lesson link; omit when at the start of the course. */
  prev?: LessonNavLink;
  /** Next lesson link; omit when at the end of the course. */
  next?: LessonNavLink;
  /** Optional replay dispatcher; omitted = no replay. */
  dispatcher?: EventDispatcher;
};

// Elements where arrow keys mean "move the cursor," not "navigate away."
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function ReadingLesson(props: ReadingLessonProps) {
  if (!isServer) {
    onMount(() => {
      console.log("[ReadingLesson] arrow-nav: attaching listener", {
        hasPrev: !!props.prev,
        hasNext: !!props.next,
        prevHref: props.prev?.href,
        nextHref: props.next?.href,
      });
      const onKey = (e: KeyboardEvent) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        const reason = (() => {
          if (e.defaultPrevented) return "defaultPrevented";
          if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return "modifier";
          if (isEditableTarget(e.target)) return "editable-target";
          if (e.key === "ArrowLeft" && !props.prev) return "no-prev";
          if (e.key === "ArrowRight" && !props.next) return "no-next";
          return null;
        })();
        console.log("[ReadingLesson] arrow-nav: keydown", {
          key: e.key,
          target: (e.target as HTMLElement | null)?.tagName,
          skipped: reason,
        });
        if (reason) return;
        if (e.key === "ArrowLeft" && props.prev) {
          console.log("[ReadingLesson] arrow-nav: navigating prev", {
            href: props.prev.href,
          });
          e.preventDefault();
          window.location.href = props.prev.href;
        } else if (e.key === "ArrowRight" && props.next) {
          console.log("[ReadingLesson] arrow-nav: navigating next", {
            href: props.next.href,
          });
          e.preventDefault();
          window.location.href = props.next.href;
        }
      };
      window.addEventListener("keydown", onKey);
      onCleanup(() => {
        console.log("[ReadingLesson] arrow-nav: removing listener");
        window.removeEventListener("keydown", onKey);
      });
    });
  }

  return (
    <article class="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
      <header class="flex items-center justify-between gap-4 border-b border-background-offset/60 pb-5 mb-5">
        <h1 class="text-3xl font-semibold tracking-tight">{props.title}</h1>
        <MarkdownCopy markdownUrl={props.markdownUrl} />
      </header>
      <CitationsProvider>
        <div class="prose max-w-none">
          <Dynamic component={props.Body} />
        </div>
        <CitationList />
      </CitationsProvider>
      <LessonNav prev={props.prev} next={props.next} />
      <p class="-mt-2 text-center text-[11px] text-foreground-muted">
        Use <kbd class="font-mono">←</kbd> and <kbd class="font-mono">→</kbd> to
        move between lessons.
      </p>
      <HighlightOverlay dispatcher={props.dispatcher} />
    </article>
  );
}
