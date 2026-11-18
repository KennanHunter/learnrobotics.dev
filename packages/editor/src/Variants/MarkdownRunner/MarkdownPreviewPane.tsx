import { useMarkdownRunner } from "./markdown-store";

export function MarkdownPreviewPane() {
  const store = useMarkdownRunner();
  return (
    <article
      class="prose max-w-none h-full overflow-auto px-4 py-3"
      innerHTML={store.html()}
    />
  );
}
