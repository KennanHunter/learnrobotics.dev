import { Switch, Match } from "solid-js";
import { AiFillCheckCircle } from "solid-icons/ai/AiFillCheckCircle";
import { AiOutlineCheckCircle } from "solid-icons/ai/AiOutlineCheckCircle";
import type { LessonStatus } from "~/lib/courses-mock";

export function StatusIcon(props: {
  status: LessonStatus;
  class?: string;
}) {
  const base = () => `shrink-0 text-base ${props.class ?? ""}`;
  return (
    <Switch>
      <Match when={props.status === "done"}>
        <AiFillCheckCircle class={`${base()} text-green`} />
      </Match>
      <Match when={props.status === "placement-passed"}>
        <AiFillCheckCircle class={`${base()} text-blue`} />
      </Match>
      <Match when={props.status === "in-progress"}>
        <AiFillCheckCircle class={`${base()} text-[#e5b800]`} />
      </Match>
      <Match when={props.status === "todo"}>
        <AiOutlineCheckCircle class={`${base()} text-foreground-subtle`} />
      </Match>
    </Switch>
  );
}

export const statusLabel: Record<LessonStatus, string> = {
  done: "Completed",
  "placement-passed": "Passed placement",
  "in-progress": "In progress",
  todo: "Not started",
};
