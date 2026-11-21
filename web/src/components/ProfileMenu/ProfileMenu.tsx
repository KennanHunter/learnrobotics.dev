import { createSignal, onCleanup, Show } from "solid-js";
import { useRouter } from "@tanstack/solid-router";
import { authClient } from "~/lib/auth-client";
import { useSession } from "@learnrobotics/db";
import { useLocalizedNavigate } from "~/lib/use-localized-navigate";
import { m } from "~/paraglide/messages";

export function ProfileMenu() {
  const router = useRouter();
  const session = useSession();
  const navigate = useLocalizedNavigate();
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
    navigate("/settings");
  }

  function onAdmin() {
    setOpen(false);
    navigate("/admin");
  }

  function onRecord() {
    setOpen(false);
    navigate("/dev/record");
  }

  return (
    <div class="relative" ref={rootRef}>
      <button
        type="button"
        class="flex items-center gap-1.5 rounded border border-background-offset px-1.5 py-0.5 text-xs hover:bg-background-offset"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open()}
      >
        <Show
          when={session()?.image}
          fallback={
            <span class="flex h-5 w-5 items-center justify-center rounded-full bg-background-offset text-[0.65rem] font-medium">
              {initials()}
            </span>
          }
        >
          <img
            src={session()!.image!}
            alt=""
            class="h-5 w-5 rounded-full object-cover"
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
            class="block w-full px-2.5 py-1.5 text-left hover:bg-background-offset"
            onClick={onSettings}
          >
            {m.menu_settings()}
          </button>
          <Show when={session()?.isAdmin}>
            <button
              type="button"
              role="menuitem"
              class="block w-full px-2.5 py-1.5 text-left hover:bg-background-offset"
              onClick={onAdmin}
            >
              {m.menu_admin()}
            </button>
            <button
              type="button"
              role="menuitem"
              class="block w-full px-2.5 py-1.5 text-left hover:bg-background-offset"
              onClick={onRecord}
            >
              Record
            </button>
          </Show>
          <button
            type="button"
            role="menuitem"
            class="block w-full px-2.5 py-1.5 text-left hover:bg-background-offset"
            onClick={onSignOut}
          >
            {m.menu_logout()}
          </button>
        </div>
      </Show>
    </div>
  );
}
