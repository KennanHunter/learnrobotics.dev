import type { JSX } from "solid-js";

export function Loader(props: { children: JSX.Element }): JSX.Element {
  return (
    <div class="absolute inset-0 flex items-center justify-center text-sm text-foreground-muted">
      {props.children}
    </div>
  );
}
