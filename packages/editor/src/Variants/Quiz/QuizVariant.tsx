import {
  For,
  Match,
  Show,
  Switch,
  createMemo,
  onMount,
  type JSX,
} from "solid-js";
import type { QuizQuestion } from "@learnrobotics/content/types";
import { LessonNav, type LessonNavLink } from "../../Shared";
import { MarkdownCopy } from "../../Shared/MarkdownCopy";
import { MultipleChoicePane } from "./MultipleChoicePane";
import { DragReorderPane } from "./DragReorderPane";
import { CodeQuestionStub } from "./CodeQuestionStub";
import { CodeMarkdownPane } from "./CodeMarkdownPane";
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
  const hasUnlocked = () =>
    quiz.visibleQuestions().some((q) => !quiz.isLocked(q.id));

  const handleSubmit = async () => {
    await quiz.submit();
    topRef?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Show
      when={!allMastered()}
      fallback={
        <p class="rounded border border-background-offset bg-background-offset/20 p-6 text-sm">
          You've already answered every question in this quiz correctly. Reset
          below to go through them again.
        </p>
      }
    >
      <div ref={topRef} class="flex flex-col gap-6 scroll-mt-20">
        <QuizHeader onSubmit={handleSubmit} />
        <For each={quiz.visibleQuestions()}>
          {(question, index) => (
            <section class="flex flex-col gap-3 rounded border border-background-offset bg-background p-4">
              <p class="font-mono text-[10px] uppercase tracking-widest text-foreground-muted">
                Question {index() + 1} of {quiz.visibleQuestions().length}
              </p>
              <Switch>
                <Match when={question.kind === "multiple-choice"}>
                  <MultipleChoicePane
                    question={
                      question as Extract<
                        QuizQuestion,
                        { kind: "multiple-choice" }
                      >
                    }
                  />
                </Match>
                <Match when={question.kind === "drag-to-reorder"}>
                  <DragReorderPane
                    question={
                      question as Extract<
                        QuizQuestion,
                        { kind: "drag-to-reorder" }
                      >
                    }
                  />
                </Match>
                <Match when={question.kind === "code-unit-test"}>
                  <CodeQuestionStub
                    question={
                      question as Extract<
                        QuizQuestion,
                        { kind: "code-unit-test" }
                      >
                    }
                  />
                </Match>
                <Match when={question.kind === "code-markdown"}>
                  <CodeMarkdownPane
                    question={
                      question as Extract<
                        QuizQuestion,
                        { kind: "code-markdown" }
                      >
                    }
                  />
                </Match>
              </Switch>
            </section>
          )}
        </For>
        <Show when={hasUnlocked()}>
          <button
            type="button"
            disabled={!quiz.canSubmit()}
            onClick={() => void handleSubmit()}
            class="self-end rounded border border-blue bg-blue px-4 py-2 text-sm font-medium text-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:cursor-not-allowed disabled:opacity-50"
          >
            {quiz.status() === "submitted" ? "Resubmit" : "Submit"}
          </button>
        </Show>
      </div>
    </Show>
  );
}

function QuizHeader(props: { onSubmit: () => Promise<void> | void }) {
  const quiz = useQuiz();
  const submitted = () => quiz.status() === "submitted";
  return (
    <Show
      when={submitted()}
      fallback={<ProgressHeader onSubmit={props.onSubmit} />}
    >
      <SubmissionSummary />
    </Show>
  );
}

function ProgressHeader(props: { onSubmit: () => Promise<void> | void }) {
  const quiz = useQuiz();
  const total = createMemo(() => quiz.visibleQuestions().length);
  const answered = createMemo(() => {
    const d = quiz.drafts();
    return quiz.visibleQuestions().filter((q) => d[q.id] !== undefined).length;
  });
  const pct = () => (total() === 0 ? 0 : (answered() / total()) * 100);

  return (
    <section class="flex flex-col gap-2 rounded border border-background-offset bg-background-offset/30 p-3">
      <div class="flex items-center justify-between gap-3">
        <p class="text-xs font-medium tracking-wide">
          {answered()} of {total()} answered
        </p>
        <button
          type="button"
          disabled={!quiz.canSubmit()}
          onClick={() => void props.onSubmit()}
          class="rounded border border-blue bg-blue px-3 py-1 text-xs font-medium text-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit
        </button>
      </div>
      <div class="h-1.5 w-full overflow-hidden rounded-full bg-background-offset">
        <div
          class="h-full bg-blue transition-all"
          style={{ width: `${pct()}%` }}
        />
      </div>
    </section>
  );
}

function SubmissionSummary() {
  const quiz = useQuiz();
  const correct = createMemo(
    () => quiz.results().filter((a) => a.correct).length,
  );
  const total = createMemo(() => quiz.results().length);
  const incorrect = () => total() - correct();
  const perfect = () => total() > 0 && correct() === total();

  // Pull focus to the summary when it mounts so screen reader users land
  // on the results instead of staying on the (now-hidden) submit button.
  let sectionRef: HTMLElement | undefined;
  onMount(() => sectionRef?.focus());

  return (
    <section
      ref={sectionRef}
      tabindex={-1}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class={`flex flex-col gap-3 rounded border p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${
        perfect()
          ? "border-green bg-green/10"
          : "border-background-offset bg-background-offset/30"
      }`}
    >
      <div class="flex items-baseline justify-between gap-3">
        <h3 class="text-sm font-semibold tracking-wide">
          {perfect() ? "All correct." : "Results"}
        </h3>
        <button
          type="button"
          onClick={() => quiz.reset()}
          class="rounded border border-background-offset px-3 py-1 text-xs font-medium hover:bg-background-offset focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
        >
          Retake
        </button>
      </div>
      <p class="flex items-baseline gap-4 font-mono text-sm">
        <span class="text-green">
          <span class="text-lg font-semibold">{correct()}</span> correct
        </span>
        <span aria-hidden="true" class="text-foreground-subtle">
          ·
        </span>
        <span class={incorrect() === 0 ? "text-foreground-subtle" : "text-red"}>
          <span class="text-lg font-semibold">{incorrect()}</span> incorrect
        </span>
        <span class="text-foreground-subtle">of {total()}</span>
      </p>
    </section>
  );
}
