import { type Component } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { EventDispatcher } from "@learnrobotics/events";
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

export function ReadingLesson(props: ReadingLessonProps) {
  return (
    <article class="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
      <header class="flex items-center justify-between gap-4 border-b border-background-offset/60 pb-5 mb-5">
        <h1 class="text-3xl font-semibold tracking-tight">{props.title}</h1>
        <MarkdownCopy markdownUrl={props.markdownUrl} />
      </header>
      <div class="prose max-w-none flex flex-col gap-4">
        <Dynamic component={props.Body} />
      </div>
      <LessonNav prev={props.prev} next={props.next} />
      <HighlightOverlay dispatcher={props.dispatcher} />
    </article>
  );
}
