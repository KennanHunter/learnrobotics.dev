import { For, Match, Show, Switch, createMemo, type JSX } from "solid-js";
import type { QuizQuestion } from "@learnrobotics/content/types";
import { LessonNav, type LessonNavLink } from "../../Shared";
import { MarkdownCopy } from "../../Shared/MarkdownCopy";
import { MultipleChoicePane } from "./MultipleChoicePane";
import { DragReorderPane } from "./DragReorderPane";
import { CodeQuestionStub } from "./CodeQuestionStub";
import { ResultsPane } from "./ResultsPane";
import { QuizProvider, useQuiz } from "./quiz-store";
import type { QuizResult } from "./types";

export type QuizLessonProps = {
  quizId: string;
  title: string;
  questions: readonly QuizQuestion[];
  /** Question ids answered correctly in a prior attempt. */
  mastered?: ReadonlySet<string>;
  onSubmit?: (result: QuizResult) => Promise<void> | void;
  markdownUrl?: string;
  prev?: LessonNavLink;
  next?: LessonNavLink;
  /** Optional intro content (JSX, no MDX dep). */
  intro?: JSX.Element;
};

export function QuizLesson(props: QuizLessonProps) {
  return (
    <article class="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
      <header class="flex items-center justify-between gap-4 border-b border-background-offset/60 pb-5">
        <h1 class="text-3xl font-semibold tracking-tight">{props.title}</h1>
        <Show when={props.markdownUrl}>
          <MarkdownCopy markdownUrl={props.markdownUrl!} />
        </Show>
      </header>
      <Show when={props.intro}>
        <div class="prose max-w-none">{props.intro}</div>
      </Show>
      <Show
        when={props.questions.length > 0}
        fallback={
          <p class="rounded border border-dashed border-background-offset p-6 text-sm text-foreground-muted">
            This quiz doesn't have any questions yet. Check back later.
          </p>
        }
      >
        <QuizBody {...props} />
      </Show>
      <LessonNav prev={props.prev} next={props.next} />
    </article>
  );
}

function QuizBody(props: QuizLessonProps) {
  return (
    <QuizProvider
      quizId={props.quizId}
      questions={props.questions}
      mastered={props.mastered}
      onSubmit={props.onSubmit}
    >
      <QuizInner />
    </QuizProvider>
  );
}

function QuizInner() {
  const quiz = useQuiz();
  let topRef: HTMLDivElement | undefined;
  const allMastered = () => quiz.visibleQuestions().length === 0;

  const handleSubmit = async () => {
    await quiz.submit();
    topRef?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Show
      when={!allMastered()}
      fallback={
        <p class="rounded border border-background-offset bg-background-offset/20 p-6 text-sm">
          You've already answered every question in this quiz correctly.
          Reset below to go through them again.
        </p>
      }
    >
      <div ref={topRef} class="flex flex-col gap-6 scroll-mt-20">
        <ProgressHeader onSubmit={handleSubmit} />
        <For each={quiz.visibleQuestions()}>
          {(question, index) => (
            <section class="flex flex-col gap-3 rounded border border-background-offset bg-background p-4">
              <p class="font-mono text-[10px] uppercase tracking-widest text-foreground-muted">
                Question {index() + 1} of {quiz.visibleQuestions().length}
              </p>
              <Switch>
                <Match when={question.kind === "multiple-choice"}>
                  <MultipleChoicePane
                    question={question as Extract<QuizQuestion, { kind: "multiple-choice" }>}
                  />
                </Match>
                <Match when={question.kind === "drag-to-reorder"}>
                  <DragReorderPane
                    question={question as Extract<QuizQuestion, { kind: "drag-to-reorder" }>}
                  />
                </Match>
                <Match when={question.kind === "code-unit-test"}>
                  <CodeQuestionStub
                    question={question as Extract<QuizQuestion, { kind: "code-unit-test" }>}
                  />
                </Match>
              </Switch>
            </section>
          )}
        </For>
        <Show
          when={quiz.status() === "in-progress"}
          fallback={<ResultsPane />}
        >
          <button
            type="button"
            disabled={!quiz.canSubmit()}
            onClick={() => void handleSubmit()}
            class="self-start rounded border border-accent bg-accent px-4 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            Submit
          </button>
        </Show>
      </div>
    </Show>
  );
}

function ProgressHeader(props: { onSubmit: () => Promise<void> | void }) {
  const quiz = useQuiz();
  const total = createMemo(() => quiz.visibleQuestions().length);
  const answered = createMemo(() => {
    const d = quiz.drafts();
    return quiz
      .visibleQuestions()
      .filter((q) => d[q.id] !== undefined).length;
  });
  const correct = createMemo(() =>
    quiz.results().filter((a) => a.correct).length,
  );
  const submitted = () => quiz.status() === "submitted";

  const value = () => (submitted() ? correct() : answered());
  const pct = () => (total() === 0 ? 0 : (value() / total()) * 100);

  const barClasses = () => {
    if (!submitted()) return "bg-accent";
    if (total() === 0) return "bg-emerald-500";
    return correct() === total() ? "bg-emerald-500" : "bg-rose-500";
  };

  const label = () =>
    submitted()
      ? `${correct()} of ${total()} correct`
      : `${answered()} of ${total()} answered`;

  return (
    <section class="flex flex-col gap-2 rounded border border-background-offset bg-background-offset/30 p-3">
      <div class="flex items-center justify-between gap-3">
        <p class="text-xs font-medium tracking-wide">{label()}</p>
        <Show when={!submitted()}>
          <button
            type="button"
            disabled={!quiz.canSubmit()}
            onClick={() => void props.onSubmit()}
            class="rounded border border-accent bg-accent px-3 py-1 text-xs font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            Submit
          </button>
        </Show>
      </div>
      <div class="h-1.5 w-full overflow-hidden rounded-full bg-background-offset">
        <div
          class={`h-full transition-all ${barClasses()}`}
          style={{ width: `${pct()}%` }}
        />
      </div>
    </section>
  );
}
