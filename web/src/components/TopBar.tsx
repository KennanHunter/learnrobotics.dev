import { Show } from "solid-js";
import { AiFillGithub } from "solid-icons/ai/AiFillGithub";
import { AiOutlineInfoCircle } from "solid-icons/ai/AiOutlineInfoCircle";
import { authClient } from "~/lib/auth-client";
import { useSession } from "~/lib/session-context";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { ProfileMenu } from "./ProfileMenu";

export function TopBar() {
  const session = useSession();

  async function onGithub() {
    await authClient.signIn.social({ provider: "github", callbackURL: "/" });
  }

  return (
    <header class="flex items-center justify-between gap-3 border-b border-background-offset px-4 py-3">
      <a href="/" class="block text-inherit">
        <Logo class="h-8 w-auto" />
      </a>
      <div class="flex items-center gap-3">
        <ThemeToggle />
        <Show
          when={session() && !session()!.isAnonymous}
          fallback={
            <div class="flex items-center gap-2">
              <button
                class="flex items-center gap-2 rounded bg-primary px-3 py-1 text-sm text-background hover:opacity-80"
                onClick={onGithub}
              >
                <AiFillGithub />
                <span>Sign in with GitHub</span>
              </button>
              <span
                class="text-lg text-primary/60"
                title="All data is saved in your browser by default. To save across browsers, link your GitHub account."
                aria-label="Account info"
              >
                <AiOutlineInfoCircle />
              </span>
            </div>
          }
        >
          <ProfileMenu />
        </Show>
      </div>
    </header>
  );
}
