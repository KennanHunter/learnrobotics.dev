import { createFileRoute, useRouter } from "@tanstack/solid-router";
import { createSignal, For } from "solid-js";
import { Dynamic } from "solid-js/web";
import { TopBar } from "~/components/TopBar";
import {
  LANGUAGES,
  LANGUAGE_CODES,
  UnsupportedLanguagesNotice,
  type LanguageCode,
} from "~/i18n";
import { setLanguage } from "~/lib/session";
import { useSession } from "~/lib/session-context";

export const Route = createFileRoute("/settings")({
  component: Settings,
});

function Settings() {
  const router = useRouter();
  const session = useSession();
  const current = (): LanguageCode => {
    const raw = session()?.language as LanguageCode | undefined;
    return raw && raw in LANGUAGES ? raw : "en";
  };
  const [selected, setSelected] = createSignal<LanguageCode>(current());
  const [pending, setPending] = createSignal(false);

  async function pick(code: LanguageCode) {
    setSelected(code);
    if (code === current()) return;
    setPending(true);
    try {
      await setLanguage({ data: { language: code } });
      await router.invalidate();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <TopBar />
      <main class="mx-auto max-w-3xl px-6 py-12 space-y-10">
        <h1 class="text-4xl font-semibold tracking-tight">Settings</h1>
        <section>
          <h2 class="text-xl font-medium mb-3">Language</h2>
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
      </main>
    </>
  );
}
