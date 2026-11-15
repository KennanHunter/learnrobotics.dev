import { createSignal, Show } from "solid-js";
import { useRouter } from "@tanstack/solid-router";
import { MdFillLight_mode, MdFillDark_mode } from "solid-icons/md";
import { setTheme, type Theme } from "~/lib/session";

export function ThemeToggle(props: { theme: Theme | null }) {
  const router = useRouter();
  const [pending, setPending] = createSignal(false);

  const effective = (): Theme => {
    if (props.theme) return props.theme;
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  };

  async function toggle() {
    const next: Theme = effective() === "dark" ? "light" : "dark";
    setPending(true);
    try {
      await setTheme({ data: { theme: next } });
      await router.invalidate();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      disabled={pending()}
      class="rounded border border-gray p-1.5 text-lg hover:bg-gray/20 disabled:opacity-60"
      onClick={toggle}
    >
      <Show when={effective() === "dark"} fallback={<MdFillDark_mode />}>
        <MdFillLight_mode />
      </Show>
    </button>
  );
}
