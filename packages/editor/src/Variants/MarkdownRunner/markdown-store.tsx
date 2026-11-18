import {
  createContext,
  createMemo,
  createSignal,
  useContext,
  type Accessor,
  type JSX,
} from "solid-js";
import { marked } from "marked";

export type MarkdownRunnerStore = {
  source: Accessor<string>;
  setSource: (next: string) => void;
  html: Accessor<string>;
  /** Force re-render; auto-render covers typing, this is for the Run button. */
  renderNow: () => void;
};

const MarkdownRunnerContext = createContext<MarkdownRunnerStore>();

export function useMarkdownRunner(): MarkdownRunnerStore {
  const ctx = useContext(MarkdownRunnerContext);
  if (!ctx) throw new Error("useMarkdownRunner outside provider");
  return ctx;
}

export type MarkdownRunnerProviderProps = {
  starter?: string;
  children: JSX.Element;
};

export function MarkdownRunnerProvider(props: MarkdownRunnerProviderProps) {
  const [source, setSource] = createSignal(props.starter ?? "");
  // We own the source — lesson authoring or student scratch — so no HTML
  // sanitization yet. TODO: sanitize if this ever accepts arbitrary input.
  const html = createMemo(() => marked.parse(source(), { async: false }) as string);

  function renderNow() {
    // Memo recomputes on source change; manual trigger is a noop but
    // keeps the Run button honest for future async pipelines.
    setSource(source());
  }

  const store: MarkdownRunnerStore = { source, setSource, html, renderNow };

  return (
    <MarkdownRunnerContext.Provider value={store}>
      {props.children}
    </MarkdownRunnerContext.Provider>
  );
}
