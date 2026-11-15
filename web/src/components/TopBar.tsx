import { Show } from "solid-js";
import { useRouter } from "@tanstack/solid-router";
import { AiFillGithub, AiOutlineInfoCircle } from "solid-icons/ai";
import { authClient } from "~/lib/auth-client";
import { LANGUAGES, type LanguageCode } from "~/lib/languages";
import type { SessionSummary } from "~/lib/session";
import { Logo } from "./Logo";
import { useModal } from "./ModalManager";
import { LanguageModal } from "./LanguageModal";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar(props: { session: SessionSummary }) {
  const router = useRouter();
  const modal = useModal();

  const lang = (): LanguageCode =>
    (props.session?.language as LanguageCode) in LANGUAGES
      ? (props.session!.language as LanguageCode)
      : "en";

  async function onGithub() {
    await authClient.signIn.social({ provider: "github", callbackURL: "/" });
  }

  async function onSignOut() {
    await authClient.signOut();
    await router.invalidate();
  }

  function openLanguageModal() {
    modal.open(<LanguageModal current={lang()} />);
  }

  return (
    <header class="flex items-center justify-between gap-3 border-b border-gray px-4 py-3">
      <a href="/" class="block text-inherit">
        <Logo class="h-8 w-auto" />
      </a>
      <div class="flex items-center gap-3">
        <ThemeToggle theme={props.session?.theme ?? null} />
        <button
          type="button"
          class="rounded border border-gray px-3 py-1 text-sm hover:bg-gray/20"
          onClick={openLanguageModal}
        >
          {LANGUAGES[lang()].label}
        </button>
        <Show
          when={props.session && !props.session.isAnonymous}
          fallback={
            <div class="flex items-center gap-2">
              <button
                class="flex items-center gap-2 rounded bg-black px-3 py-1 text-sm text-white hover:bg-gray dark:bg-white dark:text-black dark:hover:bg-gray"
                onClick={onGithub}
              >
                <AiFillGithub />
                <span>Sign in with GitHub</span>
              </button>
              <span
                class="text-lg text-gray dark:text-white/70"
                title="All data is saved in your browser by default. To save across browsers, link your GitHub account."
                aria-label="Account info"
              >
                <AiOutlineInfoCircle />
              </span>
            </div>
          }
        >
          <span class="text-sm">Signed in as {props.session!.name}</span>
          <button
            class="rounded border border-gray px-3 py-1 text-sm hover:bg-gray/20"
            onClick={onSignOut}
          >
            Sign out
          </button>
        </Show>
      </div>
    </header>
  );
}
