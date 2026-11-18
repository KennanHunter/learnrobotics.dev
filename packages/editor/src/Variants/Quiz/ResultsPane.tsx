import { createMemo } from "solid-js";
import { useQuiz } from "./quiz-store";

export function ResultsPane() {
  const quiz = useQuiz();
  const score = createMemo(() => {
    const r = quiz.results();
    const right = r.filter((a) => a.correct).length;
    return { right, total: r.length };
  });

  return (
    <section class="flex flex-col gap-3 rounded border border-background-offset bg-background-offset/30 p-4">
      <h3 class="text-sm font-semibold">Results</h3>
      <p class="text-sm">
        {score().right} of {score().total} correct
      </p>
      <button
        type="button"
        onClick={() => quiz.reset()}
        class="self-start rounded border border-background-offset px-3 py-1.5 text-xs hover:bg-background-offset"
      >
        Retake
      </button>
    </section>
  );
}
