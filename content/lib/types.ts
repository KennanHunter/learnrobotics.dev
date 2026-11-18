import type { JSX } from "solid-js";

export type LessonKind = "reading" | "code" | "sim" | "quiz";

export type LessonImportance = "essential" | "useful" | "niche";

export type LessonStatus = "todo" | "in-progress" | "done" | "placement-passed";

export type LessonDifficulty = 1 | 2 | 3 | 4 | 5;

type LessonBase = {
  id: string;
  title: string;
  estMinutes: number;
  difficulty: LessonDifficulty;
  importance: LessonImportance;
  status?: LessonStatus;
};

export type ReadingLessonDef = LessonBase & {
  kind: "reading";
};

export type CodeLessonDef = LessonBase & {
  kind: "code";
  starter?: string;
  recording?: string;
  language?: string;
};

export type SimLessonDef = LessonBase & {
  kind: "sim";
  starter?: string;
  simulator?: string;
  recording?: string;
};

export type QuizLessonDef = LessonBase & {
  kind: "quiz";
  questions: readonly QuizQuestion[];
};

export type LessonDef =
  | ReadingLessonDef
  | CodeLessonDef
  | SimLessonDef
  | QuizLessonDef;

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
};

export type DragReorderQuestion = {
  id: string;
  kind: "drag-to-reorder";
  prompt: JSX.Element;
  items: readonly JSX.Element[];
};

export type CodeUnitTestQuestion = {
  id: string;
  kind: "code-unit-test";
  prompt: JSX.Element;
  // TODO: test spec — JUnit source, stdin/stdout cases, or assertion fn.
};

export type QuizQuestion =
  | MultipleChoiceQuestion
  | DragReorderQuestion
  | CodeUnitTestQuestion;
