import { Show, type JSX } from "solid-js";

export function Figure(props: {
  src: string;
  alt: string;
  description?: JSX.Element;
}) {
  return (
    <figure class="not-prose my-6 flex flex-col gap-2">
      <img
        src={props.src}
        alt={props.alt}
        class="w-full rounded border border-background-offset bg-background-offset/30"
      />
      <Show when={props.description}>
        <figcaption class="text-xs leading-snug text-foreground-muted">
          {props.description}
        </figcaption>
      </Show>
    </figure>
  );
}
