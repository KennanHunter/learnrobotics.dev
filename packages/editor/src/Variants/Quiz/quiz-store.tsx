import {
  createContext,
  createMemo,
  createSignal,
  useContext,
  type Accessor,
  type JSX,
} from "solid-js";
import type { QuizQuestion } from "@learnrobotics/content/types";
import type { QuizAnswer, QuizResult } from "./types";

export type QuizStatus = "in-progress" | "submitted";

/** Opaque answer payloads keyed by question id. */
export type AnswerDraft =
  | { kind: "multiple-choice"; selected: number }
  | { kind: "drag-to-reorder"; order: number[] }
  | { kind: "code-unit-test"; skipped: true };

export type QuizStoreValue = {
  quizId: string;
  visibleQuestions: Accessor<readonly QuizQuestion[]>;
  status: Accessor<QuizStatus>;
  drafts: Accessor<Record<string, AnswerDraft | undefined>>;
  setDraft: (id: string, draft: AnswerDraft) => void;
  results: Accessor<readonly QuizAnswer[]>;
  canSubmit: Accessor<boolean>;
  submit: () => Promise<void>;
  reset: () => void;
  /** Cached shuffled order per drag-reorder question id. */
  shuffledOrderFor: (id: string, length: number) => number[];
};

const QuizContext = createContext<QuizStoreValue>();

export type QuizProviderProps = {
  quizId: string;
  questions: readonly QuizQuestion[];
  /** Question ids the current user has previously answered correctly. */
  mastered?: ReadonlySet<string>;
  onSubmit?: (result: QuizResult) => Promise<void> | void;
  children: JSX.Element;
};

export function QuizProvider(props: QuizProviderProps) {
  const [drafts, setDrafts] = createSignal<
    Record<string, AnswerDraft | undefined>
  >({});
  const [status, setStatus] = createSignal<QuizStatus>("in-progress");
  const [results, setResults] = createSignal<readonly QuizAnswer[]>([]);

  const visibleQuestions = createMemo(() => {
    const mastered = props.mastered;
    if (!mastered || mastered.size === 0) return props.questions;
    return props.questions.filter((q) => !mastered.has(q.id));
  });

  const shuffleCache = new Map<string, number[]>();
  const shuffledOrderFor = (id: string, length: number): number[] => {
    const cached = shuffleCache.get(id);
    if (cached && cached.length === length) return cached;
    const indices = Array.from({ length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j]!, indices[i]!];
    }
    // Guard against the (small) chance of landing on the identity
    // permutation — would grade as "correct without doing anything."
    if (length > 1 && indices.every((v, i) => v === i)) {
      [indices[0], indices[1]] = [indices[1]!, indices[0]!];
    }
    shuffleCache.set(id, indices);
    return indices;
  };

  const setDraft = (id: string, draft: AnswerDraft) => {
    setDrafts((prev) => ({ ...prev, [id]: draft }));
  };

  const canSubmit = createMemo(() => {
    if (status() === "submitted") return false;
    const d = drafts();
    return visibleQuestions().every((q) => d[q.id] !== undefined);
  });

  const grade = (
    question: QuizQuestion,
    draft: AnswerDraft | undefined,
  ): QuizAnswer => {
    if (!draft) {
      return { questionId: question.id, correct: false, payload: null };
    }
    switch (question.kind) {
      case "multiple-choice": {
        if (draft.kind !== "multiple-choice") {
          return { questionId: question.id, correct: false, payload: draft };
        }
        return {
          questionId: question.id,
          correct: draft.selected === question.answer,
          payload: { selected: draft.selected },
        };
      }
      case "drag-to-reorder": {
        if (draft.kind !== "drag-to-reorder") {
          return { questionId: question.id, correct: false, payload: draft };
        }
        const correct = draft.order.every((v, i) => v === i);
        return {
          questionId: question.id,
          correct,
          payload: { order: draft.order },
        };
      }
      case "code-unit-test": {
        // Stubbed — no runtime yet; mark incorrect so retakes keep showing it.
        return { questionId: question.id, correct: false, payload: null };
      }
    }
  };

  const submit = async () => {
    const d = drafts();
    const answers = visibleQuestions().map((q) => grade(q, d[q.id]));
    setResults(answers);
    setStatus("submitted");
    const payload: QuizResult = {
      quizId: props.quizId,
      submittedAt: new Date().toISOString(),
      answers: [...answers],
    };
    if (props.onSubmit) await props.onSubmit(payload);
  };

  const reset = () => {
    setDrafts({});
    setResults([]);
    setStatus("in-progress");
    shuffleCache.clear();
  };

  const value: QuizStoreValue = {
    quizId: props.quizId,
    visibleQuestions,
    status,
    drafts,
    setDraft,
    results,
    canSubmit,
    submit,
    reset,
    shuffledOrderFor,
  };

  return (
    <QuizContext.Provider value={value}>{props.children}</QuizContext.Provider>
  );
}

export function useQuiz(): QuizStoreValue {
  const ctx = useContext(QuizContext);
  if (!ctx)
    throw new Error("useQuiz must be called inside <QuizProvider>");
  return ctx;
}
