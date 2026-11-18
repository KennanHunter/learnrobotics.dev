import { onCleanup, onMount, Show } from "solid-js";
import { AiFillGithub } from "solid-icons/ai/AiFillGithub";
import { AiOutlineInfoCircle } from "solid-icons/ai/AiOutlineInfoCircle";
import { authClient } from "~/lib/auth-client";
import { useSession } from "@learnrobotics/db";
import { m } from "~/paraglide/messages";
import { localizeHref } from "~/paraglide/runtime";
import { Logo } from "../Logo/Logo";
import { LogoSquare } from "../LogoSquare/LogoSquare";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import { ProfileMenu } from "../ProfileMenu/ProfileMenu";
import { EnvironmentBadge } from "./EnvironmentBadge";
import { BreadcrumbNav, type BreadcrumbCrumbs } from "./BreadcrumbNav";

export function TopBar(props: { crumbs?: BreadcrumbCrumbs } = {}) {
  const session = useSession();

  async function onGithub() {
    await authClient.signIn.social({
      provider: "github",
      callbackURL: localizeHref("/"),
    });
  }

  let headerEl: HTMLElement | undefined;
  onMount(() => {
    if (!headerEl) return;
    const update = () => {
      document.documentElement.style.setProperty(
        "--topbar-h",
        `${headerEl!.offsetHeight}px`,
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(headerEl);
    onCleanup(() => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--topbar-h");
    });
  });

  return (
    <header
      ref={headerEl}
      class="border-b border-background-offset"
    >
      <div class="flex items-center justify-between gap-2.5 px-3 py-1.5">
        <div class="flex items-center gap-3">
          <a href={localizeHref("/")} class="block text-inherit">
            <Logo class="hidden h-[1.6rem] w-auto sm:block" />
            <LogoSquare class="h-[1.6rem] w-[1.6rem] sm:hidden" />
          </a>
          <Show
            when={props.crumbs}
            fallback={
              <div class="hidden items-center gap-3 sm:flex">
                <a
                  href={localizeHref("/playground")}
                  class="text-xs hover:underline"
                >
                  {m.nav_playground()}
                </a>
                <a
                  href={localizeHref("/discord")}
                  class="text-xs hover:underline"
                >
                  {m.nav_discord()}
                </a>
                <a
                  href={localizeHref("/about")}
                  class="text-xs hover:underline"
                >
                  {m.nav_about()}
                </a>
              </div>
            }
          >
            <div class="hidden sm:block">
              <BreadcrumbNav crumbs={props.crumbs!} />
            </div>
          </Show>
          <EnvironmentBadge />
        </div>
        <div class="flex items-center gap-2.5">
          <a
            href="https://github.com/kennanhunter/learnrobotics.dev"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View source on GitHub"
            class="rounded border border-background-offset p-1 text-base hover:bg-background-offset"
          >
            <AiFillGithub />
          </a>
          <ThemeToggle />
          <Show
            when={session() && !session()!.isAnonymous}
            fallback={
              <div class="flex items-center gap-1.5">
                <button
                  class="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-background shadow-sm transition-all hover:bg-primary/90 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  onClick={onGithub}
                >
                  <AiFillGithub class="text-sm" />
                  <span class="hidden sm:inline">
                    {m.nav_sign_in_github()}
                  </span>
                </button>
                <div class="group relative flex items-center">
                  <button
                    type="button"
                    class="flex items-center justify-center rounded-full p-0.5 text-foreground-muted transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    aria-label={m.nav_account_info_aria()}
                  >
                    <AiOutlineInfoCircle class="text-base" />
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
      </div>
      <Show when={props.crumbs}>
        <div class="flex items-center border-t border-background-offset/60 px-3 py-1.5 sm:hidden">
          <BreadcrumbNav crumbs={props.crumbs!} />
        </div>
      </Show>
      <Show when={!props.crumbs}>
        <div class="flex items-center gap-3 border-t border-background-offset/60 px-3 py-1.5 sm:hidden">
          <a
            href={localizeHref("/playground")}
            class="text-xs hover:underline"
          >
            {m.nav_playground()}
          </a>
          <a
            href={localizeHref("/discord")}
            class="text-xs hover:underline"
          >
            {m.nav_discord()}
          </a>
          <a href={localizeHref("/about")} class="text-xs hover:underline">
            {m.nav_about()}
          </a>
        </div>
      </Show>
    </header>
  );
}
