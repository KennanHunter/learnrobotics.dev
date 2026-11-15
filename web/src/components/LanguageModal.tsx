import { createSignal, For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { useRouter } from "@tanstack/solid-router";
import { LANGUAGES, LANGUAGE_CODES, type LanguageCode } from "~/lib/languages";
import {
  LANGUAGE_DESCRIPTIONS,
  UnsupportedLanguagesNotice,
} from "~/lib/language-content";
import { setLanguage } from "~/lib/session";
import { useModal } from "./ModalManager";

export function LanguageModal(props: { current: LanguageCode }) {
  const router = useRouter();
  const modal = useModal();
  const [selected, setSelected] = cs<LanguageCode | null>(null);
  const [pending, setPending] = createSignal(false);

  async function pick(code: LanguageCode) {
    setSelected(code);
    if (code === props.current) return;
    setPending(true);
    try {
      await setLanguage({ data: { language: code } });
      await router.invalidate();
    } finally {
      setPending(false);
    }
  }

  return (
    <div class="flex min-h-[18rem]">
      <ul class="flex w-48 flex-col border-r border-gray/40 py-2">
        <For each={LANGUAGE_CODES}>
          {(code) => {
            const entry = LANGUAGES[code];
            const isActive = () =>
              selected() === code || (selected() === null && code === props.current);
            return (
              <li>
                <button
                  type="button"
                  disabled={pending()}
                  class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray/20 disabled:opacity-60"
                  classList={{ "bg-gray/20 font-medium": isActive() }}
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
        <Show
          when={selected()}
          fallback={<UnsupportedLanguagesNotice />}
        >
          {(code) => <Dynamic component={LANGUAGE_DESCRIPTIONS[code()]} />}
        </Show>
        <div class="mt-6 flex justify-end">
          <button
            type="button"
            class="rounded border border-gray px-3 py-1 text-sm hover:bg-gray/20"
            onClick={() => modal.close()}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
