import { For, Show, createMemo } from "solid-js";
import type { MultipleChoiceQuestion } from "@learnrobotics/content/types";
import { useQuiz } from "./quiz-store";

type MarkerState =
  | "default"
  | "selected"
  | "correct"
  | "wrong"
  | "muted";

export function MultipleChoicePane(props: { question: MultipleChoiceQuestion }) {
  const quiz = useQuiz();
  const draft = createMemo(() => {
    const d = quiz.drafts()[props.question.id];
    return d?.kind === "multiple-choice" ? d : undefined;
  });
  const result = createMemo(() =>
    quiz.results().find((r) => r.questionId === props.question.id),
  );
  const submitted = () => quiz.status() === "submitted";

  const stateFor = (index: number): MarkerState => {
    const isSelected = draft()?.selected === index;
    if (!submitted()) return isSelected ? "selected" : "default";
    if (index === props.question.answer) return "correct";
    if (isSelected) return "wrong";
    return "muted";
  };

  const rowClassesFor = (index: number) => {
    const base =
      "flex w-full items-center gap-3 rounded border px-3 py-2 text-left transition-colors";
    const state = stateFor(index);
    switch (state) {
      case "selected":
        return `${base} border-accent bg-accent/20`;
      case "correct":
        return `${base} border-emerald-500 bg-emerald-500/15`;
      case "wrong":
        return `${base} border-rose-500 bg-rose-500/15`;
      case "muted":
        return `${base} border-background-offset opacity-60`;
      case "default":
      default:
        return `${base} border-background-offset hover:bg-background-offset`;
    }
  };

  return (
    <div class="flex flex-col gap-3">
      <div class="prose-sm max-w-none text-sm">{props.question.prompt}</div>
      <ol class="flex flex-col gap-2">
        <For each={props.question.choices}>
          {(choice, index) => (
            <li>
              <button
                type="button"
                disabled={submitted()}
                onClick={() =>
                  quiz.setDraft(props.question.id, {
                    kind: "multiple-choice",
                    selected: index(),
                  })
                }
                class={rowClassesFor(index())}
              >
                <ChoiceMarker
                  letter={String.fromCharCode(65 + index())}
                  state={stateFor(index())}
                />
                <span class="flex-1 text-sm">{choice}</span>
              </button>
            </li>
          )}
        </For>
      </ol>
      <Show when={submitted() && result()}>
        {(r) => (
          <p
            class={
              r().correct
                ? "text-xs text-emerald-600"
                : "text-xs text-rose-600"
            }
          >
            {r().correct ? "Correct." : "Incorrect."}
          </p>
        )}
      </Show>
    </div>
  );
}

function ChoiceMarker(props: { letter: string; state: MarkerState }) {
  const circleClasses = () => {
    switch (props.state) {
      case "selected":
        return "fill-transparent stroke-accent";
      case "correct":
        return "fill-emerald-500 stroke-emerald-500";
      case "wrong":
        return "fill-rose-500 stroke-rose-500";
      case "muted":
        return "fill-transparent stroke-foreground-muted/50";
      case "default":
      default:
        return "fill-transparent stroke-foreground-muted";
    }
  };
  const textClasses = () => {
    switch (props.state) {
      case "selected":
        return "fill-accent";
      case "correct":
      case "wrong":
        return "fill-background";
      case "muted":
        return "fill-foreground-muted/60";
      case "default":
      default:
        return "fill-foreground-muted";
    }
  };
  const strokeWidth = () => (props.state === "selected" ? "2" : "1.5");
  return (
    <svg
      viewBox="0 0 24 24"
      class="h-6 w-6 shrink-0 transition-colors"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke-width={strokeWidth()}
        class={`transition-colors ${circleClasses()}`}
      />
      <text
        x="12"
        y="12"
        text-anchor="middle"
        dominant-baseline="central"
        font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
        font-size="10"
        font-weight="600"
        class={`transition-colors ${textClasses()}`}
      >
        {props.letter}
      </text>
    </svg>
  );
}
