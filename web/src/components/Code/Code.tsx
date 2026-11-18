import Prism from "prismjs";
import "prismjs/components/prism-java";
// prism-markup is a prerequisite for prism-markdown.
import "prismjs/components/prism-markup";
import "prismjs/components/prism-markdown";
import "./prism-theme.css";

export type CodeLanguage = "java" | "markdown";

type CodeProps = {
  children: string;
  language: CodeLanguage;
  inline?: boolean;
  class?: string;
};

function highlight(source: string, language: CodeLanguage): string {
  const grammar = Prism.languages[language];
  if (!grammar) return source;
  return Prism.highlight(source, grammar, language);
}

export function Code(props: CodeProps) {
  const html = () => highlight(props.children, props.language);

  if (props.inline) {
    return (
      <code
        class={`rounded bg-background-offset px-1.5 py-0.5 font-mono text-[0.9em] language-${props.language} ${props.class ?? ""}`}
        innerHTML={html()}
      />
    );
  }

  return (
    <pre
      class={`overflow-x-auto rounded-md bg-background-offset p-4 text-sm ${props.class ?? ""}`}
    >
      <code class={`font-mono language-${props.language}`} innerHTML={html()} />
    </pre>
  );
}
