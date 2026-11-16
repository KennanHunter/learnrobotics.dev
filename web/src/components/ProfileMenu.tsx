import { createSignal, onCleanup, Show } from "solid-js";
import { useNavigate, useRouter } from "@tanstack/solid-router";
import { authClient } from "~/lib/auth-client";
import { useSession } from "~/lib/session-context";

export function ProfileMenu() {
  const router = useRouter();
  const navigate = useNavigate();
  const session = useSession();
  const [open, setOpen] = createSignal(false);

  let rootRef!: HTMLDivElement;

  const onDocClick = (e: MouseEvent) => {
    if (!rootRef.contains(e.target as Node)) setOpen(false);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  };
  if (typeof window !== "undefined") {
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    onCleanup(() => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    });
  }

  const initials = () => {
    const name = session()?.name ?? "";
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
  };

  async function onSignOut() {
    setOpen(false);
    await authClient.signOut();
    await router.invalidate();
  }

  function onSettings() {
    setOpen(false);
    navigate({ to: "/settings" });
  }

  return (
    <div class="relative" ref={rootRef}>
      <button
        type="button"
        class="flex items-center gap-2 rounded border border-background-offset px-2 py-1 text-sm hover:bg-background-offset"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open()}
      >
        <Show
          when={session()?.image}
          fallback={
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-background-offset text-xs font-medium">
              {initials()}
            </span>
          }
        >
          <img
            src={session()!.image!}
            alt=""
            class="h-6 w-6 rounded-full object-cover"
          />
        </Show>
        <span>{session()?.name}</span>
      </button>
      <Show when={open()}>
        <div
          role="menu"
          class="absolute right-0 top-full z-40 mt-1 w-40 overflow-hidden rounded border border-background-offset bg-background text-sm shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            class="block w-full px-3 py-2 text-left hover:bg-background-offset"
            onClick={onSettings}
          >
            Settings
          </button>
          <button
            type="button"
            role="menuitem"
            class="block w-full px-3 py-2 text-left hover:bg-background-offset"
            onClick={onSignOut}
          >
            Logout
          </button>
        </div>
      </Show>
    </div>
  );
}
