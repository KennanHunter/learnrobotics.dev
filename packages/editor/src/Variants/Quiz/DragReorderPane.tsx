import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import type { DragReorderQuestion } from "@learnrobotics/content/types";
import { useQuiz } from "./quiz-store";

export function DragReorderPane(props: { question: DragReorderQuestion }) {
  const quiz = useQuiz();

  // Local ordering state; order[i] is the original index of the item in slot i.
  const [order, setOrder] = createSignal<number[]>(
    quiz.shuffledOrderFor(props.question.id, props.question.items.length),
  );
  const [dragging, setDragging] = createSignal<number | null>(null);

  // Re-shuffle whenever the quiz returns to the in-progress state
  // (first mount + every Retake). `shuffledOrderFor`'s cache was cleared
  // by `reset()`, so this always picks up a fresh permutation.
  createEffect(() => {
    if (quiz.status() === "in-progress") {
      setOrder(
        quiz.shuffledOrderFor(props.question.id, props.question.items.length),
      );
    }
  });

  // Mirror local order into the quiz draft so submission can grade it.
  createEffect(() => {
    quiz.setDraft(props.question.id, {
      kind: "drag-to-reorder",
      order: order(),
    });
  });

  const locked = () => quiz.isLocked(props.question.id);
  const result = createMemo(() =>
    quiz.results().find((r) => r.questionId === props.question.id),
  );
  const showHint = () =>
    quiz.hasAttempted(props.question.id) &&
    !locked() &&
    props.question.hint !== undefined;

  const moveTo = (fromSlot: number, toSlot: number) => {
    if (fromSlot === toSlot) return;
    setOrder((prev) => {
      const next = [...prev];
      const [picked] = next.splice(fromSlot, 1);
      next.splice(toSlot, 0, picked!);
      return next;
    });
  };

  return (
    <div class="flex flex-col gap-3">
      <div class="prose-sm max-w-none text-sm">{props.question.prompt}</div>
      <p class="text-xs text-foreground-muted">
        Drag the items into the correct order.
      </p>
      <ol class="flex flex-col gap-2">
        <For each={order()}>
          {(originalIndex, slot) => {
            const isCorrectSlot = () => originalIndex === slot();
            const graded = () => result() !== undefined;
            const classes = () => {
              const base =
                "flex items-center gap-3 rounded border px-3 py-2 text-sm";
              if (!graded()) {
                return `${base} cursor-grab border-background-offset bg-background hover:bg-background-offset active:cursor-grabbing`;
              }
              return isCorrectSlot()
                ? `${base} border-green bg-green/10`
                : `${base} border-red bg-red/10`;
            };
            return (
              <li
                draggable={!locked()}
                onDragStart={() => setDragging(slot())}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = dragging();
                  if (from !== null) moveTo(from, slot());
                  setDragging(null);
                }}
                onDragEnd={() => setDragging(null)}
                class={classes()}
              >
                <span
                  class="font-mono text-xs text-foreground-muted"
                  aria-hidden="true"
                >
                  {slot() + 1}
                </span>
                <span class="flex-1">
                  {props.question.items[originalIndex]}
                </span>
                <Show when={!locked()}>
                  <span class="text-foreground-muted">⠿</span>
                </Show>
              </li>
            );
          }}
        </For>
      </ol>
      <Show when={result()}>
        {(r) => (
          <p class={r().correct ? "text-xs text-green" : "text-xs text-red"}>
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
