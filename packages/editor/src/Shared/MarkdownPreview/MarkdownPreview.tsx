import { createMemo, type Accessor } from "solid-js";
import { marked } from "marked";

export type MarkdownPreviewProps = {
  source: Accessor<string>;
};

/**
 * Renders a markdown string as HTML. Trusts the source — this is only
 * mounted inside the editor on content the user (or lesson author) owns.
 * Do not feed arbitrary input here without sanitization.
 */
export function MarkdownPreview(props: MarkdownPreviewProps) {
  const html = createMemo(
    () => marked.parse(props.source(), { async: false }) as string,
  );
  return (
    <article
      class="prose max-w-none h-full overflow-auto px-4 py-3"
      innerHTML={html()}
    />
  );
}
