import type { JSX } from "solid-js";

type LogoProps = {
  class?: string;
  opaque?: boolean;
};

const svg = (props: { class?: string }): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 960 128"
    font-family="'Fira Code', ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
    font-weight="500"
    font-size="88"
    class={props.class}
  >
    <text x="16" y="96">
      <tspan fill="#0066b3">learn</tspan>
      <tspan fill="#ed1c24">robotics</tspan>
      <tspan fill="currentColor">.dev</tspan>
    </text>
  </svg>
);

export function Logo(props: LogoProps): JSX.Element {
  if (props.opaque) {
    return (
      <div class={`bg-background rounded-lg p-2 ${props.class ?? ""}`}>
        {svg({})}
      </div>
    );
  }
  return svg({ class: props.class });
}
