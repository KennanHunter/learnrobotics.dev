import {
  createSignal,
  onCleanup,
  onMount,
  Show,
  type Component,
} from "solid-js";
import { Dynamic, isServer } from "solid-js/web";
import type { EventDispatcher, ReplayEvent } from "@learnrobotics/events";
import {
  CitationsProvider,
  CitationList,
} from "@learnrobotics/content/components/Citation";
import { useCompletion } from "@learnrobotics/content/completion";
import { HighlightOverlay, ReplayControls } from "../../Panels";
import {
  createReadingReplayHost,
  type ReadingReplayHost,
} from "../../replay";
import { LessonNav, MarkdownCopy, type LessonNavLink } from "../../Shared";

export type ReadingRecording = {
  events: readonly ReplayEvent[];
  audioUrl: string;
};

export type ReadingLessonProps = {
  title: string;
  Body: Component;
  /** URL that serves the prompt-bundle markdown projection for Copy. Omit
   * to hide the Copy Markdown button (e.g. per-user setting). */
  markdownUrl?: string;
  /** Previous lesson link; omit when at the start of the course. */
  prev?: LessonNavLink;
  /** Next lesson link; omit when at the end of the course. */
  next?: LessonNavLink;
  /** Optional replay dispatcher; omitted = no replay. */
  dispatcher?: EventDispatcher;
  /** When present, the lesson mounts a hidden audio element + ReplayControls
   * and routes highlight / highlight-clear events through its overlay. The
   * `dispatcher` prop is ignored when a recording is active. */
  recording?: ReadingRecording;
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
          if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey)
            return "modifier";
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

  // When a recording is present, build the replay host once the hidden
  // <audio> element mounts. The host owns an `overlayDispatcher` that the
  // HighlightOverlay subscribes to; it overrides `props.dispatcher`.
  const [host, setHost] = createSignal<ReadingReplayHost | null>(null);
  let audioEl: HTMLAudioElement | undefined;

  onMount(() => {
    if (!props.recording || !audioEl) return;
    setHost(createReadingReplayHost({ events: props.recording.events, audio: audioEl }));
  });

  const overlayDispatcher = () =>
    host()?.overlayDispatcher ?? props.dispatcher;

  return (
    <article class="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
      <header class="flex items-center justify-between gap-4 border-b border-background-offset/60 pb-5 mb-5">
        <h1 class="text-3xl font-semibold tracking-tight">{props.title}</h1>
        <Show when={props.markdownUrl}>
          <MarkdownCopy markdownUrl={props.markdownUrl!} />
        </Show>
      </header>
      <Show when={props.recording}>
        {(rec) => (
          <>
            <div class="sticky top-0 z-30 -mx-6 flex items-center gap-3 border-b border-background-offset bg-background px-6 py-2">
              <ReplayControls controller={host() ?? undefined} />
            </div>
            <audio
              ref={(el) => (audioEl = el)}
              src={rec().audioUrl}
              preload="auto"
              class="hidden"
            />
          </>
        )}
      </Show>
      <CitationsProvider>
        <div class="prose max-w-none">
          <Dynamic component={props.Body} />
        </div>
        <CitationList />
      </CitationsProvider>
      <ImplicitCompletionSentinel />
      <LessonNav prev={props.prev} next={props.next} />
      <p class="-mt-2 text-center text-[11px] text-foreground-muted">
        Use <kbd class="font-mono">←</kbd> and <kbd class="font-mono">→</kbd> to
        move between lessons.
      </p>
      <HighlightOverlay dispatcher={overlayDispatcher()} />
    </article>
  );
}

/**
 * Fires `markFinished` once this div scrolls into view. Mounted
 * unconditionally at the end of every reading lesson so authors don't need
 * to drop an explicit `<MarkCompletion>`. Firing is idempotent at the
 * route layer (sessionStorage guard in `fireMarkFinished`), so an explicit
 * component earlier in the body still works — this one just fires later
 * and the duplicate call is a no-op.
 */
function ImplicitCompletionSentinel() {
  const completion = useCompletion();
  let ref: HTMLDivElement | undefined;
  onMount(() => {
    if (!ref || !completion) return;
    const el = ref;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            completion.markFinished();
            observer.disconnect();
            return;
          }
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    onCleanup(() => observer.disconnect());
  });
  return <div ref={ref} aria-hidden="true" />;
}
