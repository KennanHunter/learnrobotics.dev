import { createSignal } from "solid-js";
import { AiOutlineCopy } from "solid-icons/ai/AiOutlineCopy";
import { AiOutlineCheck } from "solid-icons/ai/AiOutlineCheck";

export type MarkdownCopyProps = {
  /** URL that serves the prompt-bundle markdown projection for Copy. */
  markdownUrl: string;
};

export function MarkdownCopy(props: MarkdownCopyProps) {
  const [copied, setCopied] = createSignal(false);
  let resetTimer: ReturnType<typeof setTimeout> | null = null;

  const flashCopied = () => {
    setCopied(true);
    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(() => setCopied(false), 1500);
  };

  const onCopy = async () => {
    const res = await fetch(props.markdownUrl);
    if (!res.ok) return;
    const payload = await res.text();
    try {
      await navigator.clipboard.writeText(payload);
      flashCopied();
    } catch {
      // Fallback for sandboxed contexts: select-and-copy via a hidden textarea.
      const ta = document.createElement("textarea");
      ta.value = payload;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        flashCopied();
      } finally {
        ta.remove();
      }
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      class="inline-flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-xs text-foreground-subtle hover:bg-background-offset hover:text-foreground"
      aria-live="polite"
    >
      {copied() ? (
        <AiOutlineCheck class="text-sm" />
      ) : (
        <AiOutlineCopy class="text-sm" />
      )}
      <span>{copied() ? "Copied" : "Copy Markdown"}</span>
    </button>
  );
}
