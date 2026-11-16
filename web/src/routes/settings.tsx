import { createFileRoute, useRouter } from "@tanstack/solid-router";
import { createSignal, For } from "solid-js";
import { Dynamic } from "solid-js/web";
import { TopBar } from "~/components/TopBar/TopBar";
import {
  LANGUAGES,
  LANGUAGE_CODES,
  UnsupportedLanguagesNotice,
  type LanguageCode,
} from "~/i18n";
import { setMonacoTheme } from "~/lib/session";
import { useSession } from "~/lib/session-context";
import { THEMES, type ThemeId } from "~/lib/monaco-themes";
import { logger } from "~/lib/logger";
import { m } from "~/paraglide/messages";
import { getLocale, setLocale } from "~/paraglide/runtime";

const log = logger.child({ scope: "settings" });

export const Route = createFileRoute("/settings")({
  component: Settings,
});

function Settings() {
  const router = useRouter();
  const session = useSession();
  const current = (): LanguageCode => getLocale() as LanguageCode;
  const [selected, setSelected] = createSignal<LanguageCode>(current());
  const [pending, setPending] = createSignal(false);

  async function pick(code: LanguageCode) {
    log.info({ from: getLocale(), to: code }, "language pick");
    setSelected(code);
    if (code === getLocale()) {
      log.debug("language pick: same as current, no-op");
      return;
    }
    setPending(true);
    try {
      setLocale(code);
      log.debug("setLocale invoked (Paraglide will navigate)");
    } finally {
      setPending(false);
    }
  }

  const monacoSelection = (): ThemeId | null =>
    (session()?.monacoTheme as ThemeId | undefined) ?? null;
  const [monacoPending, setMonacoPending] = createSignal(false);

  async function pickMonacoTheme(id: ThemeId | null) {
    log.info({ from: monacoSelection(), to: id }, "monaco theme pick");
    setMonacoPending(true);
    try {
      const res = await setMonacoTheme({ data: { monacoTheme: id } });
      log.debug({ res }, "setMonacoTheme responded");
      await router.invalidate();
    } catch (err) {
      log.error({ err }, "setMonacoTheme failed");
      throw err;
    } finally {
      setMonacoPending(false);
    }
  }

  return (
    <>
      <TopBar />
      <main class="mx-auto max-w-3xl px-6 py-12 space-y-10">
        <h1 class="text-4xl font-semibold tracking-tight">
          {m.settings_heading()}
        </h1>
        <section>
          <h2 class="text-xl font-medium mb-3">
            {m.settings_language_heading()}
          </h2>
          <div class="mb-4">
            <UnsupportedLanguagesNotice />
          </div>
          <div class="flex gap-6 rounded border border-background-offset">
            <ul class="flex w-48 shrink-0 flex-col border-r border-background-offset py-2">
              <For each={LANGUAGE_CODES}>
                {(code) => {
                  const entry = LANGUAGES[code];
                  const isActive = () => selected() === code;
                  return (
                    <li>
                      <button
                        type="button"
                        disabled={pending()}
                        class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-background-offset disabled:opacity-60"
                        classList={{
                          "bg-background-offset font-medium": isActive(),
                        }}
                        onClick={() => pick(code)}
                      >
                        <span aria-hidden="true">{entry.flag}</span>
                        <span>{entry.label}</span>
                      </button>
                    </li>
                  );
                }}
              </For>
            </ul>
            <div class="flex-1 p-6">
              <Dynamic component={LANGUAGES[selected()].description} />
            </div>
          </div>
        </section>

        <section>
          <h2 class="text-xl font-medium mb-3">
            {m.settings_editor_theme_heading()}
          </h2>
          <p class="mb-3 text-sm opacity-80">
            {m.settings_editor_theme_auto_hint()}
          </p>
          <ul class="divide-y divide-background-offset rounded border border-background-offset">
            <li>
              <button
                type="button"
                disabled={monacoPending()}
                class="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-background-offset disabled:opacity-60"
                classList={{
                  "bg-background-offset font-medium":
                    monacoSelection() === null,
                }}
                onClick={() => pickMonacoTheme(null)}
              >
                <span>{m.settings_editor_theme_follow_app()}</span>
              </button>
            </li>
            <For each={Object.values(THEMES)}>
              {(entry) => {
                const isActive = () => monacoSelection() === entry.id;
                return (
                  <li>
                    <button
                      type="button"
                      disabled={monacoPending()}
                      class="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-background-offset disabled:opacity-60"
                      classList={{
                        "bg-background-offset font-medium": isActive(),
                      }}
                      onClick={() => pickMonacoTheme(entry.id as ThemeId)}
                    >
                      <span>{entry.label}</span>
                      {entry.autoFor ? (
                        <span
                          aria-label={`auto-applied for ${entry.autoFor} app theme`}
                          class="text-xs opacity-70"
                        >
                          ★ {entry.autoFor}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              }}
            </For>
          </ul>
        </section>
      </main>
    </>
  );
}
