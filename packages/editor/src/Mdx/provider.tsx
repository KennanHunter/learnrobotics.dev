import { Dynamic } from "solid-js/web";
import { splitProps, type JSX } from "solid-js";
import Prism from "prismjs";
import "prismjs/components/prism-java";
// prism-markup is a prerequisite for prism-markdown.
import "prismjs/components/prism-markup";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-python";
import "./prism-theme.css";

Prism.languages.apl = {
  comment: {
    pattern: /⍝.*/,
    greedy: true,
  },
  assign: {
    pattern: /←/,
    alias: "operator",
  },
  divide: {
    pattern: /÷/,
    alias: "operator",
  },
  "array-length": {
    pattern: /≢/,
    alias: "operator",
  },
};

type AnyProps = Record<string, unknown> & { children?: JSX.Element };

// MDX's default compile output has nodes like `<_components.h1>…</_components.h1>`
// where `_components.h1` defaults to the literal string `"h1"`. React accepts a
// string as the element type; Solid requires a function. We give MDX a
// components map whose values are tiny functions that forward props to the
// matching tag via `<Dynamic>`.
function tag(name: string) {
  return (props: AnyProps) => {
    const [local, rest] = splitProps(props, ["children"]);
    return (
      <Dynamic component={name} {...rest}>
        {local.children}
      </Dynamic>
    );
  };
}

// Pull "java" out of "language-java", "hljs language-java foo", etc.
function detectLanguage(className: string | undefined): string | undefined {
  if (!className) return undefined;
  const m = className.match(/language-([a-z0-9+#.-]+)/i);
  return m?.[1];
}

function highlight(source: string, language: string): string {
  const grammar = Prism.languages[language];
  if (!grammar) return source;
  return Prism.highlight(source, grammar, language);
}

// MDX wraps a fenced code block as `<pre><code className="language-X">text</code></pre>`.
// Our `pre` tag below just adds overflow + background styling; this `code` tag
// does the work: when `language-X` is present the body is run through Prism
// and rendered via innerHTML. No language → plain inline `<code>` styling.
function CodeTag(props: AnyProps) {
  const [local, rest] = splitProps(props, ["children", "className", "class"]);
  const className = (local.className ?? local.class) as string | undefined;
  const language = detectLanguage(className);

  if (language && typeof local.children === "string") {
    return (
      <code
        class={`font-mono language-${language}`}
        innerHTML={highlight(local.children, language)}
      />
    );
  }

  return (
    <code
      class={`rounded bg-background-offset px-1.5 py-0.5 font-mono text-[0.9em] ${className ?? ""}`}
      {...rest}
    >
      {local.children}
    </code>
  );
}

function PreTag(props: AnyProps) {
  const [local, rest] = splitProps(props, ["children"]);
  return (
    <pre
      class="overflow-x-auto rounded-md bg-background-offset p-4 text-sm"
      {...rest}
    >
      {local.children}
    </pre>
  );
}

const defaultComponents = {
  h1: tag("h1"),
  h2: tag("h2"),
  h3: tag("h3"),
  h4: tag("h4"),
  h5: tag("h5"),
  h6: tag("h6"),
  p: tag("p"),
  a: tag("a"),
  ul: tag("ul"),
  ol: tag("ol"),
  li: tag("li"),
  blockquote: tag("blockquote"),
  code: CodeTag,
  pre: PreTag,
  em: tag("em"),
  strong: tag("strong"),
  hr: tag("hr"),
  br: tag("br"),
  img: tag("img"),
  table: tag("table"),
  thead: tag("thead"),
  tbody: tag("tbody"),
  tr: tag("tr"),
  th: tag("th"),
  td: tag("td"),
};

export function useMDXComponents(
  provided?: Record<string, unknown>,
): Record<string, unknown> {
  return { ...defaultComponents, ...(provided ?? {}) };
}
