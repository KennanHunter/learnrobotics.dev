import { For, Show, createMemo, createUniqueId } from "solid-js";
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
  const promptId = createUniqueId();
  const feedbackId = createUniqueId();
  const buttonRefs: HTMLButtonElement[] = [];

  const draft = createMemo(() => {
    const d = quiz.drafts()[props.question.id];
    return d?.kind === "multiple-choice" ? d : undefined;
  });
  const result = createMemo(() =>
    quiz.results().find((r) => r.questionId === props.question.id),
  );
  const locked = () => quiz.isLocked(props.question.id);
  const showHint = () =>
    quiz.hasAttempted(props.question.id) &&
    !locked() &&
    props.question.hint !== undefined;

  const stateFor = (index: number): MarkerState => {
    const isSelected = draft()?.selected === index;
    const r = result();
    if (!r) return isSelected ? "selected" : "default";
    // Graded correct: show the chosen (= correct) option green, others muted.
    if (r.correct) {
      return index === props.question.answer ? "correct" : "muted";
    }
    // Graded incorrect: mark the user's selection wrong; do NOT reveal answer.
    if (isSelected) return "wrong";
    return "default";
  };

  const rowClassesFor = (index: number) => {
    const base =
      "flex w-full items-center gap-3 rounded border px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue";
    const state = stateFor(index);
    switch (state) {
      case "selected":
        return `${base} border-blue bg-blue/10`;
      case "correct":
        return `${base} border-green bg-green/10`;
      case "wrong":
        return `${base} border-red bg-red/10`;
      case "muted":
        return `${base} border-background-offset opacity-60`;
      case "default":
      default:
        return `${base} border-background-offset hover:bg-background-offset`;
    }
  };

  const select = (index: number) => {
    quiz.setDraft(props.question.id, {
      kind: "multiple-choice",
      selected: index,
    });
  };

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    if (locked()) return;
    const count = props.question.choices.length;
    let next: number | null = null;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
        next = (index + 1) % count;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        next = (index - 1 + count) % count;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
    }
    if (next !== null) {
      e.preventDefault();
      select(next);
      buttonRefs[next]?.focus();
    }
  };

  // ARIA radiogroup roving tabindex: focused radio is tabbable, others not.
  const tabIndexFor = (index: number) => {
    const sel = draft()?.selected;
    if (sel === undefined) return index === 0 ? 0 : -1;
    return sel === index ? 0 : -1;
  };

  return (
    <div class="flex flex-col gap-3">
      <div id={promptId} class="prose-sm max-w-none text-sm">
        {props.question.prompt}
      </div>
      <ol
        role="radiogroup"
        aria-labelledby={promptId}
        aria-describedby={result() ? feedbackId : undefined}
        class="flex flex-col gap-2"
      >
        <For each={props.question.choices}>
          {(choice, index) => (
            <li>
              <button
                ref={(el) => (buttonRefs[index()] = el)}
                type="button"
                role="radio"
                aria-checked={draft()?.selected === index()}
                disabled={locked()}
                tabindex={tabIndexFor(index())}
                onClick={() => select(index())}
                onKeyDown={(e) => handleKeyDown(e, index())}
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
      <Show when={result()}>
        {(r) => (
          <p
            id={feedbackId}
            class={r().correct ? "text-xs text-green" : "text-xs text-red"}
          >
            {r().correct ? "Correct." : "Incorrect."}
          </p>
        )}
      </Show>
      <Show when={showHint()}>
        <aside
          class="rounded border border-background-offset bg-background-offset/30 px-3 py-2 text-xs text-foreground-muted"
          role="note"
        >
          <span class="mr-1 font-mono text-[10px] uppercase tracking-widest text-foreground-subtle">
            Hint
          </span>
          {props.question.hint}
        </aside>
      </Show>
    </div>
  );
}

function ChoiceMarker(props: { letter: string; state: MarkerState }) {
  const circleClasses = () => {
    switch (props.state) {
      case "selected":
        return "fill-blue/10 stroke-blue";
      case "correct":
        return "fill-green/10 stroke-green";
      case "wrong":
        return "fill-red/10 stroke-red";
      case "muted":
        return "fill-transparent stroke-foreground-subtle";
      case "default":
      default:
        return "fill-transparent stroke-foreground-muted";
    }
  };
  const textClasses = () => {
    switch (props.state) {
      case "selected":
        return "fill-blue";
      case "correct":
        return "fill-green";
      case "wrong":
        return "fill-red";
      case "muted":
        return "fill-foreground-subtle";
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
