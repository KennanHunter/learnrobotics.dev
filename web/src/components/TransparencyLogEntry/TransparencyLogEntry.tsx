import type { JSX } from "solid-js";

export function TransparencyLogEntry(props: {
  date: string;
  title: string;
  children: JSX.Element;
}) {
  return (
    <li class="space-y-1">
      <div class="flex flex-wrap items-baseline gap-x-3">
        <time
          datetime={props.date}
          class="font-mono text-xs text-foreground-subtle tabular-nums"
        >
          {props.date}
        </time>
        <span class="font-medium text-primary">{props.title}</span>
      </div>
      <div class="text-foreground-muted">{props.children}</div>
    </li>
  );
}
