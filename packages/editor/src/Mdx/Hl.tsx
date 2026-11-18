import type { JSX } from "solid-js";

export function Hl(props: { hid: string; children: JSX.Element }) {
  return <span data-mdx-id={props.hid}>{props.children}</span>;
}
