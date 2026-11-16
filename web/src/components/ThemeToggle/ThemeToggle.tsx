import { createSignal, Show } from "solid-js";
import { useRouter } from "@tanstack/solid-router";
import { MdFillLight_mode } from "solid-icons/md/MdFillLight_mode";
import { MdFillDark_mode } from "solid-icons/md/MdFillDark_mode";
import { setTheme, type Theme } from "~/lib/session";
import { useSession } from "~/lib/session-context";

export function ThemeToggle() {
  const router = useRouter();
  const session = useSession();
  const [pending, setPending] = createSignal(false);

  const effective = (): Theme => {
    const t = session()?.theme;
    if (t) return t;
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
      class="rounded border border-background-offset p-1.5 text-lg hover:bg-background-offset disabled:opacity-60"
      onClick={toggle}
    >
      <Show when={effective() === "dark"} fallback={<MdFillDark_mode />}>
        <MdFillLight_mode />
      </Show>
    </button>
  );
}
