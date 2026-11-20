// HTML → Markdown converter built on workerd's native `HTMLRewriter`.
// Replaces the previous turndown-based path, which crashed the SSR bundle
// at module init because turndown's `createHTMLParser` fallback calls
// `require('@xmldom/xmldom')` — `require` doesn't exist in a Workers ESM
// context. HTMLRewriter is a workerd global, zero deps, zero shims.
//
// Scope: handles every HTML tag our MDX pipeline currently emits
// (headings, paragraphs, inline formatting, links, lists, blockquotes,
// images, inline + fenced code). Prism-highlighted `<span class="token">`
// wrappers are no-ops — we just emit their text content.

type ListFrame = { kind: "ol" | "ul"; index: number };

export async function htmlToMarkdown(html: string): Promise<string> {
  const chunks: string[] = [];
  const listStack: ListFrame[] = [];
  let currentLinkHref: string | null = null;

  const push = (s: string) => chunks.push(s);

  const rewriter = new HTMLRewriter()
    .on("h1", heading(push, 1))
    .on("h2", heading(push, 2))
    .on("h3", heading(push, 3))
    .on("h4", heading(push, 4))
    .on("h5", heading(push, 5))
    .on("h6", heading(push, 6))
    .on("p", {
      element(el) {
        push("\n\n");
        el.onEndTag(() => push("\n"));
      },
    })
    .on("em", wrap(push, "_", "_"))
    .on("i", wrap(push, "_", "_"))
    .on("strong", wrap(push, "**", "**"))
    .on("b", wrap(push, "**", "**"))
    .on("a", {
      element(el) {
        currentLinkHref = el.getAttribute("href");
        push("[");
        el.onEndTag(() => {
          push(`](${currentLinkHref ?? ""})`);
          currentLinkHref = null;
        });
      },
    })
    .on("ul", {
      element(el) {
        listStack.push({ kind: "ul", index: 0 });
        el.onEndTag(() => {
          listStack.pop();
          // Only emit a trailing newline when the outermost list closes;
          // nested-list closes shouldn't introduce a blank line between
          // the inner last item and the next outer item.
          if (listStack.length === 0) push("\n");
        });
      },
    })
    .on("ol", {
      element(el) {
        listStack.push({ kind: "ol", index: 0 });
        el.onEndTag(() => {
          listStack.pop();
          if (listStack.length === 0) push("\n");
        });
      },
    })
    .on("li", {
      element() {
        const top = listStack[listStack.length - 1];
        const depth = Math.max(0, listStack.length - 1);
        const indent = "  ".repeat(depth);
        if (!top) {
          push("\n- ");
          return;
        }
        if (top.kind === "ol") {
          top.index += 1;
          push(`\n${indent}${top.index}. `);
        } else {
          push(`\n${indent}- `);
        }
      },
    })
    .on("blockquote", {
      element(el) {
        push("\n\n> ");
        el.onEndTag(() => push("\n\n"));
      },
    })
    .on("hr", {
      element() {
        push("\n\n---\n\n");
      },
    })
    .on("br", {
      element() {
        // Backslash-newline is the CommonMark hard break marker that
        // survives our trailing-whitespace trim in `normalize`. The more
        // common `  \n` form gets stripped and loses its meaning.
        push("\\\n");
      },
    })
    .on("img", {
      element(el) {
        const src = el.getAttribute("src") ?? "";
        const alt = el.getAttribute("alt") ?? "";
        push(`![${alt}](${src})`);
      },
    })
    .on("code", {
      element(el) {
        const cls = el.getAttribute("class") ?? "";
        const match = cls.match(/language-([a-z0-9+#.-]+)/i);
        if (match) {
          push(`\n\n\`\`\`${match[1]}\n`);
          el.onEndTag(() => push("\n```\n\n"));
        } else {
          push("`");
          el.onEndTag(() => push("`"));
        }
      },
    });

  rewriter.onDocument({
    text(t) {
      if (t.text) push(t.text);
    },
  });

  await rewriter.transform(new Response(html)).arrayBuffer();

  return normalize(chunks.join(""));
}

function heading(push: (s: string) => void, level: number) {
  const prefix = `\n\n${"#".repeat(level)} `;
  return {
    element(el: Element) {
      push(prefix);
      el.onEndTag(() => push("\n\n"));
    },
  };
}

function wrap(push: (s: string) => void, open: string, close: string) {
  return {
    element(el: Element) {
      push(open);
      el.onEndTag(() => push(close));
    },
  };
}

// Collapse runs of 3+ newlines, trim surrounding whitespace, and guarantee a
// single trailing newline. The streaming push pattern over-emits separators
// (e.g. `</h1>` ends with `\n\n` and the next `<p>` starts with `\n\n`); the
// collapse keeps output idempotent-ish without each handler having to peek
// at what came before.
function normalize(s: string): string {
  return s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
