import { Show } from "solid-js";

export function Figure(props: {
  src: string;
  caption?: string;
  hid?: string;
  alt?: string;
}) {
  return (
    <figure data-mdx-id={props.hid} class="my-6">
      <img
        src={props.src}
        alt={props.alt ?? props.caption ?? ""}
        class="w-full rounded"
      />
      <Show when={props.caption}>
        <figcaption class="mt-2 text-sm text-foreground-muted">
          {props.caption}
        </figcaption>
      </Show>
    </figure>
  );
}
