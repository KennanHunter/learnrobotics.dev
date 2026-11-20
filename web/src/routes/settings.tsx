import { createFileRoute, useRouter } from "@tanstack/solid-router";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  Show,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import {
  DEFAULT_CODE_SYSTEM_PROMPT,
  DEFAULT_SYSTEM_PROMPT,
} from "@learnrobotics/editor";
import { TopBar } from "~/components/TopBar/TopBar";
import {
  LANGUAGES,
  LANGUAGE_CODES,
  UnsupportedLanguagesNotice,
  type LanguageCode,
} from "~/i18n";
import { useSession } from "@learnrobotics/db";
import {
  setCodeSystemPrompt,
  setMonacoTheme,
  setSystemPrompt,
  setTabSize,
} from "~/server/session";
import { DEFAULT_TAB_SIZE } from "@learnrobotics/db";
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
          <p class="mb-3 text-sm text-foreground-muted">
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
                          class="text-xs text-foreground-muted"
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

        <TabSizeSection session={session} />

        <section id="prompts" class="space-y-8 scroll-mt-20">
          <h2 class="text-xl font-medium">{m.settings_prompts_heading()}</h2>
          <SystemPromptSection
            heading={m.settings_system_prompt_heading()}
            hint={m.settings_system_prompt_hint()}
            defaultText={DEFAULT_SYSTEM_PROMPT}
            saved={() => session()?.systemPrompt ?? null}
            save={async (value) => {
              const res = await setSystemPrompt({
                data: { systemPrompt: value },
              });
              log.debug({ res }, "setSystemPrompt responded");
              await router.invalidate();
            }}
          />
          <SystemPromptSection
            heading={m.settings_code_system_prompt_heading()}
            hint={m.settings_code_system_prompt_hint()}
            defaultText={DEFAULT_CODE_SYSTEM_PROMPT}
            saved={() => session()?.codeSystemPrompt ?? null}
            save={async (value) => {
              const res = await setCodeSystemPrompt({
                data: { codeSystemPrompt: value },
              });
              log.debug({ res }, "setCodeSystemPrompt responded");
              await router.invalidate();
            }}
          />
        </section>
      </main>
    </>
  );
}

type SystemPromptSectionProps = {
  heading: string;
  hint: string;
  defaultText: string;
  saved: () => string | null;
  save: (value: string | null) => Promise<void>;
};

function SystemPromptSection(props: SystemPromptSectionProps) {
  // Textarea pre-fills with the saved override if present, otherwise the
  // default. Whether we're "using custom" is determined by the saved value,
  // not the textarea contents — editing without saving doesn't flip the pill.
  const isCustom = () => props.saved() !== null;
  const [draft, setDraft] = createSignal(props.saved() ?? props.defaultText);
  const [pending, setPending] = createSignal(false);
  // Re-sync draft from saved when it changes externally (session loads late,
  // `router.invalidate()` after a save, etc.). `on(..., { defer: true })`
  // skips the initial run so we don't clobber the signal's seed value.
  createEffect(
    on(
      () => props.saved(),
      (s) => setDraft(s ?? props.defaultText),
      { defer: true },
    ),
  );
  const draftMatchesSaved = createMemo(() => {
    const d = draft();
    const s = props.saved();
    if (s === null) return d.trim() === props.defaultText.trim();
    return d === s;
  });

  async function onSave() {
    const d = draft();
    // Saving the default text (or empty) clears the override.
    const value =
      d.trim() === "" || d.trim() === props.defaultText.trim() ? null : d;
    log.info(
      { hadOverride: isCustom(), nextLen: value?.length ?? 0 },
      "system prompt save",
    );
    setPending(true);
    try {
      await props.save(value);
    } catch (err) {
      log.error({ err }, "system prompt save failed");
      throw err;
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div class="mb-3 flex items-center justify-between gap-3">
        <h3 class="text-base font-medium">{props.heading}</h3>
        <span
          class="rounded-full border px-2 py-0.5 text-xs"
          classList={{
            "border-green/40 text-green": isCustom(),
            "border-background-offset text-foreground-muted": !isCustom(),
          }}
        >
          {isCustom()
            ? m.settings_system_prompt_using_custom()
            : m.settings_system_prompt_using_default()}
        </span>
      </div>
      <p class="mb-3 text-sm text-foreground-muted">{props.hint}</p>
      <textarea
        class="block w-full min-h-[14rem] rounded border border-background-offset bg-background-offset/30 p-3 font-mono text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary"
        value={draft()}
        onInput={(e) => setDraft(e.currentTarget.value)}
        spellcheck={false}
      />
      <div class="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={pending() || draftMatchesSaved()}
          class="rounded border border-background-offset px-3 py-1.5 text-sm hover:bg-background-offset disabled:opacity-60"
          onClick={onSave}
        >
          {pending()
            ? m.settings_system_prompt_saving()
            : m.settings_system_prompt_save()}
          {!draftMatchesSaved() && !pending() ? (
            <span aria-label="unsaved changes" class="ml-1 text-red">
              *
            </span>
          ) : null}
        </button>
        <button
          type="button"
          disabled={pending() || draft() === props.defaultText}
          class="rounded border border-background-offset px-3 py-1.5 text-sm hover:bg-background-offset disabled:opacity-60"
          onClick={() => setDraft(props.defaultText)}
        >
          {m.settings_system_prompt_reset()}
        </button>
      </div>
    </div>
  );
}

const TAB_PRESETS = [2, 4, 8] as const;
type TabPreset = (typeof TAB_PRESETS)[number];

function TabSizeSection(props: {
  session: () => { tabSize: number | null } | null | undefined;
}) {
  const router = useRouter();
  const saved = (): number | null => props.session()?.tabSize ?? null;
  // Default (4) is active when there's no saved value OR when saved is 4.
  const effective = (): number => saved() ?? DEFAULT_TAB_SIZE;
  const isPresetActive = (n: TabPreset) => effective() === n;
  const isCustomActive = () => {
    const s = saved();
    if (s === null) return false;
    return !TAB_PRESETS.includes(s as TabPreset);
  };
  const [pending, setPending] = createSignal(false);
  const [showCustom, setShowCustom] = createSignal(isCustomActive());
  const [customDraft, setCustomDraft] = createSignal(
    isCustomActive() ? String(saved()) : "",
  );

  async function pick(next: number | null) {
    log.info({ from: saved(), to: next }, "tab size pick");
    setPending(true);
    try {
      await setTabSize({ data: { tabSize: next } });
      await router.invalidate();
    } catch (err) {
      log.error({ err }, "setTabSize failed");
      throw err;
    } finally {
      setPending(false);
    }
  }

  async function saveCustom() {
    const parsed = Number.parseInt(customDraft(), 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 64) return;
    // Round-trip through the default — storing 4 as 4 (not NULL) is fine;
    // user can click the "4" preset to go back to the default.
    await pick(parsed);
  }

  return (
    <section>
      <h2 class="text-xl font-medium mb-3">Tab size</h2>
      <p class="mb-3 text-sm text-foreground-muted">
        Controls indentation width in the editor, snippet copy output, and the
        Format button.
      </p>
      <ul class="divide-y divide-background-offset rounded border border-background-offset">
        <For each={TAB_PRESETS}>
          {(n) => (
            <li>
              <button
                type="button"
                disabled={pending()}
                class="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-background-offset disabled:opacity-60"
                classList={{
                  "bg-background-offset font-medium": isPresetActive(n),
                }}
                onClick={() => {
                  setShowCustom(false);
                  pick(n === DEFAULT_TAB_SIZE ? null : n);
                }}
              >
                <span>{n} spaces</span>
                {n === DEFAULT_TAB_SIZE ? (
                  <span class="text-xs text-foreground-muted">★ default</span>
                ) : null}
              </button>
            </li>
          )}
        </For>
        <li>
          <button
            type="button"
            disabled={pending()}
            class="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-background-offset disabled:opacity-60"
            classList={{
              "bg-background-offset font-medium":
                isCustomActive() || showCustom(),
            }}
            onClick={() => {
              setShowCustom(true);
              if (!customDraft()) setCustomDraft(String(effective()));
            }}
          >
            <span>Custom{isCustomActive() ? ` (${saved()})` : ""}</span>
          </button>
        </li>
      </ul>
      <Show when={showCustom()}>
        <div class="mt-3 rounded border border-background-offset bg-background-offset/30 p-3">
          <p class="text-sm text-foreground-muted">
            What on earth are you doing? 2, 4, and 8 are pretty much the only
            tab sizes you'll see in the world. I won't stop you though.
          </p>
          <div class="mt-3 flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="64"
              value={customDraft()}
              onInput={(e) => setCustomDraft(e.currentTarget.value)}
              class="w-24 rounded border border-background-offset bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              disabled={pending() || !isValidCustom(customDraft())}
              class="rounded border border-background-offset px-3 py-1.5 text-sm hover:bg-background-offset disabled:opacity-60"
              onClick={saveCustom}
            >
              Save
            </button>
          </div>
        </div>
      </Show>
    </section>
  );
}

function isValidCustom(s: string): boolean {
  const n = Number.parseInt(s, 10);
  return Number.isInteger(n) && n >= 1 && n <= 64;
}
