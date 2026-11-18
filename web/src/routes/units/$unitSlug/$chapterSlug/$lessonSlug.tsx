import { createFileRoute } from "@tanstack/solid-router";
import { Match, Switch, createResource, ErrorBoundary, Show } from "solid-js";
import * as v from "valibot";
import {
  LessonArticlePane,
  LessonNav,
  ReadingLesson,
} from "@learnrobotics/editor";
import {
  JavaCodeRunner,
  JavaCodeRunnerProvider,
} from "@learnrobotics/editor/variants/java-code-runner";
import {
  MarkdownRunner,
  MarkdownRunnerProvider,
} from "@learnrobotics/editor/variants/markdown-runner";
import { QuizLesson } from "@learnrobotics/editor/variants/quiz";
import { EventDispatcher } from "@learnrobotics/events";
import { loadQuizState, saveQuizAttempt } from "~/server/quizzes";
import { TopBar } from "~/components/TopBar/TopBar";
import { findAdjacentLessons } from "@learnrobotics/content";
import { findLesson, getContentIndex } from "~/lib/content";
import { resolveStarter } from "~/lib/starters";
import { createCodeRunnerWorker } from "~/workers/create-code-runner-worker";
import { autoThemeFor, registerThemes } from "~/lib/monaco-themes";
import { useTheme } from "@learnrobotics/db";
import { m } from "~/paraglide/messages";
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
  const markdownUrl = () =>
    localizeHref(
      `/api/content/md/${params().unitSlug}/${params().chapterSlug}/${params().lessonSlug}?for=copy`,
    );

  return (
    <div class="grid h-screen grid-rows-[auto_1fr]">
      <TopBar crumbs={crumbs()} />
      <Switch>
        <Match when={!hit()}>
          <main class="overflow-y-auto">
            <NotFound />
          </main>
        </Match>
        <Match when={hit() && hit()!.lesson.kind === "reading"}>
          <main class="overflow-y-auto pb-24">
            <ReadingLesson
              title={hit()!.lesson.title}
              Body={hit()!.lesson.Body}
              markdownUrl={markdownUrl()}
              prev={neighborLink(neighbors().prev)}
              next={neighborLink(neighbors().next)}
            />
          </main>
        </Match>
        <Match when={hit() && hit()!.lesson.kind === "code"}>
          <main class="min-h-0">
            <ErrorBoundary
              fallback={(err, reset) => {
                console.error("[lesson route] CodeLessonView threw", err);
                return (
                  <div class="p-8 text-sm">
                    <div class="font-mono text-red">
                      Code lesson crashed:{" "}
                      {err instanceof Error ? err.message : String(err)}
                    </div>
                    <pre class="mt-4 whitespace-pre-wrap text-xs text-foreground-muted">
                      {err instanceof Error ? err.stack : ""}
                    </pre>
                    <button
                      type="button"
                      onClick={reset}
                      class="mt-4 rounded border border-background-offset px-3 py-1 text-xs"
                    >
                      retry
                    </button>
                  </div>
                );
              }}
            >
              <CodeLessonView
                lesson={hit()!.lesson}
                markdownUrl={markdownUrl()}
                prev={neighborLink(neighbors().prev)}
                next={neighborLink(neighbors().next)}
              />
            </ErrorBoundary>
          </main>
        </Match>
        <Match when={hit() && hit()!.lesson.kind === "quiz"}>
          <main class="overflow-y-auto pb-24">
            <QuizLessonView
              lesson={hit()!.lesson as Extract<
                NonNullable<ReturnType<typeof findLesson>>["lesson"],
                { kind: "quiz" }
              >}
              markdownUrl={markdownUrl()}
              prev={neighborLink(neighbors().prev)}
              next={neighborLink(neighbors().next)}
            />
          </main>
        </Match>
        <Match when={hit()}>
          <main class="overflow-y-auto">
            <Placeholder kind={hit()!.lesson.kind} title={hit()!.lesson.title} />
          </main>
        </Match>
      </Switch>
    </div>
  );
}

type NeighborLink = { href: string; title: string } | undefined;

function CodeLessonView(props: {
  lesson: NonNullable<ReturnType<typeof findLesson>>["lesson"];
  markdownUrl: string;
  prev: NeighborLink;
  next: NeighborLink;
}) {
  const { effectiveTheme, monacoTheme } = useTheme();
  const monacoThemeName = () =>
    monacoTheme() ?? autoThemeFor(effectiveTheme());
  const dispatcher = new EventDispatcher();

  const lesson = props.lesson;
  const starterId = (lesson as { starter?: string }).starter;
  const resolved = starterId ? resolveStarter(starterId) : null;

  const articleSlot = () => (
    <LessonArticlePane
      Body={lesson.Body}
      markdownUrl={props.markdownUrl}
      footer={<LessonNav prev={props.prev} next={props.next} />}
    />
  );

  const toolbarLeft = () => (
    <span class="truncate text-sm font-semibold tracking-tight">
      {lesson.title}
    </span>
  );

  if (resolved?.language === "markdown") {
    const initial = resolved.files[resolved.activeFile] ?? "";
    return (
      <MarkdownRunnerProvider starter={initial}>
        <MarkdownRunner
          monacoTheme={monacoThemeName}
          registerThemes={registerThemes}
          articleSlot={articleSlot}
          toolbarLeft={toolbarLeft}
          labels={{
            article: "Lesson",
            editor: resolved.activeFile,
            run: m.playground_run(),
            loadingEditor: m.playground_loading_editor(),
          }}
        />
      </MarkdownRunnerProvider>
    );
  }

  const starter = resolved
    ? { files: resolved.files, activeFile: resolved.activeFile }
    : {
        files: { "Main.java": DEFAULT_CODE_LESSON_SOURCE },
        activeFile: "Main.java",
      };

  return (
    <JavaCodeRunnerProvider starter={starter} createWorker={createCodeRunnerWorker}>
      <JavaCodeRunner
        monacoTheme={monacoThemeName}
        registerThemes={registerThemes}
        dispatcher={dispatcher}
        articleSlot={articleSlot}
        toolbarLeft={toolbarLeft}
        labels={{
          article: "Lesson",
          run: m.playground_run(),
          compiling: m.playground_compiling(),
          running: m.playground_running(),
          loadingEditor: m.playground_loading_editor(),
        }}
      />
    </JavaCodeRunnerProvider>
  );
}

type QuizLessonType = Extract<
  NonNullable<ReturnType<typeof findLesson>>["lesson"],
  { kind: "quiz" }
>;

function QuizLessonView(props: {
  lesson: QuizLessonType;
  markdownUrl: string;
  prev: NeighborLink;
  next: NeighborLink;
}) {
  const [state, { refetch }] = createResource(
    () => props.lesson.id,
    (quizId) => loadQuizState({ data: { quizId } }),
  );
  const mastered = () => new Set(state()?.mastered ?? []);

  return (
    <Show
      when={!state.loading}
      fallback={
        <section class="mx-auto max-w-3xl px-6 py-16 text-sm text-foreground-muted">
          Loading quiz…
        </section>
      }
    >
      <QuizLesson
        quizId={props.lesson.id}
        title={props.lesson.title}
        questions={props.lesson.questions}
        mastered={mastered()}
        markdownUrl={props.markdownUrl}
        prev={props.prev}
        next={props.next}
        onSubmit={async (result) => {
          await saveQuizAttempt({
            data: {
              quizId: result.quizId,
              submittedAt: result.submittedAt,
              answers: result.answers,
            },
          });
          void refetch();
        }}
      />
    </Show>
  );
}

const DEFAULT_CODE_LESSON_SOURCE = `class Main {
    public static void main(String[] args) {
        System.out.println("Hello, robot!");
    }
}
`;

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
