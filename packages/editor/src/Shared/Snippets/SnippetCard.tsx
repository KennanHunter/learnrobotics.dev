import { createSignal } from "solid-js";
import Prism from "prismjs";
import "prismjs/components/prism-java";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-markdown";
import { AiOutlineCopy } from "solid-icons/ai/AiOutlineCopy";
import { AiOutlineCheck } from "solid-icons/ai/AiOutlineCheck";

export type SnippetCardProps = {
  title: string;
  language: "java" | "markdown";
  body: readonly string[];
  tabSize: number;
};

const BADGE_CLASSES: Record<SnippetCardProps["language"], string> = {
  java: "bg-red/15 text-red",
  markdown: "bg-blue/15 text-blue",
};

export function SnippetCard(props: SnippetCardProps) {
  const [copied, setCopied] = createSignal(false);
  const text = () =>
    props.body.join("\n").replaceAll("\t", " ".repeat(props.tabSize));
  const html = () => {
    const grammar = Prism.languages[props.language];
    if (!grammar) return escapeHtml(text());
    return Prism.highlight(text(), grammar, props.language);
  };

  let resetTimer: ReturnType<typeof setTimeout> | null = null;
  const flash = () => {
    setCopied(true);
    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(() => setCopied(false), 1500);
  };

  const onCopy = async () => {
    const value = text();
    try {
      await navigator.clipboard.writeText(value);
      flash();
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        flash();
      } finally {
        ta.remove();
      }
    }
  };

  return (
    <div class="overflow-hidden rounded border border-background-offset bg-background">
      <header class="flex items-center justify-between gap-2 border-b border-background-offset px-3 py-2">
        <div class="flex min-w-0 items-center gap-2">
          <span class="truncate text-xs font-semibold tracking-tight">
            {props.title}
          </span>
          <span
            class={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${BADGE_CLASSES[props.language]}`}
          >
            {props.language}
          </span>
        </div>
        <button
          type="button"
          onClick={onCopy}
          class="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-foreground-subtle hover:bg-background-offset hover:text-foreground"
          aria-live="polite"
        >
          {copied() ? (
            <AiOutlineCheck class="text-sm" />
          ) : (
            <AiOutlineCopy class="text-sm" />
          )}
          <span>{copied() ? "Copied" : "Copy"}</span>
        </button>
      </header>
      <pre class="overflow-x-auto bg-background-offset/40 px-3 py-2 text-xs leading-relaxed">
        <code
          class={`font-mono language-${props.language}`}
          innerHTML={html()}
        />
      </pre>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
