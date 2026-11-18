import type { JSX } from "solid-js";

export function Opinion(props: { children: JSX.Element }) {
  return (
    <blockquote class="opinion">
      <strong>Opinion:</strong> {props.children}
    </blockquote>
  );
}
