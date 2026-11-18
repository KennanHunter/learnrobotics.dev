import type { JSX } from "solid-js";

export function MonacoContainer(props: {
  class?: string;
  width?: string;
  height?: string;
  children: JSX.Element;
}): JSX.Element {
  return (
    <div
      class={`relative overflow-hidden ${props.class ?? ""}`}
      style={{ width: props.width, height: props.height }}
    >
      {props.children}
    </div>
  );
}
