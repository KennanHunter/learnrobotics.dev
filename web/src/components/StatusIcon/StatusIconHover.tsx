import { Show } from "solid-js";
import { HoverCard } from "@learnrobotics/content/components/HoverCard";
import { StatusIcon } from "./StatusIcon";
import type { LessonStatus } from "~/lib/content";

function fmt(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** StatusIcon with a hover popover showing per-user progress detail.
 * Only renders a popover when the user has started or finished the lesson;
 * for untouched lessons the icon is bare. Portaled via HoverCard so it
 * never clips against overflow ancestors. */
export function StatusIconHover(props: {
  status: LessonStatus;
  startedAt?: number;
  finishedAt?: number;
  /** For code lessons under the `finish` condition, hint what's left. */
  codeFinishCondition?: boolean;
}) {
  const hasHoverContent = () =>
    props.startedAt != null || props.finishedAt != null;

  const body = () => (
    <Show
      when={props.finishedAt != null}
      fallback={
        <>
          <span class="mb-1 block font-semibold text-foreground">
            You have started this lesson.
          </span>
          <Show when={props.startedAt != null}>
            <span class="block text-foreground-muted">
              Started: {fmt(props.startedAt!)}
            </span>
          </Show>
          <Show when={props.codeFinishCondition}>
            <span class="mt-2 block text-foreground-muted">
              Run your code and read till the end to complete this lesson.
            </span>
          </Show>
        </>
      }
    >
      <span class="mb-1 block font-semibold text-foreground">
        You have completed this lesson.
      </span>
      <Show when={props.startedAt != null}>
        <span class="block text-foreground-muted">
          Started: {fmt(props.startedAt!)}
        </span>
      </Show>
      <span class="block text-foreground-muted">
        Finished: {fmt(props.finishedAt!)}
      </span>
    </Show>
  );

  return (
    <Show
      when={hasHoverContent()}
      fallback={<StatusIcon status={props.status} />}
    >
      <HoverCard content={body}>
        {(ref) => (
          <span ref={ref} class="inline-flex shrink-0">
            <StatusIcon status={props.status} />
          </span>
        )}
      </HoverCard>
    </Show>
  );
}
