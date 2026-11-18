import { createSignal, Show } from "solid-js";
import { useRouter } from "@tanstack/solid-router";
import { MdFillLight_mode } from "solid-icons/md/MdFillLight_mode";
import { MdFillDark_mode } from "solid-icons/md/MdFillDark_mode";
import { useTheme, type Theme } from "@learnrobotics/db";
import { setTheme } from "~/server/session";
import { logger } from "~/lib/logger";

const log = logger.child({ scope: "ThemeToggle" });

export function ThemeToggle() {
  const router = useRouter();
  const { effectiveTheme } = useTheme();
  const [pending, setPending] = createSignal(false);

  async function toggle() {
    const current = effectiveTheme();
    const next: Theme = current === "dark" ? "light" : "dark";
    log.info({ from: current, to: next }, "toggle clicked");
    setPending(true);
    try {
      const res = await setTheme({ data: { theme: next } });
      log.debug({ res }, "setTheme responded");
      await router.invalidate();
      log.debug({ effectiveTheme: effectiveTheme() }, "after invalidate");
    } catch (err) {
      log.error({ err }, "setTheme failed");
      throw err;
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      disabled={pending()}
      class="rounded border border-background-offset p-1 text-base hover:bg-background-offset disabled:opacity-60"
      onClick={toggle}
    >
      <Show when={effectiveTheme() === "dark"} fallback={<MdFillDark_mode />}>
        <MdFillLight_mode />
      </Show>
    </button>
  );
}
