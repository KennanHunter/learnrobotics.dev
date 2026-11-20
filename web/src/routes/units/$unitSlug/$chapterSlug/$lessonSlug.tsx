import { createFileRoute } from "@tanstack/solid-router";
import { Match, Switch, createResource, ErrorBoundary, Show } from "solid-js";
import * as v from "valibot";
import { createSignal, onMount } from "solid-js";
import type { ProjectRecord } from "@learnrobotics/db";
import {
  LessonArticlePane,
  LessonNav,
  ReadingLesson,
  SnippetsPane,
} from "@learnrobotics/editor";
import { TabGroup } from "@learnrobotics/editor/panels";
import {
  CodeRunner,
  CodeRunnerProvider,
} from "@learnrobotics/editor/variants/code-runner";
import { QuizLesson } from "@learnrobotics/editor/variants/quiz";
import { EventDispatcher } from "@learnrobotics/events";
import { loadQuizState, saveQuizAttempt } from "~/server/quizzes";
import { ensureUserLessonProject } from "~/server/projects";
import { ProjectPersist } from "~/components/StarterPicker";
import { AutosaveIndicator } from "~/components/AutosaveIndicator";
import { TopBar } from "~/components/TopBar/TopBar";
import { findAdjacentLessons } from "@learnrobotics/content";
import { findLesson, getContentIndex } from "~/lib/content";
import { resolveStarter } from "~/lib/starters";
import { createCodeRunnerWorker } from "~/workers/create-code-runner-worker";
import { autoThemeFor, registerThemes } from "~/lib/monaco-themes";
import { useTabSize, useTheme } from "@learnrobotics/db";
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
    return {
      index: index(),
      unit: h.unit,
      chapter: h.chapter,
      lesson: h.lesson,
    };
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
                lessonSlug={`${params().unitSlug}/${params().chapterSlug}/${params().lessonSlug}`}
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
              lesson={
                hit()!.lesson as Extract<
                  NonNullable<ReturnType<typeof findLesson>>["lesson"],
                  { kind: "quiz" }
                >
              }
              markdownUrl={markdownUrl()}
              prev={neighborLink(neighbors().prev)}
              next={neighborLink(neighbors().next)}
            />
          </main>
        </Match>
        <Match when={hit()}>
          <main class="overflow-y-auto">
            <Placeholder
              kind={hit()!.lesson.kind}
              title={hit()!.lesson.title}
            />
          </main>
        </Match>
      </Switch>
    </div>
  );
}

type NeighborLink = { href: string; title: string } | undefined;

function CodeLessonView(props: {
  lesson: NonNullable<ReturnType<typeof findLesson>>["lesson"];
  lessonSlug: string;
  markdownUrl: string;
  prev: NeighborLink;
  next: NeighborLink;
}) {
  const { effectiveTheme, monacoTheme } = useTheme();
  const monacoThemeName = () => monacoTheme() ?? autoThemeFor(effectiveTheme());
  const tabSize = useTabSize();
  const dispatcher = new EventDispatcher();

  const lesson = props.lesson;
  const starterId = (lesson as { starter?: string }).starter;
  const resolved = starterId ? resolveStarter(starterId) : null;

  const snippets =
    (
      lesson as {
        snippets?: readonly {
          title: string;
          language?: "java" | "markdown";
          body: readonly string[];
        }[];
      }
    ).snippets ?? [];

  const articlePane = () => (
    <LessonArticlePane
      Body={lesson.Body}
      markdownUrl={props.markdownUrl}
      footer={<LessonNav prev={props.prev} next={props.next} />}
    />
  );

  const [activeTab, setActiveTab] = createSignal("lesson");

  const articleSlot = () => {
    if (snippets.length === 0) return articlePane();
    const items = snippets.map((s, i) => ({
      id: `${i}`,
      title: s.title,
      language: s.language ?? "java",
      body: s.body,
    }));
    return (
      <TabGroup
        active={activeTab()}
        onChange={setActiveTab}
        tabs={[
          { id: "lesson", label: "Lesson", content: articlePane() },
          {
            id: "snippets",
            label: "Snippets",
            badge: items.length,
            content: <SnippetsPane snippets={items} tabSize={tabSize} />,
          },
        ]}
      />
    );
  };

  const toolbarLeft = () => (
    <span class="truncate text-sm font-semibold tracking-tight">
      {lesson.title}
    </span>
  );

  // Markdown-only lessons used to live on a separate MarkdownRunner, but
  // CodeRunner now renders the markdown preview automatically whenever the
  // active file ends in `.md`. One variant means one persistence path
  // (ProjectPersist + the project table) and markdown lessons autosave for
  // free.
  const starterSeed = resolved
    ? { files: resolved.files, activeFile: resolved.activeFile }
    : {
        files: { "Main.java": DEFAULT_CODE_LESSON_SOURCE },
        activeFile: "Main.java",
      };

  // Client-only: resolve the user's saved project for this lesson (or create
  // one), then mount the provider with the right seed. Mirrors the
  // playground's gate so SSR/hydration agree on the fallback.
  const [project, setProject] = createSignal<ProjectRecord | null>(null);
  const [loading, setLoading] = createSignal(true);
  onMount(async () => {
    try {
      const row = await ensureUserLessonProject({
        data: {
          lessonSlug: props.lessonSlug,
          seed: {
            title: lesson.title,
            starterId: starterId ?? null,
            activeFile: starterSeed.activeFile,
            files: starterSeed.files,
          },
        },
      });
      setProject(row);
    } catch {
      /* fall back to starter without persistence */
    } finally {
      setLoading(false);
    }
  });

  const [savedAt, setSavedAt] = createSignal<number | null>(null);
  const [dirtyAt, setDirtyAt] = createSignal<number | null>(null);

  return (
    <Show
      when={!loading()}
      fallback={
        <div class="flex h-full w-full items-center justify-center text-xs text-foreground-muted">
          Loading lesson…
        </div>
      }
    >
      <CodeRunnerProvider
        starter={
          project()
            ? { files: project()!.files, activeFile: project()!.activeFile }
            : starterSeed
        }
        createWorker={createCodeRunnerWorker}
      >
        <Show when={project()}>
          {(row) => (
            <ProjectPersist
              starterId={starterId ?? "lesson"}
              starterTitle={lesson.title}
              projectId={row().id}
              lessonSlug={props.lessonSlug}
              onSaved={setSavedAt}
              onDirty={setDirtyAt}
            />
          )}
        </Show>
        <CodeRunner
          monacoTheme={monacoThemeName}
          tabSize={tabSize}
          registerThemes={registerThemes}
          dispatcher={dispatcher}
          articleSlot={articleSlot}
          articleBare={snippets.length > 0}
          toolbarLeft={toolbarLeft}
          editorActions={
            project()
              ? () => (
                  <AutosaveIndicator savedAt={savedAt()} dirtyAt={dirtyAt()} />
                )
              : undefined
          }
          labels={{
            article: "Lesson",
            run: m.playground_run(),
            compiling: m.playground_compiling(),
            running: m.playground_running(),
            loadingEditor: m.playground_loading_editor(),
          }}
        />
      </CodeRunnerProvider>
    </Show>
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
      <h1 class="mt-2 text-2xl font-semibold tracking-tight">No such lesson</h1>
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
