import { Show, type JSX } from "solid-js";
import { AiOutlineInfoCircle } from "solid-icons/ai/AiOutlineInfoCircle";
import { AiFillStar } from "solid-icons/ai/AiFillStar";
import { AiFillWarning } from "solid-icons/ai/AiFillWarning";

export type NoteVariant = "normal" | "info" | "important" | "warning";

export type NoteProps = {
  variant?: NoteVariant;
  /** Overrides the variant's default header label. Pass "" to hide. */
  title?: string;
  children: JSX.Element;
  class?: string;
};

type VariantStyle = {
  container: string;
  icon: () => JSX.Element;
  defaultTitle: string;
  titleClass: string;
};

const VARIANTS: Record<NoteVariant, VariantStyle> = {
  normal: {
    container:
      "border-l-foreground-subtle/40 bg-background-offset/60 text-foreground",
    icon: () => <></>,
    defaultTitle: "",
    titleClass: "text-foreground",
  },
  info: {
    container: "border-l-blue bg-blue/5 text-foreground",
    icon: () => <AiOutlineInfoCircle class="h-4 w-4 text-blue" />,
    defaultTitle: "Info",
    titleClass: "text-blue",
  },
  important: {
    container: "border-l-primary bg-primary/5 text-foreground",
    icon: () => <AiFillStar class="h-4 w-4 text-primary" />,
    defaultTitle: "Important",
    titleClass: "text-primary",
  },
  warning: {
    container: "border-l-red bg-red/5 text-foreground",
    icon: () => <AiFillWarning class="h-4 w-4 text-red" />,
    defaultTitle: "Warning",
    titleClass: "text-red",
  },
};

export function Note(props: NoteProps) {
  const v = (): VariantStyle => VARIANTS[props.variant ?? "normal"];
  const title = () =>
    props.title === undefined ? v().defaultTitle : props.title;
  const showHeader = () => title().length > 0;

  return (
    <aside
      role="note"
      class={`not-prose my-2 rounded-md border-l-4 px-4 py-3 text-sm ${v().container} ${props.class ?? ""}`}
    >
      <Show when={showHeader()}>
        <header
          class={`mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${v().titleClass}`}
        >
          {v().icon()}
          <span>{title()}</span>
        </header>
      </Show>
      <div class="leading-relaxed">{props.children}</div>
    </aside>
  );
}
