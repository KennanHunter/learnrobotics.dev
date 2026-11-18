import { Show, type Component, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { EventDispatcher } from "@learnrobotics/events";
import { HighlightOverlay } from "./HighlightOverlay";
import { MarkdownCopy } from "../Shared/MarkdownCopy";

export type LessonArticlePaneProps = {
  Body: Component;
  title?: string;
  markdownUrl?: string;
  dispatcher?: EventDispatcher;
  /** Sticky footer inside the scroll container (typical: LessonNav). */
  footer?: JSX.Element;
};

export function LessonArticlePane(props: LessonArticlePaneProps) {
  return (
    <div class="relative flex h-full flex-col overflow-auto">
      <Show when={props.title || props.markdownUrl}>
        <header class="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-background-offset/60 bg-background px-5 py-3">
          <Show when={props.title}>
            <h2 class="truncate text-sm font-semibold tracking-tight">
              {props.title}
            </h2>
          </Show>
          <Show when={props.markdownUrl}>
            <MarkdownCopy markdownUrl={props.markdownUrl!} />
          </Show>
        </header>
      </Show>
      <article class="prose max-w-none px-5 py-4">
        <Dynamic component={props.Body} />
      </article>
      <Show when={props.footer}>
        <div class="mt-auto px-5 pb-4">{props.footer}</div>
      </Show>
      <HighlightOverlay dispatcher={props.dispatcher} />
    </div>
  );
}
