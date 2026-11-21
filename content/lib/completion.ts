import { createContext, useContext } from "solid-js";

export type CompletionCtx = {
  /** Called when the lesson has met its completion criteria. Safe to call
   * repeatedly — the server dedups per (user, lesson). */
  markFinished: () => void;
};

export const CompletionContext = createContext<CompletionCtx | null>(null);

export function useCompletion(): CompletionCtx | null {
  return useContext(CompletionContext);
}
