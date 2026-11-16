import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { m } from "~/paraglide/messages";
import { localizeHref } from "~/paraglide/runtime";
import { Logo } from "../Logo/Logo";

type ErrorPageProps = {
  code: string;
  title: string;
  message?: string;
  detail?: string;
  action?: JSX.Element;
};

export function ErrorPage(props: ErrorPageProps): JSX.Element {
  return (
    <main class="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
      <a
        href={localizeHref("/")}
        class="block w-72 max-w-full mb-10 text-inherit"
        aria-label="Learn Robotics home"
      >
        <Logo />
      </a>
      <p class="font-mono text-sm tracking-widest text-blue uppercase mb-3">
        {m.error_label({ code: props.code })}
      </p>
      <h1 class="text-4xl sm:text-5xl font-semibold tracking-tight mb-4">
        {props.title}
      </h1>
      <Show when={props.message}>
        <p class="max-w-xl text-base text-foreground-muted mb-8">{props.message}</p>
      </Show>
      <div class="flex flex-wrap items-center justify-center gap-3">
        <a
          href={localizeHref("/")}
          class="rounded bg-primary px-4 py-2 text-sm text-background hover:opacity-80"
        >
          {m.error_back_home()}
        </a>
        {props.action}
      </div>
      <Show when={props.detail}>
        <details class="mt-10 max-w-xl w-full text-left">
          <summary class="cursor-pointer text-xs uppercase tracking-widest text-foreground-muted">
            {m.error_technical_details()}
          </summary>
          <pre class="mt-3 overflow-auto rounded border border-background-offset bg-background-offset p-3 text-xs">
            {props.detail}
          </pre>
        </details>
      </Show>
    </main>
  );
}
