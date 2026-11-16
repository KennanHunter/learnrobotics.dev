import { Show } from "solid-js";
import { AiFillGithub } from "solid-icons/ai/AiFillGithub";
import { AiOutlineInfoCircle } from "solid-icons/ai/AiOutlineInfoCircle";
import { authClient } from "~/lib/auth-client";
import { useSession } from "~/lib/session-context";
import { m } from "~/paraglide/messages";
import { localizeHref } from "~/paraglide/runtime";
import { Logo } from "../Logo/Logo";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import { ProfileMenu } from "../ProfileMenu/ProfileMenu";
import { EnvironmentBadge } from "./EnvironmentBadge";

export function TopBar() {
  const session = useSession();

  async function onGithub() {
    await authClient.signIn.social({
      provider: "github",
      callbackURL: localizeHref("/"),
    });
  }

  return (
    <header class="flex items-center justify-between gap-3 border-b border-background-offset px-4 py-3">
      <div class="flex items-center gap-4">
        <a href={localizeHref("/")} class="block text-inherit">
          <Logo class="h-8 w-auto" />
        </a>
        <a href={localizeHref("/about")} class="text-sm hover:underline">
          {m.nav_about()}
        </a>
        <EnvironmentBadge />
      </div>
      <div class="flex items-center gap-3">
        <ThemeToggle />
        <Show
          when={session() && !session()!.isAnonymous}
          fallback={
            <div class="flex items-center gap-2">
              <button
                class="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-background shadow-sm transition-all hover:bg-primary/90 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                onClick={onGithub}
              >
                <AiFillGithub class="text-base" />
                <span>{m.nav_sign_in_github()}</span>
              </button>
              <div class="group relative flex items-center">
                <button
                  type="button"
                  class="flex items-center justify-center rounded-full p-1 text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  aria-label={m.nav_account_info_aria()}
                >
                  <AiOutlineInfoCircle class="text-lg" />
                </button>
                <div
                  role="tooltip"
                  class="pointer-events-none absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 origin-top-right scale-95 rounded-md border border-background-offset bg-background px-3 py-2 text-xs text-foreground opacity-0 shadow-lg transition-all duration-150 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:scale-100 group-focus-within:opacity-100"
                >
                  {m.nav_account_info_tooltip()}
                </div>
              </div>
            </div>
          }
        >
          <ProfileMenu />
        </Show>
      </div>
    </header>
  );
}
