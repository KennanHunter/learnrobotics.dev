import type {
  ChapterDef,
  LessonDef,
  QuizDef,
  SimulatorDef,
  StarterDef,
  UnitDef,
} from "./types";

export const defineUnit = <T extends UnitDef>(x: T): T => x;
export const defineChapter = <T extends ChapterDef>(x: T): T => x;
export const defineLesson = <T extends LessonDef>(x: T): T => x;
export const defineStarter = <T extends StarterDef>(x: T): T => x;
export const defineSimulator = <T extends SimulatorDef>(x: T): T => x;
export const defineQuiz = <T extends QuizDef>(x: T): T => x;
