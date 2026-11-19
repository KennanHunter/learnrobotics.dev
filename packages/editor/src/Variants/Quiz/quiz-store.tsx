import {
  createContext,
  createMemo,
  createSignal,
  untrack,
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
  /** A question is locked once it has been graded correct — no more edits. */
  isLocked: (id: string) => boolean;
  /** True once the question has been submitted at least once (used for hints). */
  hasAttempted: (id: string) => boolean;
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
  const [attemptedIds, setAttemptedIds] = createSignal<ReadonlySet<string>>(
    new Set(),
  );

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

  const isLocked = (id: string) => {
    const r = results().find((a) => a.questionId === id);
    return r?.correct === true;
  };
  const hasAttempted = (id: string) => attemptedIds().has(id);

  const setDraft = (id: string, draft: AnswerDraft) => {
    // setDraft is called from createEffect bodies in DragReorderPane and
    // CodeQuestionStub. Reading reactive state here would make `results`
    // a tracked dep of those effects, and writing to `results` below would
    // then re-fire them in an infinite loop. Untrack the reads so only
    // the UI (memos reading `results`) reacts to grading changes.
    untrack(() => {
      if (isLocked(id)) return;
      setDrafts((prev) => ({ ...prev, [id]: draft }));
      const existing = results();
      if (existing.some((a) => a.questionId === id)) {
        // Had a prior (incorrect) grade — clear it so the UI reverts to the
        // pre-submit look. Hint stays visible via attemptedIds.
        setResults(existing.filter((a) => a.questionId !== id));
      }
    });
  };

  const canSubmit = createMemo(() => {
    const d = drafts();
    const qs = visibleQuestions();
    if (!qs.every((q) => d[q.id] !== undefined)) return false;
    if (status() === "in-progress") return true;
    // Submitted: allow resubmit only while at least one question is unlocked.
    return !qs.every((q) => isLocked(q.id));
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
    const prevById = new Map(
      results().map((r) => [r.questionId, r] as const),
    );
    // Preserve already-correct answers verbatim; grade the rest fresh.
    const answers = visibleQuestions().map((q) => {
      const prev = prevById.get(q.id);
      if (prev?.correct) return prev;
      return grade(q, d[q.id]);
    });
    setResults(answers);
    setAttemptedIds(new Set(visibleQuestions().map((q) => q.id)));
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
    setAttemptedIds(new Set<string>());
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
    isLocked,
    hasAttempted,
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
