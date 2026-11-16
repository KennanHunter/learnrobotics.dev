import type { JSX } from "solid-js";

type LogoSquareProps = {
  class?: string;
  opaque?: boolean;
};

const svg = (props: { class?: string }): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 320 256"
    font-family="'Fira Code', ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
    font-weight="600"
    font-size="128"
    class={props.class}
  >
    <text x="160" y="172" text-anchor="middle">
      <tspan fill="#0066b3">l</tspan>
      <tspan fill="#ed1c24">r</tspan>
      <tspan fill="currentColor">.d</tspan>
    </text>
  </svg>
);

export function LogoSquare(props: LogoSquareProps): JSX.Element {
  if (props.opaque) {
    return (
      <div class={`bg-background rounded-lg p-2 ${props.class ?? ""}`}>
        {svg({})}
      </div>
    );
  }
  return svg({ class: props.class });
}
