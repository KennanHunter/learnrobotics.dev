import type { JSX } from "solid-js";

type CalloutKind = "note" | "warn" | "tip";

const borderClass: Record<CalloutKind, string> = {
  note: "border-l-blue",
  warn: "border-l-red",
  tip: "border-l-green",
};

export function Callout(props: { kind?: CalloutKind; children: JSX.Element }) {
  const kind = props.kind ?? "note";
  return (
    <aside
      class={`my-4 rounded-r border-l-4 bg-background-offset px-4 py-3 text-sm ${borderClass[kind]}`}
    >
      {props.children}
    </aside>
  );
}
