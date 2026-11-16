import type { JSX } from "solid-js";

export function Note(props: { children: JSX.Element; class?: string }) {
  return (
    <div
      role="note"
      class={`rounded-md border-l-4 border-l-primary bg-background-offset px-4 py-3 text-sm ${props.class ?? ""}`}
    >
      {props.children}
    </div>
  );
}
