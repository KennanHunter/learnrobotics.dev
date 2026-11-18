import { createFileRoute } from "@tanstack/solid-router";
import { Match, Switch } from "solid-js";
import * as v from "valibot";
import { ReadingLesson } from "@learnrobotics/editor";
import { TopBar } from "~/components/TopBar/TopBar";
import { findAdjacentLessons } from "@learnrobotics/content";
import { findLesson, getContentIndex } from "~/lib/content";
import { getLocale, localizeHref } from "~/paraglide/runtime";

const SearchSchema = v.object({});

export const Route = createFileRoute(
  "/units/$unitSlug/$chapterSlug/$lessonSlug",
)({
  validateSearch: (search) => v.parse(SearchSchema, search),
  component: LessonPage,
});

function LessonPage() {
  const params = Route.useParams();
  const index = () => getContentIndex(getLocale());
  const hit = () =>
    findLesson(
      index(),
      params().unitSlug,
      params().chapterSlug,
      params().lessonSlug,
    );
  const crumbs = () => {
    const h = hit();
    if (!h) return undefined;
    return { index: index(), unit: h.unit, chapter: h.chapter, lesson: h.lesson };
  };
  const neighbors = () =>
    findAdjacentLessons(
      index(),
      params().unitSlug,
      params().chapterSlug,
      params().lessonSlug,
    );
  const neighborLink = (n?: {
    unitSlug: string;
    chapterSlug: string;
    lessonSlug: string;
    title: string;
  }) =>
    n
      ? {
          href: localizeHref(
            `/units/${n.unitSlug}/${n.chapterSlug}/${n.lessonSlug}`,
          ),
          title: n.title,
        }
      : undefined;

  return (
    <>
      <TopBar crumbs={crumbs()} />
      <main class="pt-16 pb-24">
        <Switch>
          <Match when={!hit()}>
            <NotFound />
          </Match>
          <Match when={hit() && hit()!.lesson.kind === "reading"}>
            <ReadingLesson
              title={hit()!.lesson.title}
              Body={hit()!.lesson.Body}
              markdownUrl={localizeHref(
                `/api/content/md/${params().unitSlug}/${params().chapterSlug}/${params().lessonSlug}?for=copy`,
              )}
              prev={neighborLink(neighbors().prev)}
              next={neighborLink(neighbors().next)}
            />
          </Match>
          <Match when={hit()}>
            <Placeholder kind={hit()!.lesson.kind} title={hit()!.lesson.title} />
          </Match>
        </Switch>
      </main>
    </>
  );
}

function NotFound() {
  return (
    <section class="mx-auto max-w-3xl px-6 py-16 text-center">
      <p class="font-mono text-xs uppercase tracking-widest text-foreground-muted">
        Not found
      </p>
      <h1 class="mt-2 text-2xl font-semibold tracking-tight">
        No such lesson
      </h1>
      <p class="mt-2 text-sm text-foreground-muted">
        That unit, chapter, or lesson isn't in the content tree.
      </p>
      <a
        href={localizeHref("/")}
        class="mt-6 inline-block rounded border border-background-offset px-4 py-2 text-sm hover:bg-background-offset"
      >
        Back to home
      </a>
    </section>
  );
}

function Placeholder(props: { kind: string; title: string }) {
  return (
    <section class="mx-auto max-w-3xl px-6 py-16">
      <h1 class="text-2xl font-semibold tracking-tight">{props.title}</h1>
      <p class="mt-4 text-sm text-foreground-muted">
        {props.kind} lessons aren't rendered yet.
      </p>
      <a
        href={localizeHref("/")}
        class="mt-6 inline-block rounded border border-background-offset px-4 py-2 text-sm hover:bg-background-offset"
      >
        Back to home
      </a>
    </section>
  );
}
