import { Show } from "solid-js";
import { useEnvironment, type Environment } from "~/lib/environment-context";
import { m } from "~/paraglide/messages";

const STYLES: Record<Environment, { bg: string; label: () => string }> = {
  development: { bg: "bg-red", label: () => m.env_badge_development() },
  preview: { bg: "bg-blue", label: () => m.env_badge_preview() },
  alpha: { bg: "bg-green", label: () => m.env_badge_alpha() },
};

export function EnvironmentBadge() {
  const environment = useEnvironment();
  return (
    <Show when={environment()}>
      {(env) => (
        <span
          class={`${STYLES[env()].bg} rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-primary`}
        >
          {STYLES[env()].label()}
        </span>
      )}
    </Show>
  );
}
