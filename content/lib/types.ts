import type { JSX } from "solid-js";

export type LessonKind = "reading" | "code" | "sim" | "quiz";

export type LessonImportance = "essential" | "useful" | "niche";

export type LessonStatus = "todo" | "in-progress" | "done" | "placement-passed";

export type LessonDifficulty = 1 | 2 | 3 | 4 | 5;

type LessonBase = {
  id: string;
  title: string;
  estMinutes?: number;
  difficulty: LessonDifficulty;
  importance: LessonImportance;
  status?: LessonStatus;
  /** UX-only: ms epoch when the signed-in user first visited this lesson.
   * Set by `applyStatuses` at render time, not authored content. */
  startedAt?: number;
  /** UX-only: ms epoch when the signed-in user first finished this lesson. */
  finishedAt?: number;
};

export type ReadingLessonDef = LessonBase & {
  kind: "reading";
};

export type CodeLessonDef = LessonBase & {
  kind: "code";
  starter?: string;
  /** Shared project binding key. When set, every lesson with the same
   * `project` value resolves to the same persisted project row for a
   * given user. When unset, the lesson binds to its own slug. */
  project?: string;
  recording?: string;
  language?: string;
  /** Snippets attached to this lesson. Import from `content/snippets/*`. */
  snippets?: readonly SnippetDef[];
  /** When true, mounts the full file-tree panel (rename / create /
   *  delete) with a show/hide toggle in the editor header. */
  showFileTree?: boolean;
  /** Decides what counts as "finished" for this code lesson. Default is
   * `{ kind: "finish" }` — run once + scroll through the article. */
  completionCondition?: CodeCompletionCondition;
};

/** Discriminated union so we can add richer completion kinds later
 * without a breaking rename. */
export type CodeCompletionCondition =
  | { kind: "finish" }
  | { kind: "tests" };

export type SnippetLanguage = "java" | "markdown";

export type SnippetDef = {
  title: string;
  language?: SnippetLanguage;
  body: readonly string[];
};

export type SimLessonDef = LessonBase & {
  kind: "sim";
  starter?: string;
  /** See `CodeLessonDef.project`. */
  project?: string;
  simulator?: string;
  recording?: string;
};

export type QuizLessonDef = LessonBase & {
  kind: "quiz";
  questions: readonly QuizQuestion[];
};

export type LessonDef =
  ReadingLessonDef | CodeLessonDef | SimLessonDef | QuizLessonDef;

export type ChapterDef = {
  id: string;
  title: string;
  description: string;
};

export type UnitDef = {
  id: string;
  title: string;
  blurb: string;
};

export type StarterDef = {
  id: string;
  title: string;
  language: string;
  activeFile: string;
  files: readonly string[];
};

export type SimulatorInput = {
  name: string;
  type: string;
  range?: readonly [number, number];
};

export type SimulatorOutput = {
  name: string;
  type: string;
};

export type SimulatorDef = {
  id: string;
  title: string;
  description: string;
  inputs: readonly SimulatorInput[];
  outputs: readonly SimulatorOutput[];
  notes?: string;
};

export type MultipleChoiceQuestion = {
  id: string;
  kind: "multiple-choice";
  prompt: JSX.Element;
  choices: readonly JSX.Element[];
  answer: number;
  /** Shown to the learner after an incorrect attempt; they can then retry. */
  hint?: JSX.Element;
};

export type DragReorderQuestion = {
  id: string;
  kind: "drag-to-reorder";
  prompt: JSX.Element;
  items: readonly JSX.Element[];
  /** Shown to the learner after an incorrect attempt; they can then retry. */
  hint?: JSX.Element;
};

export type CodeUnitTestQuestion = {
  id: string;
  kind: "code-unit-test";
  prompt: JSX.Element;
  // TODO: test spec — JUnit source, stdin/stdout cases, or assertion fn.
};

export type CodeMarkdownQuestion = {
  id: string;
  kind: "code-markdown";
  prompt: JSX.Element;
  test: (content: string) => unknown;
};

export type QuizQuestion =
  | MultipleChoiceQuestion
  | DragReorderQuestion
  | CodeUnitTestQuestion
  | CodeMarkdownQuestion;
