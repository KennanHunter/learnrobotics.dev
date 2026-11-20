import {
  createMemo,
  createSignal,
  onMount,
  Show,
  type Component,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import type { CodeMarkdownQuestion } from "@learnrobotics/content/types";
import type { MonacoEditorProps } from "../../CodeEditor";
import { useQuiz } from "./quiz-store";

export type CodeMarkdownPaneProps = {
  question: CodeMarkdownQuestion;
  monacoTheme?: () => string;
  registerThemes?: MonacoEditorProps["registerThemes"];
};

export function CodeMarkdownPane(props: CodeMarkdownPaneProps) {
  const quiz = useQuiz();
  const [Editor, setEditor] = createSignal<Component<MonacoEditorProps> | null>(
    null,
  );
  const [liveFeedback, setLiveFeedback] = createSignal<string | null>(null);

  onMount(async () => {
    const mod = await import("../../CodeEditor");
    setEditor(() => mod.MonacoEditor);
  });

  const draft = createMemo(() => {
    const d = quiz.drafts()[props.question.id];
    return d?.kind === "code-markdown" ? d : undefined;
  });
  const result = createMemo(() =>
    quiz.results().find((r) => r.questionId === props.question.id),
  );
  const locked = () => quiz.isLocked(props.question.id);

  const content = () => draft()?.content ?? "";

  const setContent = (next: string) => {
    quiz.setDraft(props.question.id, {
      kind: "code-markdown",
      content: next,
    });
  };

  const runCheck = () => {
    try {
      const out = props.question.test(content());
      setLiveFeedback(out == null ? "" : String(out));
    } catch (err) {
      setLiveFeedback(err instanceof Error ? err.message : String(err));
    }
  };

  const submittedFeedback = () => {
    const r = result();
    if (!r) return null;
    const payload = r.payload as { feedback?: unknown } | null;
    if (!payload || payload.feedback == null) return null;
    return String(payload.feedback);
  };

  return (
    <div class="flex flex-col gap-3">
      <div class="prose-sm max-w-none text-sm">{props.question.prompt}</div>
      <div class="h-56 overflow-hidden rounded border border-background-offset">
        <Show
          when={Editor()}
          fallback={
            <div class="flex h-full items-center justify-center text-xs text-foreground-muted">
              Loading editor…
            </div>
          }
        >
          <Dynamic
            component={Editor()!}
            language="markdown"
            value={content()}
            theme={props.monacoTheme?.()}
            path={`quiz-${props.question.id}.md`}
            registerThemes={props.registerThemes}
            onChange={(val: string) => {
              if (locked()) return;
              setContent(val);
              // Fresh edits invalidate any previous live-feedback message.
              setLiveFeedback(null);
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              wordWrap: "on",
              readOnly: locked(),
              scrollBeyondLastLine: false,
            }}
          />
        </Show>
      </div>
      <div class="flex items-center justify-between gap-3">
        <p class="text-[11px] text-foreground-muted">
          {content().length} character{content().length === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={runCheck}
          disabled={locked() || content().length === 0}
          class="rounded border border-background-offset px-3 py-1 text-xs font-medium hover:bg-background-offset disabled:cursor-not-allowed disabled:opacity-50"
        >
          Check
        </button>
      </div>
      <Show when={liveFeedback() !== null}>
        <aside
          role="note"
          class="rounded border border-background-offset bg-background-offset/30 px-3 py-2 text-xs text-foreground-muted"
        >
          {liveFeedback()}
        </aside>
      </Show>
      <Show when={result()}>
        {(r) => (
          <p class={r().correct ? "text-xs text-green" : "text-xs text-red"}>
            {r().correct ? "Submitted." : "Nothing submitted."}
            <Show when={submittedFeedback()}>
              <span class="ml-2 text-foreground-muted">
                — {submittedFeedback()}
              </span>
            </Show>
          </p>
        )}
      </Show>
    </div>
  );
}
