import { createContext, useContext } from "solid-js";

// Set to true when rendering a lesson for its markdown projection
// (via Solid SSR + turndown). Components that mount heavy interactive
// UI should check this and render a static summary variant instead.
export const MarkdownRenderContext = createContext<boolean>(false);

export function useIsMarkdownRender(): boolean {
  return useContext(MarkdownRenderContext);
}
