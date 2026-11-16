import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/solid-router";
import { createEffect } from "solid-js";
import { HydrationScript, isServer } from "solid-js/web";
import { ErrorPage } from "~/components/ErrorPage/ErrorPage";
import { ModalProvider } from "~/components/ModalManager/ModalManager";
import { getSession } from "~/lib/session";
import { SessionProvider } from "~/lib/session-context";
import { getLocale } from "~/paraglide/runtime";
import { m } from "~/paraglide/messages";
import styles from "~/styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Learn Robotics" },
    ],
    links: [
      { rel: "stylesheet", href: styles },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  beforeLoad: async () => {
    const session = await getSession();
    return { session };
  },
  component: RootDocument,
  notFoundComponent: () => (
    <ErrorPage
      code="404"
      title={m.error_404_title()}
      message={m.error_404_message()}
    />
  ),
  errorComponent: (props) => {
    const err = props.error as unknown;
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : undefined;
    const detail = err instanceof Error && err.stack ? err.stack : undefined;
    return (
      <ErrorPage
        code="500"
        title={m.error_500_title()}
        message={message ?? m.error_500_message_fallback()}
        detail={import.meta.env.DEV ? detail : undefined}
        action={
          <button
            type="button"
            onClick={() => window.location.reload()}
            class="rounded border border-background-offset px-4 py-2 text-sm hover:bg-background-offset"
          >
            {m.error_reload()}
          </button>
        }
      />
    );
  },
});

function RootDocument() {
  const ctx = Route.useRouteContext();
  const themeClass = () => {
    const t = ctx().session?.theme;
    return t === "dark" || t === "light" ? t : "";
  };
  if (!isServer) {
    createEffect(() => {
      document.documentElement.className = themeClass();
    });
  }
  return (
    <html lang={getLocale()} class={themeClass()}>
      <head>
        <HydrationScript />
        <HeadContent />
      </head>
      <body>
        <SessionProvider session={() => ctx().session}>
          <ModalProvider>
            <Outlet />
          </ModalProvider>
        </SessionProvider>
        <Scripts />
      </body>
    </html>
  );
}
