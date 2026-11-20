import { createFileRoute } from "@tanstack/solid-router";
import { For } from "solid-js";
import { NoHydration } from "solid-js/web";
import * as v from "valibot";
import { CourseRow } from "~/components/CourseRow/CourseRow";
import { FIRST } from "~/components/FIRST/FIRST";
import { Footer } from "~/components/Footer/Footer";
import { Note } from "@learnrobotics/content/components/Note";
import { StatusIcon, statusLabel } from "~/components/StatusIcon/StatusIcon";
import { TopBar } from "~/components/TopBar/TopBar";
import type { LessonStatus } from "~/lib/content";
import { getContentIndex } from "~/lib/content";
import { getLocale, localizeHref } from "~/paraglide/runtime";

const legendOrder: LessonStatus[] = [
  "todo",
  "in-progress",
  "done",
  "placement-passed",
];

const SearchSchema = v.object({});

export const Route = createFileRoute("/")({
  validateSearch: (search) => v.parse(SearchSchema, search),
  component: Landing,
});

function Landing() {
  const index = () => getContentIndex(getLocale());
  const resumeAnchor = () => {
    for (const unit of index().units) {
      for (const chapter of unit.chapters) {
        for (const lesson of chapter.lessons) {
          if (lesson.status !== "done") {
            return localizeHref(
              `/units/${unit.slug}/${chapter.slug}/${lesson.slug}`,
            );
          }
        }
      }
    }
    const first = index().units[0]?.chapters[0]?.lessons[0];
    const firstUnit = index().units[0];
    const firstChapter = firstUnit?.chapters[0];
    return first && firstUnit && firstChapter
      ? localizeHref(
          `/units/${firstUnit.slug}/${firstChapter.slug}/${first.slug}`,
        )
      : "#";
  };

  return (
    <>
      <TopBar />
      <main>
        <div class="mx-auto max-w-6xl px-8 pt-4">
          <div class="mb-6 space-y-3">
            <Note>
              This content is very much in pre-alpha. Things may change, lesson
              progress may be lost. If you work on code you really care about,
              make sure you export occasionally.
            </Note>
            <NoHydration>
              <noscript>
                <div
                  role="note"
                  class="rounded-md border-l-4 border-l-primary bg-background-offset px-4 py-3 text-sm"
                >
                  This site barely functions without JavaScript. For now, all
                  static lesson content is still available. Read{" "}
                  <a
                    href="https://www.enable-javascript.com"
                    class="underline underline-offset-4 hover:text-primary"
                  >
                    how to enable JavaScript
                  </a>{" "}
                  if you'd like the interactive parts to work.
                </div>
              </noscript>
            </NoHydration>
            <Note class="md:hidden">
              This site does not work well on mobile. If you have a specific
              mobile use case, let me know and we'll see what we can do:{" "}
              <a
                href="mailto:contact@kennan.dev"
                class="underline underline-offset-4 hover:text-primary"
              >
                contact@kennan.dev
              </a>
              .
            </Note>
          </div>
          <section class="flex flex-col gap-6 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="max-w-2xl flex-1 space-y-3">
              <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
                An opinionated guide to becoming a <FIRST /> programmer
              </h1>
              <p class="text-sm text-foreground-muted">
                Not affiliated with <FIRST />. Written by alumni, for students,
                mentors, and anyone else curious.
              </p>
              <p class="text-sm text-foreground-muted">
                Built for the 2027 SystemCore changes, covering both FTC and
                FRC.
              </p>
              <p class="text-sm text-foreground-muted">
                All lessons are hand written. For our policy on AI use, read{" "}
                <a
                  href="/ai-transparency"
                  class="underline underline-offset-4 hover:text-primary"
                >
                  AI Transparency
                </a>
                .
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <a
                href="/placement"
                class="rounded-md border border-background-offset px-4 py-2 text-sm font-medium transition-colors hover:bg-background-offset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                Take Placement
              </a>
              <a
                href={resumeAnchor()}
                class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-background shadow-sm transition-all hover:bg-primary/90 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                Start Learning
              </a>
            </div>
          </section>

          <ul class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 pb-2 text-xs text-foreground-muted">
            <For each={legendOrder}>
              {(status) => (
                <li class="flex items-center gap-1.5">
                  <StatusIcon status={status} />
                  <span>{statusLabel[status]}</span>
                </li>
              )}
            </For>
          </ul>

          <For each={index().units}>
            {(course) => <CourseRow course={course} />}
          </For>
        </div>
        <Footer />
      </main>
    </>
  );
}
