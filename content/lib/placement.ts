import type { QuizQuestion } from "./types";

export type PlacementTestDef = {
  id: string;
  title: string;
  /**
   * Hand-curated list of questions, typically referenced as named exports
   * from chapter-quiz `.tsx` files (e.g. `HelloJavaQuiz.testPrinting`).
   */
  questions: readonly QuizQuestion[];
};

export const definePlacementTest = <T extends PlacementTestDef>(x: T): T => x;
