import { For } from "solid-js";
import source from "./LoremIpsum.md?raw";

const PARAGRAPHS = source
  .split(/\n/)
  .map((p) => p.trim())
  .filter((p) => p && !p.startsWith("<!--"));

export function LoremIpsum(props: { paragraphs?: number }) {
  const min_count = PARAGRAPHS.length;
  const count = () =>
    props.paragraphs ? Math.min(props.paragraphs, min_count) : min_count;

  return <For each={PARAGRAPHS.slice(0, count())}>{(p) => <p>{p}</p>}</For>;
}
