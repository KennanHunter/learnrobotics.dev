import { onCleanup, onMount, type JSX } from "solid-js";
import { useCompletion } from "../../completion";

/** Wraps any lesson content. Once the wrapped element scrolls into view,
 * calls `markFinished()` on the surrounding `CompletionContext`. Designed
 * to go near the natural end of a reading lesson (or any opt-out marker
 * the author wants) so "scrolled past this" counts as completion.
 */
export function MarkCompletion(props: { children: JSX.Element }) {
  const completion = useCompletion();
  let ref: HTMLDivElement | undefined;

  onMount(() => {
    if (!ref || !completion) return;
    const el = ref;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            completion.markFinished();
            observer.disconnect();
            return;
          }
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    onCleanup(() => observer.disconnect());
  });

  return <div ref={ref}>{props.children}</div>;
}
