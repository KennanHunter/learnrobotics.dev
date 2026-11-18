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

export type QuizQuestion =
  | {
      kind: "multiple-choice";
      prompt: string;
      choices: readonly string[];
      answer: number;
    }
  | { kind: "short-answer"; prompt: string; accept: readonly string[] }
  | { kind: "code-matches"; prompt: string; expect: RegExp };

export type QuizDef = {
  questions: readonly QuizQuestion[];
};
