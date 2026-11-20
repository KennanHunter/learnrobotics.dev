import type {
  ChapterDef,
  LessonDef,
  QuizQuestion,
  SimulatorDef,
  StarterDef,
  UnitDef,
} from "./types";

export const defineUnit = <const T extends UnitDef>(x: T): T => x;
export const defineChapter = <const T extends ChapterDef>(x: T): T => x;
export const defineLesson = <const T extends LessonDef>(x: T): T => x;
export const defineStarter = <const T extends StarterDef>(x: T): T => x;
export const defineSimulator = <const T extends SimulatorDef>(x: T): T => x;
export const defineQuestion = <const T extends QuizQuestion>(x: T): T => x;
