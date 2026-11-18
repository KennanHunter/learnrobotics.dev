import { Dynamic } from "solid-js/web";
import { splitProps, type JSX } from "solid-js";

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
  code: tag("code"),
  pre: tag("pre"),
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
