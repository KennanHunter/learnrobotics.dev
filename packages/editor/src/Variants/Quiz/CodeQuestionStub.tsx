import { createEffect } from "solid-js";
import type { CodeUnitTestQuestion } from "@learnrobotics/content/types";
import { useQuiz } from "./quiz-store";

export function CodeQuestionStub(props: { question: CodeUnitTestQuestion }) {
  const quiz = useQuiz();

  // Register a draft so the submit button can still be enabled when this is
  // the only kind of question in the quiz — it's always graded incorrect for
  // now, so retakes will keep showing it.
  createEffect(() => {
    quiz.setDraft(props.question.id, {
      kind: "code-unit-test",
      skipped: true,
    });
  });

  return (
    <div class="flex flex-col gap-3">
      <div class="prose-sm max-w-none text-sm">{props.question.prompt}</div>
      <div class="rounded border border-dashed border-background-offset p-4 text-xs text-foreground-muted">
        Code-and-pass-tests questions aren't wired up yet. This question will be
        skipped for grading.
      </div>
    </div>
  );
}
